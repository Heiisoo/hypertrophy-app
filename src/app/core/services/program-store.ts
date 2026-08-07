import { computed, Injectable, signal } from '@angular/core';
import { ProgramDay, TrainingProgram } from '../models/training.models';
import { hypertrophyDb } from '../database/hypertrophy.database';
import { SEED_PROGRAM } from '../../data/seed-program';
import { supabase } from '../supabase/supabase.client';

@Injectable({ providedIn: 'root' })
export class ProgramStore {
  private readonly programState = signal<TrainingProgram>(SEED_PROGRAM);
  readonly program = this.programState.asReadonly();
  readonly ready = signal(false);

  readonly today = computed<ProgramDay>(() => {
    const dayNumber = new Date().getDay() === 0 ? 7 : new Date().getDay();
    return (
      this.programState().days.find((day) => day.dayNumber === dayNumber) ??
      this.programState().days[0]
    );
  });

  constructor() {
    void this.hydrate();
  }

  private async hydrate(): Promise<void> {
    try {
      await hypertrophyDb.seedIfNeeded();
      const stored = await hypertrophyDb.programs.get(SEED_PROGRAM.id);
      if (stored) {
        this.programState.set(stored);
      }
      await this.refreshFromCloud();
    } finally {
      this.ready.set(true);
    }
  }

  private async refreshFromCloud(): Promise<void> {
    if (!navigator.onLine) return;
    const { data, error } = await supabase
      .from('programs')
      .select('*, program_days(*, program_exercises(*, exercises(id, name, category)))')
      .eq('id', SEED_PROGRAM.id)
      .single();

    if (error || !data) return;
    const cloudProgram: TrainingProgram = {
      id: data.id,
      name: data.name,
      description: data.description,
      active: data.active ? 1 : 0,
      createdAt: data.created_at,
      days: data.program_days
        .sort((a, b) => a.day_number - b.day_number)
        .map((day) => ({
          id: day.id,
          dayNumber: day.day_number,
          title: day.title,
          shortTitle: day.short_title,
          focus: day.focus,
          kind: day.kind === 'recovery' ? 'recovery' : 'training',
          durationMinutes: day.duration_minutes,
          recoveryItems: day.recovery_items,
          exercises: day.program_exercises
            .sort((a, b) => a.position - b.position)
            .map((prescription) => ({
              id: prescription.exercises.id,
              name: prescription.exercises.name,
              category: prescription.exercises.category,
              sets: prescription.sets,
              repRange: prescription.rep_range,
              targetRir: prescription.target_rir,
              restSeconds: prescription.rest_seconds,
              cue: prescription.cue ?? undefined,
            })),
        })),
    };

    await hypertrophyDb.programs.put(cloudProgram);
    this.programState.set(cloudProgram);
  }
}
