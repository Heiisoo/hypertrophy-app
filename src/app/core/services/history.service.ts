import { Injectable, effect, signal } from '@angular/core';
import { hypertrophyDb } from '../database/hypertrophy.database';
import { WorkoutSession, WorkoutSet } from '../models/training.models';
import { AuthStore } from './auth-store';
import { setsFromCompletedSessions } from './session-lifecycle';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  readonly completedSessionCount = signal(0);
  readonly completedSessions = signal<readonly WorkoutSession[]>([]);
  readonly bestSet = signal<WorkoutSet | null>(null);

  constructor(private readonly auth: AuthStore) {
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
    this.bestSet.set(
      completedSets.reduce<WorkoutSet | null>((best, current) => {
        if (!best) return current;
        const currentScore = current.weightKg * (1 + current.reps / 30);
        const bestScore = best.weightKg * (1 + best.reps / 30);
        return currentScore > bestScore ? current : best;
      }, null),
    );
  }

  async previousSets(
    exerciseId: string,
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
    const sets = [...setsFromCompletedSessions(sessions, candidateSets)];
    sets.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    const latestSessionId = sets[0]?.sessionId;
    return latestSessionId
      ? sets
          .filter((set) => set.sessionId === latestSessionId)
          .sort((a, b) => a.setNumber - b.setNumber)
      : [];
  }
}
