import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OnboardingService } from '../../core/services/onboarding.service';

@Component({
  selector: 'app-welcome-page',
  imports: [RouterLink],
  templateUrl: './welcome.page.html',
  styleUrl: './welcome.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomePage {
  private readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);

  protected async useRecommendation(): Promise<void> {
    this.onboarding.complete();
    await this.router.navigate(['/programme']);
  }
}
