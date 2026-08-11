import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ExerciseCatalogItem,
  ExercisePrescription,
  ProgramDay,
} from '../../core/models/training.models';
import { ExerciseCatalogService } from '../../core/services/exercise-catalog.service';
import { ProgramStore } from '../../core/services/program-store';

interface ExerciseDraft {
  readonly name: string;
  readonly category: string;
  readonly sets: number;
  readonly repRange: string;
  readonly targetRir: string;
  readonly restSeconds: number;
  readonly cue: string;
  readonly imageUrl: string;
  readonly videoUrl: string;
}

@Component({
  selector: 'app-program-page',
  imports: [RouterLink],
  templateUrl: './program.page.html',
  styleUrl: './program.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramPage {
  protected readonly store = inject(ProgramStore);
  protected readonly catalog = inject(ExerciseCatalogService);
  protected readonly expandedDayId = signal(this.store.today().id);
  protected readonly editing = signal(false);
  protected readonly editor = signal<{ dayId: string; exerciseId: string } | null>(null);
  protected readonly draft = signal<ExerciseDraft | null>(null);
  protected readonly catalogDayId = signal('');
  protected readonly catalogSearch = signal('');
  protected readonly catalogCategory = signal('');
  protected readonly catalogVisibleLimit = signal(80);
  protected readonly trainingDayCount = computed(
    () => this.store.program().days.filter((day) => day.kind === 'training').length,
  );
  protected readonly recoveryDayCount = computed(
    () => this.store.program().days.filter((day) => day.kind === 'recovery').length,
  );
  protected readonly matchingCatalog = computed(() => {
    const query = this.catalogSearch().trim().toLocaleLowerCase('fr');
    const category = this.catalogCategory();
    return this.catalog
      .exercises()
      .filter((exercise) => !category || exercise.category === category)
      .filter((exercise) => {
        if (!query) return true;
        return [
          exercise.name,
          exercise.category,
          exercise.equipment,
          ...exercise.primaryMuscles,
          ...exercise.aliases,
        ]
          .filter(Boolean)
          .some((value) => value?.toLocaleLowerCase('fr').includes(query));
      });
  });
  protected readonly filteredCatalog = computed(() =>
    this.matchingCatalog().slice(0, this.catalogVisibleLimit()),
  );

  protected toggleDay(dayId: string): void {
    this.expandedDayId.update((current) => (current === dayId ? '' : dayId));
  }

  protected formatRest(seconds: number): string {
    return seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`;
  }

  protected toggleEditing(): void {
    this.editing.update((value) => !value);
  }

  protected updateProgramField(field: 'name' | 'description', value: string): void {
    if (!value.trim()) return;
    void this.store.updateProgram({ [field]: value.trim() });
  }

  protected updateDayField(
    day: ProgramDay,
    field: 'title' | 'focus' | 'durationMinutes',
    value: string,
  ): void {
    const parsedValue = field === 'durationMinutes' ? Number.parseInt(value, 10) : value.trim();
    if (field === 'durationMinutes' && (!Number.isFinite(parsedValue) || Number(parsedValue) < 1)) {
      return;
    }
    if (typeof parsedValue === 'string' && !parsedValue) return;
    void this.store.updateDay(day.id, { [field]: parsedValue });
  }

  protected openEditor(dayId: string, exercise: ExercisePrescription): void {
    this.editor.set({ dayId, exerciseId: exercise.id });
    this.draft.set({
      name: exercise.name,
      category: exercise.category,
      sets: exercise.sets,
      repRange: exercise.repRange,
      targetRir: exercise.targetRir,
      restSeconds: exercise.restSeconds,
      cue: exercise.cue ?? '',
      imageUrl: exercise.imageUrl ?? '',
      videoUrl: exercise.videoUrl ?? '',
    });
  }

  protected closeEditor(): void {
    this.editor.set(null);
    this.draft.set(null);
  }

  protected updateDraft(field: keyof ExerciseDraft, rawValue: string): void {
    this.draft.update((draft) => {
      if (!draft) return null;
      if (field === 'sets' || field === 'restSeconds') {
        const value = Number.parseInt(rawValue, 10);
        return Number.isFinite(value) ? { ...draft, [field]: Math.max(1, value) } : draft;
      }
      return { ...draft, [field]: rawValue };
    });
  }

  protected async saveExercise(): Promise<void> {
    const editor = this.editor();
    const draft = this.draft();
    if (!editor || !draft || !draft.name.trim()) return;
    await this.store.updateExercise(editor.dayId, editor.exerciseId, {
      ...draft,
      name: draft.name.trim(),
      category: draft.category.trim() || 'À classer',
      repRange: draft.repRange.trim() || '8–12',
      targetRir: draft.targetRir.trim() || '1',
      cue: draft.cue.trim() || undefined,
      imageUrl: draft.imageUrl.trim() || undefined,
      videoUrl: draft.videoUrl.trim() || undefined,
    });
    this.closeEditor();
  }

  protected async addExercise(dayId: string): Promise<void> {
    const exerciseId = await this.store.addExercise(dayId);
    const exercise = this.store
      .program()
      .days.find((day) => day.id === dayId)
      ?.exercises.find((candidate) => candidate.id === exerciseId);
    if (exercise) this.openEditor(dayId, exercise);
  }

  protected openCatalog(dayId: string): void {
    this.catalogDayId.set(dayId);
    this.catalogSearch.set('');
    this.catalogCategory.set('');
    this.catalogVisibleLimit.set(80);
    void this.catalog.load();
  }

  protected updateCatalogSearch(value: string): void {
    this.catalogSearch.set(value);
    this.catalogVisibleLimit.set(80);
  }

  protected selectCatalogCategory(category: string): void {
    this.catalogCategory.set(category);
    this.catalogVisibleLimit.set(80);
  }

  protected showMoreCatalogExercises(): void {
    this.catalogVisibleLimit.update((limit) => limit + 80);
  }

  protected closeCatalog(): void {
    this.catalogDayId.set('');
  }

  protected catalogExerciseAdded(exerciseId: string): boolean {
    const day = this.store.program().days.find((candidate) => candidate.id === this.catalogDayId());
    return Boolean(day?.exercises.some((exercise) => exercise.id === exerciseId));
  }

  protected async selectCatalogExercise(exercise: ExerciseCatalogItem): Promise<void> {
    const dayId = this.catalogDayId();
    if (!dayId || this.catalogExerciseAdded(exercise.id)) return;
    await this.store.addCatalogExercise(dayId, exercise);
    this.closeCatalog();
  }

  protected async addDay(kind: 'training' | 'recovery'): Promise<void> {
    await this.store.addDay(kind);
    this.expandedDayId.set(this.store.program().days.at(-1)?.id ?? '');
  }

  protected removeDay(day: ProgramDay): void {
    if (!window.confirm(`Supprimer le jour ${day.dayNumber} « ${day.title} » ?`)) return;
    void this.store.removeDay(day.id);
  }

  protected resetCycle(): void {
    void this.store.resetCycleToday();
  }

  protected removeExercise(dayId: string, exercise: ExercisePrescription): void {
    if (!window.confirm(`Supprimer « ${exercise.name} » de cette séance ?`)) return;
    void this.store.removeExercise(dayId, exercise.id);
  }

  protected restoreDefault(): void {
    if (
      !window.confirm('Remettre le programme initial ? Tes personnalisations seront remplacées.')
    ) {
      return;
    }
    void this.store.restoreDefault();
  }
}
