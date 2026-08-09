import { computed, effect, Injectable, signal } from '@angular/core';
import { hypertrophyDb } from '../database/hypertrophy.database';
import { SyncQueueItem, WorkoutSession, WorkoutSet } from '../models/training.models';
import { supabase } from '../supabase/supabase.client';
import { AuthStore } from './auth-store';
import { HistoryService } from './history.service';
import { pendingEntityKeys } from './session-lifecycle';

@Injectable({ providedIn: 'root' })
export class SyncService {
  readonly online = signal(navigator.onLine);
  readonly syncing = signal(false);
  readonly pendingCount = signal(0);
  readonly lastSyncedAt = signal<string | null>(null);
  readonly error = signal('');
  readonly statusLabel = computed(() => {
    if (!this.online()) return 'Hors ligne';
    if (!this.auth.isAuthenticated()) return 'Local uniquement';
    if (this.syncing()) return 'Synchronisation…';
    if (this.error()) return 'Sync à relancer';
    if (this.pendingCount() > 0) return `${this.pendingCount()} en attente`;
    return 'Cloud à jour';
  });

  private syncPromise?: Promise<void>;

  constructor(
    private readonly auth: AuthStore,
    private readonly history: HistoryService,
  ) {
    window.addEventListener('online', () => {
      this.online.set(true);
      void this.syncNow();
    });
    window.addEventListener('offline', () => this.online.set(false));

    effect(() => {
      const userId = this.auth.user()?.id;
      const isOnline = this.online();
      void this.refreshPendingCount();
      if (userId && isOnline) void this.syncNow();
    });
    void this.refreshPendingCount();
  }

  async notifyQueueChanged(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await this.refreshPendingCount();
      if (this.pendingCount() === 0) return;
      await this.syncNow();
      if (!this.online() || !this.auth.user() || this.error()) return;
    }
    await this.refreshPendingCount();
  }

  async syncNow(): Promise<void> {
    if (this.syncPromise) return this.syncPromise;
    if (!this.online() || !this.auth.user()) {
      await this.refreshPendingCount();
      return;
    }

    this.syncPromise = this.performSync().finally(() => {
      this.syncPromise = undefined;
    });
    return this.syncPromise;
  }

  private async performSync(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    this.syncing.set(true);
    this.error.set('');
    try {
      const items = await hypertrophyDb.syncQueue
        .where('[ownerId+status]')
        .anyOf([user.id, 'pending'], [user.id, 'failed'])
        .sortBy('createdAt');

      for (const item of items) {
        try {
          await this.pushItem(item, user.id);
          if (item.id !== undefined) {
            await hypertrophyDb.syncQueue.put({ ...item, status: 'synced' });
          }
        } catch {
          if (item.id !== undefined) {
            await hypertrophyDb.syncQueue.put({ ...item, status: 'failed' });
          }
          throw new Error('sync_failed');
        }
      }
      await this.pullRemote(user.id);
      await this.history.refresh();
      this.lastSyncedAt.set(new Date().toISOString());
    } catch {
      this.error.set('La sauvegarde cloud reprendra automatiquement dès que possible.');
    } finally {
      this.syncing.set(false);
      await this.refreshPendingCount();
    }
  }

  private async pushItem(item: SyncQueueItem, userId: string): Promise<void> {
    if (item.entityType === 'session') {
      const session = await hypertrophyDb.workoutSessions.get(item.entityId);
      if (session?.ownerId === userId) await this.upsertSession(session, userId);
      return;
    }

    const set = await hypertrophyDb.workoutSets.get(item.entityId);
    if (!set || set.ownerId !== userId) return;
    const session = await hypertrophyDb.workoutSessions.get(set.sessionId);
    if (!session || session.ownerId !== userId) throw new Error('missing_session');

    await this.upsertSession(session, userId);
    const { error } = await supabase.from('workout_sets').upsert({
      id: set.id,
      user_id: userId,
      session_id: set.sessionId,
      exercise_id: set.exerciseId,
      set_number: set.setNumber,
      weight_kg: set.weightKg,
      reps: set.reps,
      rir: set.rir,
      completed_at: set.completedAt ?? null,
    });
    if (error) throw error;
  }

  private async upsertSession(session: WorkoutSession, userId: string): Promise<void> {
    const { error } = await supabase.from('workout_sessions').upsert({
      id: session.id,
      user_id: userId,
      program_day_id: session.programDayId,
      started_at: session.startedAt,
      finished_at: session.finishedAt ?? null,
      status: session.status,
      duration_seconds: session.durationSeconds ?? null,
    });
    if (error) throw error;
  }

  private async pullRemote(userId: string): Promise<void> {
    const [sessionsResult, setsResult, pendingItems] = await Promise.all([
      supabase.from('workout_sessions').select('*').eq('user_id', userId),
      supabase.from('workout_sets').select('*').eq('user_id', userId),
      hypertrophyDb.syncQueue
        .where('[ownerId+status]')
        .anyOf([userId, 'pending'], [userId, 'failed'])
        .toArray(),
    ]);
    if (sessionsResult.error) throw sessionsResult.error;
    if (setsResult.error) throw setsResult.error;

    const localSessions = new Map(
      (
        await hypertrophyDb.workoutSessions.bulkGet(
          sessionsResult.data.map((session) => session.id),
        )
      )
        .filter((session): session is WorkoutSession => Boolean(session))
        .map((session) => [session.id, session]),
    );
    const localSets = new Map(
      (await hypertrophyDb.workoutSets.bulkGet(setsResult.data.map((set) => set.id)))
        .filter((set): set is WorkoutSet => Boolean(set))
        .map((set) => [set.id, set]),
    );
    const protectedEntities = pendingEntityKeys(pendingItems);

    await hypertrophyDb.transaction(
      'rw',
      hypertrophyDb.workoutSessions,
      hypertrophyDb.workoutSets,
      async () => {
        await hypertrophyDb.workoutSessions.bulkPut(
          sessionsResult.data.map((session) => {
            const local = localSessions.get(session.id);
            if (local && protectedEntities.has(`session:${session.id}`)) return local;
            return {
              id: session.id,
              ownerId: userId,
              programDayId: session.program_day_id,
              startedAt: session.started_at,
              finishedAt: session.finished_at ?? undefined,
              durationSeconds: session.duration_seconds ?? local?.durationSeconds,
              pausedAt: local?.pausedAt,
              accumulatedPausedSeconds: local?.accumulatedPausedSeconds,
              status:
                session.status === 'completed' || session.status === 'abandoned'
                  ? session.status
                  : 'active',
            };
          }),
        );
        await hypertrophyDb.workoutSets.bulkPut(
          setsResult.data.map((set) => {
            const local = localSets.get(set.id);
            if (local && protectedEntities.has(`set:${set.id}`)) return local;
            return {
              id: set.id,
              ownerId: userId,
              sessionId: set.session_id,
              exerciseId: set.exercise_id,
              setNumber: set.set_number,
              weightKg: set.weight_kg,
              reps: set.reps,
              rir: set.rir,
              completedAt: set.completed_at ?? undefined,
            };
          }),
        );
      },
    );
  }

  private async refreshPendingCount(): Promise<void> {
    const ownerId = this.auth.user()?.id ?? 'local';
    const count = await hypertrophyDb.syncQueue
      .where('[ownerId+status]')
      .anyOf([ownerId, 'pending'], [ownerId, 'failed'])
      .count();
    this.pendingCount.set(count);
  }
}
