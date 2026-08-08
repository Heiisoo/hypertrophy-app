import { Injectable, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { SEED_PROGRAM } from '../../data/seed-program';
import { hypertrophyDb } from '../database/hypertrophy.database';
import { Json } from '../database/database.types';
import {
  ExerciseCatalogItem,
  ExercisePrescription,
  ProgramDay,
  TrainingProgram,
} from '../models/training.models';
import { supabase } from '../supabase/supabase.client';
import { AuthStore } from './auth-store';

type ProgramDetailsPatch = Partial<
  Pick<TrainingProgram, 'name' | 'description' | 'rotationStartedAt'>
>;
type ProgramDayPatch = Partial<
  Pick<ProgramDay, 'title' | 'shortTitle' | 'focus' | 'durationMinutes'>
>;
type ExercisePatch = Partial<Omit<ExercisePrescription, 'id'>>;

@Injectable({ providedIn: 'root' })
export class ProgramStore implements OnDestroy {
  private readonly auth = inject(AuthStore);
  private readonly programState = signal<TrainingProgram>(this.createRecommendedProgram());
  private readonly ownerState = signal('local');
  private loadGeneration = 0;

  readonly program = this.programState.asReadonly();
  readonly ready = signal(false);
  readonly saving = signal(false);
  readonly saveLabel = signal('Programme local');
  readonly isPersonal = computed(() => this.ownerState() !== 'local');

  readonly currentDayIndex = computed(() => {
    const program = this.programState();
    const dayCount = program.days.length;
    if (dayCount === 0) return 0;
    const elapsedDays = this.daysBetween(
      program.rotationStartedAt ?? this.dateKey(),
      this.dateKey(),
    );
    return ((elapsedDays % dayCount) + dayCount) % dayCount;
  });
  readonly today = computed<ProgramDay>(() => {
    const days = this.programState().days;
    return days[this.currentDayIndex()] ?? days[0] ?? this.createRecoveryDay(1);
  });
  readonly currentCycleStartedAt = computed(() => {
    const program = this.programState();
    const dayCount = Math.max(1, program.days.length);
    const rotationStart = program.rotationStartedAt ?? this.dateKey();
    const elapsedDays = this.daysBetween(rotationStart, this.dateKey());
    const completedCycles = Math.floor(elapsedDays / dayCount);
    return this.addDays(rotationStart, completedCycles * dayCount);
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
      days: this.programState().days.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
    });
  }

  async updateExercise(dayId: string, exerciseId: string, patch: ExercisePatch): Promise<void> {
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

  async addCatalogExercise(dayId: string, catalogExercise: ExerciseCatalogItem): Promise<void> {
    const exercise: ExercisePrescription = {
      id: catalogExercise.id,
      name: catalogExercise.name,
      category: catalogExercise.category,
      sets: 3,
      repRange: '8–12',
      targetRir: '1',
      restSeconds: 120,
      cue: catalogExercise.instructions,
      imageUrl: catalogExercise.imageUrl,
      secondaryImageUrl: catalogExercise.secondaryImageUrl,
      videoUrl: catalogExercise.videoUrl,
    };
    await this.persist({
      ...this.programState(),
      days: this.programState().days.map((day) =>
        day.id === dayId ? { ...day, exercises: [...day.exercises, exercise] } : day,
      ),
    });
  }

  async addDay(kind: 'training' | 'recovery'): Promise<void> {
    const dayNumber = this.programState().days.length + 1;
    const day =
      kind === 'training'
        ? {
            id: `custom-day-${crypto.randomUUID()}`,
            dayNumber,
            title: 'Nouvel entraînement',
            shortTitle: 'Séance',
            focus: 'À personnaliser',
            kind: 'training' as const,
            durationMinutes: 60,
            exercises: [],
          }
        : this.createRecoveryDay(dayNumber);
    await this.persist({
      ...this.programState(),
      days: [...this.programState().days, day],
    });
  }

  async removeDay(dayId: string): Promise<void> {
    if (this.programState().days.length <= 1) return;
    await this.persist({
      ...this.programState(),
      days: this.programState().days.filter((day) => day.id !== dayId),
    });
  }

  async moveDay(dayId: string, direction: -1 | 1): Promise<void> {
    const days = [...this.programState().days];
    const currentIndex = days.findIndex((day) => day.id === dayId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= days.length) return;
    const currentDay = days[currentIndex];
    const targetDay = days[targetIndex];
    if (!currentDay || !targetDay) return;
    days[currentIndex] = targetDay;
    days[targetIndex] = currentDay;
    await this.persist({ ...this.programState(), days });
  }

  async resetCycleToday(): Promise<void> {
    await this.updateProgram({ rotationStartedAt: this.dateKey() });
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
    await this.persist(this.createRecommendedProgram());
  }

  private async hydrate(ownerId: string): Promise<void> {
    const generation = ++this.loadGeneration;
    this.ready.set(false);
    try {
      await hypertrophyDb.seedIfNeeded();
      const localRecord = await hypertrophyDb.userPrograms.get(ownerId);
      let chosenProgram = localRecord?.program ?? this.createRecommendedProgram();
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

      const normalizedProgram = this.normalizeHydratedProgram(chosenProgram);
      const programWasMigrated =
        JSON.stringify(normalizedProgram) !== JSON.stringify(chosenProgram);
      chosenProgram = normalizedProgram;
      if (programWasMigrated && ownerId !== 'local' && navigator.onLine) {
        await this.upsertCloud(ownerId, chosenProgram);
        chosenUpdatedAt = new Date().toISOString();
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
    program = this.renumberDays(program);
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

  private createRecommendedProgram(): TrainingProgram {
    return {
      ...structuredClone(SEED_PROGRAM),
      rotationStartedAt: this.dateKey(),
    };
  }

  private normalizeHydratedProgram(program: TrainingProgram): TrainingProgram {
    const hasSecondRecoveryDay = program.days.some((day) => day.id === 'day-8-recovery');
    const recommendedDayEight = SEED_PROGRAM.days.find((day) => day.id === 'day-8-recovery');
    const days =
      program.days.length === 7 && !hasSecondRecoveryDay && recommendedDayEight
        ? [...program.days, structuredClone(recommendedDayEight)]
        : program.days;
    return this.renumberDays({
      ...program,
      description:
        program.description ===
        'Split 7 jours orienté V-taper, épaules, haut des pectoraux et performance.'
          ? SEED_PROGRAM.description
          : program.description,
      rotationStartedAt: program.rotationStartedAt ?? this.dateKey(),
      days,
    });
  }

  private renumberDays(program: TrainingProgram): TrainingProgram {
    return {
      ...program,
      days: program.days.map((day, index) => ({ ...day, dayNumber: index + 1 })),
    };
  }

  private createRecoveryDay(dayNumber: number): ProgramDay {
    return {
      id: `recovery-${crypto.randomUUID()}`,
      dayNumber,
      title: 'Récupération active',
      shortTitle: 'Repos',
      focus: 'Faire redescendre la fatigue',
      kind: 'recovery',
      durationMinutes: 30,
      exercises: [],
      recoveryItems: ['Marche légère', 'Mobilité', 'Hydratation et sommeil'],
    };
  }

  private dateKey(date = new Date()): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private daysBetween(from: string, to: string): number {
    const fromDate = new Date(`${from}T00:00:00`);
    const toDate = new Date(`${to}T00:00:00`);
    return Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
  }

  private addDays(date: string, amount: number): string {
    const value = new Date(`${date}T00:00:00`);
    value.setDate(value.getDate() + amount);
    return this.dateKey(value);
  }
}
