import { WorkoutSession } from '../models/training.models';

export function calculateWorkoutElapsedSeconds(
  session: WorkoutSession,
  now = Date.now(),
): number {
  if (session.durationSeconds !== undefined) return session.durationSeconds;
  const effectiveEnd = session.pausedAt ? new Date(session.pausedAt).getTime() : now;
  const grossSeconds = Math.max(
    0,
    Math.floor((effectiveEnd - new Date(session.startedAt).getTime()) / 1000),
  );
  return Math.max(0, grossSeconds - (session.accumulatedPausedSeconds ?? 0));
}

export function remainingTimerSeconds(endsAt: number | undefined, now = Date.now()): number {
  if (endsAt === undefined) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function adjustTimerDeadline(
  endsAt: number,
  amountSeconds: number,
  now = Date.now(),
): number {
  return Math.max(now + 1000, endsAt + amountSeconds * 1000);
}
