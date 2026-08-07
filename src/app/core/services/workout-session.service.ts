import { Injectable, OnDestroy, computed, effect, signal } from '@angular/core';
import { hypertrophyDb } from '../database/hypertrophy.database';
import { WorkoutSession } from '../models/training.models';
import { HistoryService } from './history.service';
import { SyncService } from './sync.service';
import { AuthStore } from './auth-store';

@Injectable({ providedIn: 'root' })
export class WorkoutSessionService implements OnDestroy {
  readonly activeSession = signal<WorkoutSession | null>(null);
  readonly ready = signal(false);
  readonly isPaused = computed(() => Boolean(this.activeSession()?.pausedAt));
  readonly elapsedSeconds = computed(() => {
    this.clock();
    const session = this.activeSession();
    return session ? this.calculateElapsedSeconds(session) : 0;
  });
  readonly elapsedLabel = computed(() => this.formatDuration(this.elapsedSeconds()));

  private readonly clock = signal(Date.now());
  private hydration: Promise<void> = Promise.resolve();
  private readonly timerId: ReturnType<typeof setInterval>;
  private hydratedOwnerId = '';

  constructor(
    private readonly sync: SyncService,
    private readonly history: HistoryService,
    private readonly auth: AuthStore,
  ) {
    effect(() => {
      const ownerId = this.auth.user()?.id ?? 'local';
      if (ownerId === this.hydratedOwnerId) return;
      this.hydratedOwnerId = ownerId;
      this.hydration = this.hydrateActiveSession(ownerId);
    });
    this.timerId = setInterval(() => this.clock.set(Date.now()), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerId);
  }

  async whenReady(): Promise<void> {
    await this.hydration;
  }

  async start(programDayId: string): Promise<WorkoutSession> {
    await this.hydration;
    const current = this.activeSession();
    if (current) return current;

    const now = new Date().toISOString();
    const session: WorkoutSession = {
      id: `session-${crypto.randomUUID()}`,
      ownerId: this.auth.user()?.id ?? 'local',
      programDayId,
      startedAt: now,
      status: 'active',
      accumulatedPausedSeconds: 0,
    };
    await this.persistSession(session);
    this.activeSession.set(session);
    this.clock.set(Date.now());
    await this.sync.notifyQueueChanged();
    return session;
  }

  async togglePause(): Promise<void> {
    const session = this.activeSession();
    if (!session) return;

    const now = new Date();
    const updated: WorkoutSession = session.pausedAt
      ? {
          ...session,
          pausedAt: undefined,
          accumulatedPausedSeconds:
            (session.accumulatedPausedSeconds ?? 0) +
            Math.max(0, Math.floor((now.getTime() - new Date(session.pausedAt).getTime()) / 1000)),
        }
      : { ...session, pausedAt: now.toISOString() };

    await this.persistSession(updated);
    this.activeSession.set(updated);
    this.clock.set(Date.now());
    await this.sync.notifyQueueChanged();
  }

  async finish(): Promise<WorkoutSession | null> {
    const session = this.activeSession();
    if (!session) return null;

    const finishedAt = new Date().toISOString();
    const durationSeconds = this.calculateElapsedSeconds(session, new Date(finishedAt).getTime());
    const completed: WorkoutSession = {
      ...session,
      finishedAt,
      pausedAt: undefined,
      durationSeconds,
      status: 'completed',
    };

    await this.persistSession(completed);
    this.activeSession.set(null);
    await this.sync.notifyQueueChanged();
    await this.history.refresh();
    return completed;
  }

  formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private async hydrateActiveSession(ownerId: string): Promise<void> {
    await this.auth.whenReady();
    const currentOwnerId = this.auth.user()?.id ?? 'local';
    if (currentOwnerId !== ownerId) return this.hydrateActiveSession(currentOwnerId);
    const sessions = await hypertrophyDb.workoutSessions
      .where('[ownerId+status]')
      .equals([ownerId, 'active'])
      .toArray();
    sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    this.activeSession.set(sessions[0] ?? null);
    this.ready.set(true);
    this.clock.set(Date.now());
  }

  private calculateElapsedSeconds(session: WorkoutSession, now = Date.now()): number {
    if (session.durationSeconds !== undefined) return session.durationSeconds;
    const effectiveEnd = session.pausedAt ? new Date(session.pausedAt).getTime() : now;
    const grossSeconds = Math.max(
      0,
      Math.floor((effectiveEnd - new Date(session.startedAt).getTime()) / 1000),
    );
    return Math.max(0, grossSeconds - (session.accumulatedPausedSeconds ?? 0));
  }

  private async persistSession(session: WorkoutSession): Promise<void> {
    const now = new Date().toISOString();
    await hypertrophyDb.transaction(
      'rw',
      hypertrophyDb.workoutSessions,
      hypertrophyDb.syncQueue,
      async () => {
        await hypertrophyDb.workoutSessions.put(session);
        await hypertrophyDb.syncQueue.where('entityId').equals(session.id).delete();
        await hypertrophyDb.syncQueue.add({
          ownerId: session.ownerId,
          entityType: 'session',
          entityId: session.id,
          operation: 'upsert',
          status: 'pending',
          createdAt: now,
        });
      },
    );
  }
}
