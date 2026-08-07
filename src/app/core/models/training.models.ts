export type TrainingDayKind = 'training' | 'recovery';
export type SessionStatus = 'active' | 'completed' | 'abandoned';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface ExercisePrescription {
  readonly id: string;
  readonly name: string;
  readonly sets: number;
  readonly repRange: string;
  readonly targetRir: string;
  readonly restSeconds: number;
  readonly category: string;
  readonly cue?: string;
}

export interface ProgramDay {
  readonly id: string;
  readonly dayNumber: number;
  readonly title: string;
  readonly shortTitle: string;
  readonly focus: string;
  readonly kind: TrainingDayKind;
  readonly durationMinutes: number;
  readonly exercises: readonly ExercisePrescription[];
  readonly recoveryItems?: readonly string[];
}

export interface TrainingProgram {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly active: 0 | 1;
  readonly createdAt: string;
  readonly days: readonly ProgramDay[];
}

export interface WorkoutSession {
  readonly id: string;
  readonly programDayId: string;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly status: SessionStatus;
}

export interface WorkoutSet {
  readonly id: string;
  readonly sessionId: string;
  readonly exerciseId: string;
  readonly setNumber: number;
  readonly weightKg: number;
  readonly reps: number;
  readonly rir: number;
  readonly completedAt?: string;
}

export interface SyncQueueItem {
  id?: number;
  readonly entityType: 'session' | 'set';
  readonly entityId: string;
  readonly operation: 'upsert' | 'delete';
  readonly status: SyncStatus;
  readonly createdAt: string;
}
