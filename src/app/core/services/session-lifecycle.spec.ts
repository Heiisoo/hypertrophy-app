import { describe, expect, it } from 'vitest';
import { WorkoutSession, WorkoutSet } from '../models/training.models';
import {
  abandonSession,
  completeSession,
  pendingEntityKeys,
  resolveActiveSessions,
  setsFromCompletedSessions,
} from './session-lifecycle';

const session = (
  id: string,
  status: WorkoutSession['status'],
  startedAt: string,
): WorkoutSession => ({
  id,
  ownerId: 'user-1',
  programDayId: 'day-1',
  startedAt,
  status,
  accumulatedPausedSeconds: 0,
});

const workoutSet = (id: string, sessionId: string, completed: boolean): WorkoutSet => ({
  id,
  ownerId: 'user-1',
  sessionId,
  exerciseId: 'exercise-1',
  setNumber: 1,
  weightKg: 32,
  reps: 8,
  rir: 1,
  completedAt: completed ? '2026-08-09T10:30:00.000Z' : undefined,
});

describe('session lifecycle', () => {
  it('keeps only the newest active session and identifies stale duplicates', () => {
    const result = resolveActiveSessions([
      session('old', 'active', '2026-08-08T10:00:00.000Z'),
      session('completed', 'completed', '2026-08-08T12:00:00.000Z'),
      session('new', 'active', '2026-08-09T10:00:00.000Z'),
    ]);

    expect(result.current?.id).toBe('new');
    expect(result.stale.map((candidate) => candidate.id)).toEqual(['old']);
  });

  it('returns no current session when none is active', () => {
    expect(
      resolveActiveSessions([session('done', 'completed', '2026-08-09T10:00:00.000Z')]),
    ).toEqual({
      current: null,
      stale: [],
    });
  });

  it('completes a session with a non-negative duration', () => {
    const completed = completeSession(
      session('current', 'active', '2026-08-09T10:00:00.000Z'),
      '2026-08-09T11:00:00.000Z',
      -4,
    );

    expect(completed.status).toBe('completed');
    expect(completed.durationSeconds).toBe(0);
    expect(completed.finishedAt).toBe('2026-08-09T11:00:00.000Z');
  });

  it('abandons a session without turning it into a completed workout', () => {
    const abandoned = abandonSession(
      {
        ...session('current', 'active', '2026-08-09T10:00:00.000Z'),
        pausedAt: '2026-08-09T10:15:00.000Z',
      },
      '2026-08-09T10:20:00.000Z',
      900,
    );

    expect(abandoned.status).toBe('abandoned');
    expect(abandoned.pausedAt).toBeUndefined();
    expect(abandoned.durationSeconds).toBe(900);
  });

  it('excludes abandoned and unfinished sets from statistics', () => {
    const sessions = [
      session('kept', 'completed', '2026-08-09T10:00:00.000Z'),
      session('ignored', 'abandoned', '2026-08-09T11:00:00.000Z'),
    ];
    const sets = [
      workoutSet('kept-set', 'kept', true),
      workoutSet('abandoned-set', 'ignored', true),
      workoutSet('unfinished-set', 'kept', false),
    ];

    expect(setsFromCompletedSessions(sessions, sets).map((set) => set.id)).toEqual(['kept-set']);
  });

  it('protects pending and failed local entities from stale cloud responses', () => {
    const keys = pendingEntityKeys([
      {
        ownerId: 'user-1',
        entityType: 'session',
        entityId: 'session-1',
        operation: 'upsert',
        status: 'pending',
        createdAt: '2026-08-09T10:00:00.000Z',
      },
      {
        ownerId: 'user-1',
        entityType: 'set',
        entityId: 'set-1',
        operation: 'upsert',
        status: 'failed',
        createdAt: '2026-08-09T10:00:00.000Z',
      },
    ]);

    expect(keys.has('session:session-1')).toBe(true);
    expect(keys.has('set:set-1')).toBe(true);
  });

  it('does not protect changes that are already synchronized', () => {
    const keys = pendingEntityKeys([
      {
        ownerId: 'user-1',
        entityType: 'session',
        entityId: 'session-1',
        operation: 'upsert',
        status: 'synced',
        createdAt: '2026-08-09T10:00:00.000Z',
      },
    ]);

    expect(keys.size).toBe(0);
  });
});
