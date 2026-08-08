import { Injectable, computed, signal } from '@angular/core';
import { ExerciseCatalogItem, ExercisePrescription } from '../models/training.models';
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

    const [bundledResult, supabaseResult] = await Promise.all([
      this.loadBundledCatalog(),
      supabase.from('exercises').select('*').order('name'),
    ]);

    const merged = new Map<string, ExerciseCatalogItem>();
    for (const exercise of bundledResult) this.addOrMerge(merged, exercise);

    if (!supabaseResult.error) {
      for (const exercise of supabaseResult.data) {
        this.addOrMerge(merged, {
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          equipment: exercise.equipment ?? undefined,
          primaryMuscles: exercise.primary_muscles,
          aliases: exercise.aliases,
          instructions: exercise.instructions ?? undefined,
          imageUrl: exercise.image_url ?? undefined,
          videoUrl: exercise.video_url ?? undefined,
        });
      }
    }

    this.loading.set(false);
    if (merged.size === 0) {
      this.error.set(
        'Catalogue indisponible hors connexion. Tu peux créer un exercice manuellement.',
      );
      return;
    }

    this.loaded = true;
    this.exercises.set([...merged.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
  }

  enrich(exercise: ExercisePrescription | undefined): ExercisePrescription | undefined {
    if (!exercise) return undefined;
    if (exercise.videoUrl && exercise.imageUrl && exercise.secondaryImageUrl) return exercise;
    const match = this.findMatch(exercise.id, exercise.name);
    if (!match) return exercise;
    return {
      ...exercise,
      imageUrl: exercise.imageUrl ?? match.imageUrl,
      secondaryImageUrl: exercise.secondaryImageUrl ?? match.secondaryImageUrl,
      videoUrl: exercise.videoUrl ?? match.videoUrl,
    };
  }

  private async loadBundledCatalog(): Promise<readonly ExerciseCatalogItem[]> {
    try {
      const response = await fetch('/data/exercises.json');
      if (!response.ok) return [];
      return (await response.json()) as readonly ExerciseCatalogItem[];
    } catch {
      return [];
    }
  }

  private addOrMerge(
    catalog: Map<string, ExerciseCatalogItem>,
    exercise: ExerciseCatalogItem,
  ): void {
    const key = this.normalize(exercise.name);
    const current = catalog.get(key);
    if (!current) {
      catalog.set(key, exercise);
      return;
    }
    catalog.set(key, {
      ...current,
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      equipment: exercise.equipment ?? current.equipment,
      primaryMuscles: [...new Set([...current.primaryMuscles, ...exercise.primaryMuscles])],
      aliases: [...new Set([...current.aliases, ...exercise.aliases])],
      instructions: exercise.instructions ?? current.instructions,
      imageUrl: exercise.imageUrl ?? current.imageUrl,
      secondaryImageUrl: exercise.secondaryImageUrl ?? current.secondaryImageUrl,
      videoUrl: exercise.videoUrl ?? current.videoUrl,
      sourceUrl: exercise.sourceUrl ?? current.sourceUrl,
      license: exercise.license ?? current.license,
    });
  }

  private findMatch(id: string, name: string): ExerciseCatalogItem | undefined {
    const exactId = this.exercises().find((exercise) => exercise.id === id);
    if (exactId) return exactId;
    const normalizedName = this.normalize(name);
    return this.exercises().find(
      (exercise) =>
        this.normalize(exercise.name) === normalizedName ||
        exercise.aliases.some((alias) => this.normalize(alias) === normalizedName),
    );
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fr')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
