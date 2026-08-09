import { SyncQueueItem, WorkoutSession, WorkoutSet } from '../models/training.models';

export interface ActiveSessionResolution {
  readonly current: WorkoutSession | null;
  readonly stale: readonly WorkoutSession[];
}

export function resolveActiveSessions(
  sessions: readonly WorkoutSession[],
): ActiveSessionResolution {
  const active = sessions
    .filter((session) => session.status === 'active')
    .slice()
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  return { current: active[0] ?? null, stale: active.slice(1) };
}

export function completeSession(
  session: WorkoutSession,
  finishedAt: string,
  durationSeconds: number,
): WorkoutSession {
  return {
    ...session,
    finishedAt,
    pausedAt: undefined,
    durationSeconds: Math.max(0, durationSeconds),
    status: 'completed',
  };
}

export function abandonSession(
  session: WorkoutSession,
  finishedAt: string,
  durationSeconds: number,
): WorkoutSession {
  return {
    ...session,
    finishedAt,
    pausedAt: undefined,
    durationSeconds: Math.max(0, durationSeconds),
    status: 'abandoned',
  };
}

export function setsFromCompletedSessions(
  sessions: readonly WorkoutSession[],
  sets: readonly WorkoutSet[],
): readonly WorkoutSet[] {
  const completedIds = new Set(
    sessions.filter((session) => session.status === 'completed').map((session) => session.id),
  );
  return sets.filter((set) => Boolean(set.completedAt) && completedIds.has(set.sessionId));
}

export function pendingEntityKeys(items: readonly SyncQueueItem[]): ReadonlySet<string> {
  return new Set(
    items
      .filter((item) => item.status === 'pending' || item.status === 'failed')
      .map((item) => `${item.entityType}:${item.entityId}`),
  );
}
