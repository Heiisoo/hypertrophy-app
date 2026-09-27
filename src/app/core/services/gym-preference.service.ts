import { Injectable, effect, signal } from '@angular/core';
import { GymId, WorkoutSession } from '../models/training.models';
import { AuthStore } from './auth-store';

export interface GymOption {
  readonly id: Exclude<GymId, 'unspecified'>;
  readonly name: string;
  readonly shortName: string;
}

export const GYM_OPTIONS: readonly GymOption[] = [
  { id: 'basic-fit', name: 'Basic-Fit', shortName: 'Basic-Fit' },
  { id: 'fitness-park', name: 'Fitness Park', shortName: 'Fitness Park' },
];

@Injectable({ providedIn: 'root' })
export class GymPreferenceService {
  readonly selectedGymId = signal<GymOption['id'] | null>(null);

  private ownerId = '';

  constructor(private readonly auth: AuthStore) {
    effect(() => {
      const ownerId = this.auth.user()?.id ?? 'local';
      if (ownerId === this.ownerId) return;
      this.ownerId = ownerId;
      const stored = localStorage.getItem(this.storageKey(ownerId));
      this.selectedGymId.set(stored === 'basic-fit' || stored === 'fitness-park' ? stored : null);
    });
  }

  select(gymId: GymOption['id']): void {
    this.selectedGymId.set(gymId);
    localStorage.setItem(this.storageKey(this.ownerId || 'local'), gymId);
  }

  gymIdFor(session: WorkoutSession): GymId {
    return session.gymId ?? 'unspecified';
  }

  label(gymId: GymId | null | undefined): string {
    if (gymId === 'basic-fit') return 'Basic-Fit';
    if (gymId === 'fitness-park') return 'Fitness Park';
    return 'Salle non renseignée';
  }

  otherGym(gymId: GymOption['id']): GymOption {
    return GYM_OPTIONS.find((gym) => gym.id !== gymId) ?? GYM_OPTIONS[0];
  }

  private storageKey(ownerId: string): string {
    return `hypertrophy:last-gym:${ownerId}`;
  }
}
