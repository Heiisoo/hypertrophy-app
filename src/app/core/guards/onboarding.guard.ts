import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../services/auth-store';
import { OnboardingService } from '../services/onboarding.service';

export const onboardingGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const onboarding = inject(OnboardingService);
  const router = inject(Router);

  await auth.whenReady();
  if (auth.isAuthenticated()) {
    onboarding.complete();
    return true;
  }
  return onboarding.completed() ? true : router.createUrlTree(['/bienvenue']);
};
