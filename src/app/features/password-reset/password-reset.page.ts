import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/services/auth-store';

@Component({
  selector: 'app-password-reset-page',
  imports: [RouterLink],
  templateUrl: './password-reset.page.html',
  styleUrl: './password-reset.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordResetPage {
  protected readonly auth = inject(AuthStore);
  protected readonly password = signal('');
  protected readonly confirmation = signal('');
  protected readonly completed = signal(false);
  protected readonly showPassword = signal(false);

  protected async submit(): Promise<void> {
    if (this.password().length < 8) {
      this.auth.error.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (this.password() !== this.confirmation()) {
      this.auth.error.set('Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (!this.auth.isAuthenticated()) {
      this.auth.error.set('Ce lien est invalide ou a expiré. Demande un nouvel e-mail.');
      return;
    }
    this.completed.set(await this.auth.updatePassword(this.password()));
  }
}
