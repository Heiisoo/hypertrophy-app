import { Injectable } from '@angular/core';
import { hypertrophyDb } from '../database/hypertrophy.database';
import { ExerciseNote } from '../models/training.models';
import { AuthStore } from './auth-store';
import { SyncService } from './sync.service';

export function exerciseNoteKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable({ providedIn: 'root' })
export class ExerciseNoteService {
  constructor(
    private readonly auth: AuthStore,
    private readonly sync: SyncService,
  ) {}

  async load(exerciseName: string): Promise<ExerciseNote | undefined> {
    await this.auth.whenReady();
    return hypertrophyDb.exerciseNotes
      .where('[ownerId+exerciseKey]')
      .equals([this.ownerId(), exerciseNoteKey(exerciseName)])
      .first();
  }

  async save(exerciseName: string, content: string): Promise<ExerciseNote> {
    await this.auth.whenReady();
    const ownerId = this.ownerId();
    const exerciseKey = exerciseNoteKey(exerciseName);
    const now = new Date().toISOString();
    const note: ExerciseNote = {
      id: `${ownerId}:${exerciseKey}`,
      ownerId,
      exerciseKey,
      exerciseName,
      content: content.slice(0, 2000),
      updatedAt: now,
    };

    await hypertrophyDb.transaction(
      'rw',
      hypertrophyDb.exerciseNotes,
      hypertrophyDb.syncQueue,
      async () => {
        await hypertrophyDb.exerciseNotes.put(note);
        await hypertrophyDb.syncQueue.where('entityId').equals(note.id).delete();
        await hypertrophyDb.syncQueue.add({
          ownerId,
          entityType: 'note',
          entityId: note.id,
          operation: 'upsert',
          status: 'pending',
          createdAt: now,
        });
      },
    );
    await this.sync.notifyQueueChanged();
    return note;
  }

  private ownerId(): string {
    return this.auth.user()?.id ?? 'local';
  }
}
