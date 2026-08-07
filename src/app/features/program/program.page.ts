import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExercisePrescription, ProgramDay } from '../../core/models/training.models';
import { ProgramStore } from '../../core/services/program-store';

interface ExerciseDraft {
  readonly name: string;
  readonly category: string;
  readonly sets: number;
  readonly repRange: string;
  readonly targetRir: string;
  readonly restSeconds: number;
  readonly cue: string;
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
  protected readonly expandedDayId = signal(this.store.today().id);
  protected readonly editing = signal(false);
  protected readonly editor = signal<{ dayId: string; exerciseId: string } | null>(null);
  protected readonly draft = signal<ExerciseDraft | null>(null);

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

  protected removeExercise(dayId: string, exercise: ExercisePrescription): void {
    if (!window.confirm(`Supprimer « ${exercise.name} » de cette séance ?`)) return;
    void this.store.removeExercise(dayId, exercise.id);
  }

  protected restoreDefault(): void {
    if (!window.confirm('Remettre le programme initial ? Tes personnalisations seront remplacées.')) {
      return;
    }
    void this.store.restoreDefault();
  }
}
