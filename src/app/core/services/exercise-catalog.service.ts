import { Injectable, computed, signal } from '@angular/core';
import { ExerciseCatalogItem } from '../models/training.models';
import { supabase } from '../supabase/supabase.client';

@Injectable({ providedIn: 'root' })
export class ExerciseCatalogService {
  readonly exercises = signal<readonly ExerciseCatalogItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly categories = computed(() =>
    [...new Set(this.exercises().map((exercise) => exercise.category))].sort((a, b) =>
      a.localeCompare(b, 'fr'),
    ),
  );

  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const { data, error } = await supabase.from('exercises').select('*').order('name');
    this.loading.set(false);
    if (error) {
      this.error.set('Catalogue indisponible hors connexion. Tu peux créer un exercice manuellement.');
      return;
    }
    this.loaded = true;
    const uniqueExercises = new Map<string, ExerciseCatalogItem>();
    for (const exercise of data) {
      const item: ExerciseCatalogItem = {
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        equipment: exercise.equipment ?? undefined,
        primaryMuscles: exercise.primary_muscles,
        aliases: exercise.aliases,
        instructions: exercise.instructions ?? undefined,
        imageUrl: exercise.image_url ?? undefined,
        videoUrl: exercise.video_url ?? undefined,
      };
      const key = exercise.name.trim().toLocaleLowerCase('fr-FR');
      const current = uniqueExercises.get(key);
      if (!current || this.detailScore(item) > this.detailScore(current)) {
        uniqueExercises.set(key, item);
      }
    }
    this.exercises.set(
      [...uniqueExercises.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    );
  }

  private detailScore(exercise: ExerciseCatalogItem): number {
    return [exercise.equipment, exercise.instructions, exercise.imageUrl, exercise.videoUrl].filter(
      Boolean,
    ).length;
  }
}
