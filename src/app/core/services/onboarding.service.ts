import { Injectable, signal } from '@angular/core';

const ONBOARDING_KEY = 'hypertrophy-onboarding-complete';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  readonly completed = signal(localStorage.getItem(ONBOARDING_KEY) === '1');

  complete(): void {
    localStorage.setItem(ONBOARDING_KEY, '1');
    this.completed.set(true);
  }
}
