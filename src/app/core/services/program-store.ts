import { Injectable, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { SEED_PROGRAM } from '../../data/seed-program';
import { hypertrophyDb } from '../database/hypertrophy.database';
import { Json } from '../database/database.types';
import {
  ExercisePrescription,
  ProgramDay,
  TrainingProgram,
} from '../models/training.models';
import { supabase } from '../supabase/supabase.client';
import { AuthStore } from './auth-store';

type ProgramDetailsPatch = Partial<Pick<TrainingProgram, 'name' | 'description'>>;
type ProgramDayPatch = Partial<
  Pick<ProgramDay, 'title' | 'shortTitle' | 'focus' | 'durationMinutes'>
>;
type ExercisePatch = Partial<Omit<ExercisePrescription, 'id'>>;

@Injectable({ providedIn: 'root' })
export class ProgramStore implements OnDestroy {
  private readonly auth = inject(AuthStore);
  private readonly programState = signal<TrainingProgram>(structuredClone(SEED_PROGRAM));
  private readonly ownerState = signal('local');
  private loadGeneration = 0;

  readonly program = this.programState.asReadonly();
  readonly ready = signal(false);
  readonly saving = signal(false);
  readonly saveLabel = signal('Programme local');
  readonly isPersonal = computed(() => this.ownerState() !== 'local');

  readonly today = computed<ProgramDay>(() => {
    const dayNumber = new Date().getDay() === 0 ? 7 : new Date().getDay();
    return (
      this.programState().days.find((day) => day.dayNumber === dayNumber) ??
      this.programState().days[0]
    );
  });

  private readonly handleOnline = () => void this.syncCurrentProgram();

  constructor() {
    effect(() => {
      const ownerId = this.auth.user()?.id ?? 'local';
      if (ownerId === this.ownerState() && this.ready()) return;
      this.ownerState.set(ownerId);
      void this.hydrate(ownerId);
    });
    window.addEventListener('online', this.handleOnline);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.handleOnline);
  }

  async updateProgram(patch: ProgramDetailsPatch): Promise<void> {
    await this.persist({ ...this.programState(), ...patch });
  }

  async updateDay(dayId: string, patch: ProgramDayPatch): Promise<void> {
    await this.persist({
      ...this.programState(),
      days: this.programState().days.map((day) =>
        day.id === dayId ? { ...day, ...patch } : day,
      ),
    });
  }

  async updateExercise(
    dayId: string,
    exerciseId: string,
    patch: ExercisePatch,
  ): Promise<void> {
    await this.persist({
      ...this.programState(),
      days: this.programState().days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === exerciseId ? { ...exercise, ...patch } : exercise,
              ),
            }
          : day,
      ),
    });
  }

  async addExercise(dayId: string): Promise<string> {
    const id = `custom-${crypto.randomUUID()}`;
    const exercise: ExercisePrescription = {
      id,
      name: 'Nouvel exercice',
      category: 'À classer',
      sets: 3,
      repRange: '8–12',
      targetRir: '1',
      restSeconds: 120,
    };
    await this.persist({
      ...this.programState(),
      days: this.programState().days.map((day) =>
        day.id === dayId ? { ...day, exercises: [...day.exercises, exercise] } : day,
      ),
    });
    return id;
  }

  async removeExercise(dayId: string, exerciseId: string): Promise<void> {
    await this.persist({
      ...this.programState(),
      days: this.programState().days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.filter((exercise) => exercise.id !== exerciseId),
            }
          : day,
      ),
    });
  }

  async moveExercise(dayId: string, exerciseId: string, direction: -1 | 1): Promise<void> {
    const day = this.programState().days.find((candidate) => candidate.id === dayId);
    if (!day) return;
    const currentIndex = day.exercises.findIndex((exercise) => exercise.id === exerciseId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= day.exercises.length) return;

    const exercises = [...day.exercises];
    const currentExercise = exercises[currentIndex];
    const targetExercise = exercises[targetIndex];
    if (!currentExercise || !targetExercise) return;
    exercises[currentIndex] = targetExercise;
    exercises[targetIndex] = currentExercise;
    await this.persist({
      ...this.programState(),
      days: this.programState().days.map((candidate) =>
        candidate.id === dayId ? { ...candidate, exercises } : candidate,
      ),
    });
  }

  async restoreDefault(): Promise<void> {
    await this.persist(structuredClone(SEED_PROGRAM));
  }

  private async hydrate(ownerId: string): Promise<void> {
    const generation = ++this.loadGeneration;
    this.ready.set(false);
    try {
      await hypertrophyDb.seedIfNeeded();
      const localRecord = await hypertrophyDb.userPrograms.get(ownerId);
      let chosenProgram = localRecord?.program ?? structuredClone(SEED_PROGRAM);
      let chosenUpdatedAt = localRecord?.updatedAt ?? SEED_PROGRAM.createdAt;

      if (ownerId !== 'local' && navigator.onLine) {
        const { data, error } = await supabase
          .from('user_programs')
          .select('program, updated_at')
          .eq('user_id', ownerId)
          .maybeSingle();

        if (!error && data && this.isTrainingProgram(data.program)) {
          if (!localRecord || data.updated_at >= chosenUpdatedAt) {
            chosenProgram = data.program;
            chosenUpdatedAt = data.updated_at;
          } else {
            await this.upsertCloud(ownerId, chosenProgram);
          }
        } else if (!error) {
          await this.upsertCloud(ownerId, chosenProgram);
        }
      }

      if (generation !== this.loadGeneration) return;
      await hypertrophyDb.userPrograms.put({
        ownerId,
        program: chosenProgram,
        updatedAt: chosenUpdatedAt,
      });
      this.programState.set(chosenProgram);
      this.saveLabel.set(ownerId === 'local' ? 'Programme local' : 'Synchronisé avec ton compte');
    } finally {
      if (generation === this.loadGeneration) this.ready.set(true);
    }
  }

  private async persist(program: TrainingProgram): Promise<void> {
    const ownerId = this.ownerState();
    const updatedAt = new Date().toISOString();
    this.programState.set(program);
    this.saving.set(true);
    await hypertrophyDb.userPrograms.put({ ownerId, program, updatedAt });

    if (ownerId !== 'local' && navigator.onLine && this.auth.user()?.id === ownerId) {
      const saved = await this.upsertCloud(ownerId, program);
      this.saveLabel.set(saved ? 'Synchronisé avec ton compte' : 'Sauvegardé sur cet appareil');
    } else {
      this.saveLabel.set(ownerId === 'local' ? 'Programme local' : 'À synchroniser');
    }
    this.saving.set(false);
  }

  private async syncCurrentProgram(): Promise<void> {
    const ownerId = this.ownerState();
    if (ownerId === 'local' || this.auth.user()?.id !== ownerId) return;
    const record = await hypertrophyDb.userPrograms.get(ownerId);
    if (!record) return;
    const saved = await this.upsertCloud(ownerId, record.program);
    if (saved) this.saveLabel.set('Synchronisé avec ton compte');
  }

  private async upsertCloud(ownerId: string, program: TrainingProgram): Promise<boolean> {
    const { error } = await supabase.from('user_programs').upsert({
      user_id: ownerId,
      program: program as unknown as Json,
    });
    return !error;
  }

  private isTrainingProgram(value: unknown): value is TrainingProgram {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate['id'] === 'string' &&
      typeof candidate['name'] === 'string' &&
      Array.isArray(candidate['days'])
    );
  }
}
