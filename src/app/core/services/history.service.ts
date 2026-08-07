import { Injectable, signal } from '@angular/core';
import { hypertrophyDb } from '../database/hypertrophy.database';
import { WorkoutSet } from '../models/training.models';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  readonly completedSessionCount = signal(0);
  readonly bestSet = signal<WorkoutSet | null>(null);

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const [sessionCount, sets] = await Promise.all([
      hypertrophyDb.workoutSessions.where('status').equals('completed').count(),
      hypertrophyDb.workoutSets.filter((set) => Boolean(set.completedAt)).toArray(),
    ]);
    this.completedSessionCount.set(sessionCount);
    this.bestSet.set(
      sets.reduce<WorkoutSet | null>((best, current) => {
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
    const sets = await hypertrophyDb.workoutSets
      .where('exerciseId')
      .equals(exerciseId)
      .filter((set) => Boolean(set.completedAt) && set.sessionId !== excludedSessionId)
      .toArray();
    sets.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    const latestSessionId = sets[0]?.sessionId;
    return latestSessionId
      ? sets
          .filter((set) => set.sessionId === latestSessionId)
          .sort((a, b) => a.setNumber - b.setNumber)
      : [];
  }
}
