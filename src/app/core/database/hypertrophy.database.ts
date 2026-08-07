import Dexie, { Table } from 'dexie';
import {
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

  constructor() {
    super('hypertrophy-app');

    this.version(1).stores({
      programs: 'id, active, createdAt',
      workoutSessions: 'id, programDayId, startedAt, status',
      workoutSets: 'id, sessionId, exerciseId, completedAt',
      syncQueue: '++id, entityType, entityId, status, createdAt',
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
