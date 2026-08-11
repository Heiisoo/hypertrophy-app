import { describe, expect, it } from 'vitest';
import { WorkoutSession } from '../models/training.models';
import {
  adjustTimerDeadline,
  calculateWorkoutElapsedSeconds,
  remainingTimerSeconds,
} from './timer-clock';

const activeSession: WorkoutSession = {
  id: 'session-1',
  ownerId: 'user-1',
  programDayId: 'day-1',
  startedAt: '2026-08-11T10:00:00.000Z',
  status: 'active',
  accumulatedPausedSeconds: 0,
};

describe('timer clock', () => {
  it('catches up from the real clock after the app was backgrounded', () => {
    const afterBackground = new Date('2026-08-11T10:07:34.000Z').getTime();

    expect(calculateWorkoutElapsedSeconds(activeSession, afterBackground)).toBe(454);
  });

  it('keeps a paused workout frozen while time continues to pass', () => {
    const pausedSession: WorkoutSession = {
      ...activeSession,
      pausedAt: '2026-08-11T10:02:00.000Z',
      accumulatedPausedSeconds: 15,
    };

    expect(
      calculateWorkoutElapsedSeconds(
        pausedSession,
        new Date('2026-08-11T11:00:00.000Z').getTime(),
      ),
    ).toBe(105);
  });

  it('catches up a rest timer from its deadline after the app was backgrounded', () => {
    const endsAt = new Date('2026-08-11T10:03:00.000Z').getTime();

    expect(
      remainingTimerSeconds(endsAt, new Date('2026-08-11T10:01:47.250Z').getTime()),
    ).toBe(73);
    expect(remainingTimerSeconds(endsAt, new Date('2026-08-11T10:04:00.000Z').getTime())).toBe(
      0,
    );
  });

  it('adjusts a running rest deadline and never goes below one second', () => {
    const now = new Date('2026-08-11T10:00:00.000Z').getTime();
    const endsAt = now + 30_000;

    expect(adjustTimerDeadline(endsAt, 15, now)).toBe(now + 45_000);
    expect(adjustTimerDeadline(endsAt, -60, now)).toBe(now + 1000);
  });
});
