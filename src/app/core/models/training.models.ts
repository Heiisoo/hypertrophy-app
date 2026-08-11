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
  readonly imageUrl?: string;
  readonly secondaryImageUrl?: string;
  readonly videoUrl?: string;
}

export interface ExerciseCatalogItem {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly equipment?: string;
  readonly primaryMuscles: readonly string[];
  readonly aliases: readonly string[];
  readonly instructions?: string;
  readonly imageUrl?: string;
  readonly secondaryImageUrl?: string;
  readonly videoUrl?: string;
  readonly sourceUrl?: string;
  readonly license?: string;
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
  readonly rotationStartedAt?: string;
  readonly days: readonly ProgramDay[];
}

export interface LocalUserProgram {
  readonly ownerId: string;
  readonly program: TrainingProgram;
  readonly updatedAt: string;
}

export interface WorkoutSession {
  readonly id: string;
  readonly ownerId: string;
  readonly programDayId: string;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly status: SessionStatus;
  readonly pausedAt?: string;
  readonly accumulatedPausedSeconds?: number;
  readonly durationSeconds?: number;
}

export interface WorkoutSet {
  readonly id: string;
  readonly ownerId: string;
  readonly sessionId: string;
  readonly exerciseId: string;
  readonly setNumber: number;
  readonly weightKg: number;
  readonly reps: number;
  readonly rir: number;
  readonly completedAt?: string;
}

export interface ExerciseNote {
  readonly id: string;
  readonly ownerId: string;
  readonly exerciseKey: string;
  readonly exerciseName: string;
  readonly content: string;
  readonly updatedAt: string;
}

export interface SyncQueueItem {
  id?: number;
  readonly ownerId: string;
  readonly entityType: 'session' | 'set' | 'note';
  readonly entityId: string;
  readonly operation: 'upsert' | 'delete';
  readonly status: SyncStatus;
  readonly createdAt: string;
}
