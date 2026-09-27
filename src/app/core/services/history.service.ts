import { Injectable, computed, effect, signal } from '@angular/core';
import { hypertrophyDb } from '../database/hypertrophy.database';
import { GymId, WorkoutSession, WorkoutSet } from '../models/training.models';
import { AuthStore } from './auth-store';
import { setsFromCompletedSessions, setsFromCompletedSessionsAtGym } from './session-lifecycle';
import { GymPreferenceService } from './gym-preference.service';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  readonly completedSessionCount = signal(0);
  readonly completedSessions = signal<readonly WorkoutSession[]>([]);
  private readonly bestSetsByGym = signal<Partial<Record<GymId, WorkoutSet>>>({});
  readonly bestSet = computed(() => {
    const gymId = this.gymPreference.selectedGymId();
    return gymId ? (this.bestSetsByGym()[gymId] ?? null) : null;
  });

  constructor(
    private readonly auth: AuthStore,
    private readonly gymPreference: GymPreferenceService,
  ) {
    effect(() => {
      this.auth.user();
      void this.refresh();
    });
  }

  async refresh(): Promise<void> {
    await this.auth.whenReady();
    const ownerId = this.auth.user()?.id ?? 'local';
    const [sessions, sets] = await Promise.all([
      hypertrophyDb.workoutSessions
        .where('[ownerId+status]')
        .equals([ownerId, 'completed'])
        .toArray(),
      hypertrophyDb.workoutSets
        .where('ownerId')
        .equals(ownerId)
        .filter((set) => Boolean(set.completedAt))
        .toArray(),
    ]);
    sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    this.completedSessions.set(sessions);
    this.completedSessionCount.set(sessions.length);
    const completedSets = setsFromCompletedSessions(sessions, sets);
    const gymBySession = new Map(
      sessions.map((session) => [session.id, session.gymId ?? 'unspecified'] as const),
    );
    const bestSets: Partial<Record<GymId, WorkoutSet>> = {};
    for (const set of completedSets.filter(
      (candidate) => candidate.weightKg > 0 && candidate.reps > 0,
    )) {
      const gymId = gymBySession.get(set.sessionId) ?? 'unspecified';
      const best = bestSets[gymId];
      const currentScore = set.weightKg * (1 + set.reps / 30);
      const bestScore = best ? best.weightKg * (1 + best.reps / 30) : -1;
      if (!best || currentScore > bestScore) bestSets[gymId] = set;
    }
    this.bestSetsByGym.set(bestSets);
  }

  async previousSets(
    exerciseId: string,
    gymId: GymId,
    excludedSessionId?: string,
  ): Promise<readonly WorkoutSet[]> {
    await this.auth.whenReady();
    const ownerId = this.auth.user()?.id ?? 'local';
    const [sessions, candidateSets] = await Promise.all([
      hypertrophyDb.workoutSessions
        .where('[ownerId+status]')
        .equals([ownerId, 'completed'])
        .toArray(),
      hypertrophyDb.workoutSets
        .where('[ownerId+exerciseId]')
        .equals([ownerId, exerciseId])
        .filter((set) => set.sessionId !== excludedSessionId)
        .toArray(),
    ]);
    const sets = [...setsFromCompletedSessionsAtGym(sessions, candidateSets, gymId)];
    sets.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    const latestSessionId = sets[0]?.sessionId;
    return latestSessionId
      ? sets
          .filter((set) => set.sessionId === latestSessionId)
          .sort((a, b) => a.setNumber - b.setNumber)
      : [];
  }
}
