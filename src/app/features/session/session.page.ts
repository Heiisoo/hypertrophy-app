import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { hypertrophyDb } from '../../core/database/hypertrophy.database';
import { ExercisePrescription } from '../../core/models/training.models';
import { ProgramStore } from '../../core/services/program-store';
import { SyncService } from '../../core/services/sync.service';
import { HistoryService } from '../../core/services/history.service';

interface EditableSet {
  readonly setNumber: number;
  readonly weightKg: number;
  readonly reps: number;
  readonly rir: number;
  readonly completed: boolean;
}

@Component({
  selector: 'app-session-page',
  imports: [RouterLink],
  templateUrl: './session.page.html',
  styleUrl: './session.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionPage implements OnDestroy {
  protected readonly store = inject(ProgramStore);
  protected readonly sync = inject(SyncService);
  private readonly history = inject(HistoryService);
  private readonly router = inject(Router);

  protected readonly day = computed(() => {
    const today = this.store.today();
    return today.kind === 'training'
      ? today
      : (this.store.program().days.find((day) => day.kind === 'training') ?? today);
  });
  protected readonly activeExerciseIndex = signal(0);
  protected readonly activeExercise = computed(
    () => this.day().exercises[this.activeExerciseIndex()],
  );
  protected readonly sets = signal<readonly EditableSet[]>([]);
  protected readonly completedSets = computed(
    () => this.sets().filter((set) => set.completed).length,
  );
  protected readonly completedTotal = signal(0);
  protected readonly totalSets = computed(() =>
    this.day().exercises.reduce((total, exercise) => total + exercise.sets, 0),
  );
  protected readonly progress = computed(() =>
    this.sets().length === 0 ? 0 : (this.completedSets() / this.sets().length) * 100,
  );
  protected readonly restSeconds = signal(0);
  protected readonly timerVisible = computed(() => this.restSeconds() > 0);
  protected readonly timerLabel = computed(() => this.formatTimer(this.restSeconds()));
  protected readonly previousPerformance = signal('Aucune donnée locale');

  private readonly setCache = new Map<string, readonly EditableSet[]>();
  private readonly previousLabels = new Map<string, string>();
  private readonly sessionId = `session-${crypto.randomUUID()}`;
  private readonly sessionStartedAt = new Date().toISOString();
  private timerId?: ReturnType<typeof setInterval>;

  constructor() {
    for (const exercise of this.day().exercises) {
      this.setCache.set(exercise.id, this.createSets(exercise));
    }
    this.sets.set(this.setCache.get(this.activeExercise()?.id ?? '') ?? []);
    void this.hydratePreviousSets();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  protected selectExercise(index: number): void {
    if (index < 0 || index >= this.day().exercises.length) return;
    this.rememberCurrentSets();
    this.activeExerciseIndex.set(index);
    this.sets.set(this.setCache.get(this.activeExercise()?.id ?? '') ?? []);
    this.updatePreviousLabel();
  }

  protected adjust(setIndex: number, field: 'weightKg' | 'reps' | 'rir', amount: number): void {
    this.updateSets((sets) =>
      sets.map((set, index) => {
        if (index !== setIndex || set.completed) return set;
        const maximum = field === 'rir' ? 5 : Number.POSITIVE_INFINITY;
        return { ...set, [field]: Math.min(maximum, Math.max(0, set[field] + amount)) };
      }),
    );
  }

  protected setValue(setIndex: number, field: 'weightKg' | 'reps' | 'rir', rawValue: string): void {
    const value = Number.parseFloat(rawValue.replace(',', '.'));
    if (!Number.isFinite(value)) return;
    this.updateSets((sets) =>
      sets.map((set, index) => {
        if (index !== setIndex || set.completed) return set;
        const maximum = field === 'rir' ? 5 : Number.POSITIVE_INFINITY;
        return { ...set, [field]: Math.min(maximum, Math.max(0, value)) };
      }),
    );
  }

  protected toggleSet(setIndex: number): void {
    const exercise = this.activeExercise();
    if (!exercise) return;

    let updatedSet: EditableSet | undefined;
    this.updateSets((sets) =>
      sets.map((set, index) => {
        if (index !== setIndex) return set;
        updatedSet = { ...set, completed: !set.completed };
        return updatedSet;
      }),
    );

    this.completedTotal.set(
      [...this.setCache.values()].flat().filter((set) => set.completed).length,
    );
    if (updatedSet?.completed) this.startRest(exercise.restSeconds);
    if (updatedSet) void this.persistSet(exercise, updatedSet);
  }

  protected async finishSession(): Promise<void> {
    const remaining = this.totalSets() - this.completedTotal();
    if (
      remaining > 0 &&
      !window.confirm(`Il reste ${remaining} séries. Terminer quand même la séance ?`)
    ) {
      return;
    }

    const now = new Date().toISOString();
    await hypertrophyDb.transaction(
      'rw',
      hypertrophyDb.workoutSessions,
      hypertrophyDb.syncQueue,
      async () => {
        await hypertrophyDb.workoutSessions.put({
          id: this.sessionId,
          programDayId: this.day().id,
          startedAt: this.sessionStartedAt,
          finishedAt: now,
          status: 'completed',
        });
        await this.replaceQueueItem('session', this.sessionId, now);
      },
    );
    this.skipTimer();
    await this.sync.notifyQueueChanged();
    await this.history.refresh();
    await this.router.navigate(['/accueil']);
  }

  protected adjustTimer(amount: number): void {
    this.restSeconds.update((seconds) => Math.max(1, seconds + amount));
  }

  protected skipTimer(): void {
    this.clearTimer();
    this.restSeconds.set(0);
  }

  protected formatRest(seconds: number): string {
    return this.formatTimer(seconds);
  }

  private updateSets(update: (sets: readonly EditableSet[]) => readonly EditableSet[]): void {
    this.sets.update(update);
    this.rememberCurrentSets();
  }

  private rememberCurrentSets(): void {
    const exercise = this.activeExercise();
    if (exercise) this.setCache.set(exercise.id, this.sets());
  }

  private createSets(exercise: ExercisePrescription | undefined): readonly EditableSet[] {
    if (!exercise) return [];
    const targetReps = Number.parseInt(exercise.repRange, 10) || 8;
    const targetRir = Number.parseInt(exercise.targetRir, 10) || 0;
    const defaultWeight = exercise.category === 'Épaules' ? 20 : 32;
    return Array.from({ length: exercise.sets }, (_, index) => ({
      setNumber: index + 1,
      weightKg: defaultWeight,
      reps: targetReps,
      rir: targetRir,
      completed: false,
    }));
  }

  private async hydratePreviousSets(): Promise<void> {
    await Promise.all(
      this.day().exercises.map(async (exercise) => {
        const previous = await this.history.previousSets(exercise.id);
        if (previous.length === 0) return;
        const fallback = previous[previous.length - 1];
        this.setCache.set(
          exercise.id,
          Array.from({ length: exercise.sets }, (_, index) => {
            const source = previous[index] ?? fallback;
            return {
              setNumber: index + 1,
              weightKg: source.weightKg,
              reps: source.reps,
              rir: source.rir,
              completed: false,
            };
          }),
        );
        this.previousLabels.set(
          exercise.id,
          `${previous[0].weightKg} kg · ${previous.map((set) => set.reps).join(' / ')}`,
        );
      }),
    );
    this.sets.set(this.setCache.get(this.activeExercise()?.id ?? '') ?? []);
    this.updatePreviousLabel();
  }

  private updatePreviousLabel(): void {
    this.previousPerformance.set(
      this.previousLabels.get(this.activeExercise()?.id ?? '') ?? 'Aucune donnée locale',
    );
  }

  private startRest(seconds: number): void {
    this.clearTimer();
    this.restSeconds.set(seconds);
    this.timerId = setInterval(() => {
      this.restSeconds.update((remaining) => {
        if (remaining <= 1) {
          this.clearTimer();
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }

  private formatTimer(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const remainder = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  }

  private async persistSet(exercise: ExercisePrescription, set: EditableSet): Promise<void> {
    const now = new Date().toISOString();
    await hypertrophyDb.transaction(
      'rw',
      hypertrophyDb.workoutSessions,
      hypertrophyDb.workoutSets,
      hypertrophyDb.syncQueue,
      async () => {
        await hypertrophyDb.workoutSessions.put({
          id: this.sessionId,
          programDayId: this.day().id,
          startedAt: this.sessionStartedAt,
          status: 'active',
        });
        const setId = `${this.sessionId}-${exercise.id}-${set.setNumber}`;
        await hypertrophyDb.workoutSets.put({
          id: setId,
          sessionId: this.sessionId,
          exerciseId: exercise.id,
          setNumber: set.setNumber,
          weightKg: set.weightKg,
          reps: set.reps,
          rir: set.rir,
          completedAt: set.completed ? now : undefined,
        });
        await this.replaceQueueItem('set', setId, now);
      },
    );
    await this.sync.notifyQueueChanged();
  }

  private async replaceQueueItem(
    entityType: 'session' | 'set',
    entityId: string,
    createdAt: string,
  ): Promise<void> {
    await hypertrophyDb.syncQueue.where('entityId').equals(entityId).delete();
    await hypertrophyDb.syncQueue.add({
      entityType,
      entityId,
      operation: 'upsert',
      status: 'pending',
      createdAt,
    });
  }
}
