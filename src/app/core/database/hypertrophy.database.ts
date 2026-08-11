import Dexie, { Table } from 'dexie';
import {
  ExerciseNote,
  LocalUserProgram,
  SyncQueueItem,
  TrainingProgram,
  WorkoutSession,
  WorkoutSet,
} from '../models/training.models';
import { SEED_PROGRAM } from '../../data/seed-program';

export class HypertrophyDatabase extends Dexie {
  programs!: Table<TrainingProgram, string>;
  workoutSessions!: Table<WorkoutSession, string>;
  workoutSets!: Table<WorkoutSet, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  userPrograms!: Table<LocalUserProgram, string>;
  exerciseNotes!: Table<ExerciseNote, string>;

  constructor() {
    super('hypertrophy-app');

    this.version(1).stores({
      programs: 'id, active, createdAt',
      workoutSessions: 'id, programDayId, startedAt, status',
      workoutSets: 'id, sessionId, exerciseId, completedAt',
      syncQueue: '++id, entityType, entityId, status, createdAt',
    });

    this.version(2).stores({
      programs: 'id, active, createdAt',
      workoutSessions: 'id, programDayId, startedAt, status',
      workoutSets: 'id, sessionId, exerciseId, completedAt',
      syncQueue: '++id, entityType, entityId, status, createdAt',
      userPrograms: 'ownerId, updatedAt',
    });

    this.version(3)
      .stores({
        programs: 'id, active, createdAt',
        workoutSessions: 'id, ownerId, [ownerId+status], programDayId, startedAt, status',
        workoutSets: 'id, ownerId, [ownerId+exerciseId], sessionId, exerciseId, completedAt',
        syncQueue: '++id, ownerId, [ownerId+status], entityType, entityId, status, createdAt',
        userPrograms: 'ownerId, updatedAt',
      })
      .upgrade(async (transaction) => {
        await transaction.table<WorkoutSession, string>('workoutSessions').toCollection().modify({
          ownerId: 'local',
        });
        await transaction.table<WorkoutSet, string>('workoutSets').toCollection().modify({
          ownerId: 'local',
        });
        await transaction.table<SyncQueueItem, number>('syncQueue').toCollection().modify({
          ownerId: 'local',
        });
      });

    this.version(4).stores({
      programs: 'id, active, createdAt',
      workoutSessions: 'id, ownerId, [ownerId+status], programDayId, startedAt, status',
      workoutSets: 'id, ownerId, [ownerId+exerciseId], sessionId, exerciseId, completedAt',
      syncQueue: '++id, ownerId, [ownerId+status], entityType, entityId, status, createdAt',
      userPrograms: 'ownerId, updatedAt',
      exerciseNotes: 'id, ownerId, [ownerId+exerciseKey], updatedAt',
    });
  }

  async seedIfNeeded(): Promise<void> {
    const existingProgram = await this.programs.get(SEED_PROGRAM.id);
    if (!existingProgram) {
      await this.programs.put(SEED_PROGRAM);
    }
  }
}

export const hypertrophyDb = new HypertrophyDatabase();
