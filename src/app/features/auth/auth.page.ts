import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/services/auth-store';
import { SyncService } from '../../core/services/sync.service';

@Component({
  selector: 'app-auth-page',
  imports: [RouterLink],
  templateUrl: './auth.page.html',
  styleUrl: './auth.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPage {
  protected readonly auth = inject(AuthStore);
  protected readonly sync = inject(SyncService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly passwordConfirmation = signal('');
  protected readonly mode = signal<'signin' | 'signup'>(
    this.route.snapshot.queryParamMap.get('mode') === 'signup' ? 'signup' : 'signin',
  );
  protected readonly showPassword = signal(false);
  protected readonly confirmationNotice = this.route.snapshot.queryParamMap.has('confirmation');

  protected async submit(): Promise<void> {
    const email = this.email().trim();
    if (!email || !email.includes('@')) {
      this.auth.error.set('Entre une adresse e-mail valide.');
      return;
    }
    if (this.password().length < 8) {
      this.auth.error.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (this.mode() === 'signup' && this.password() !== this.passwordConfirmation()) {
      this.auth.error.set('Les deux mots de passe ne correspondent pas.');
      return;
    }

    if (this.mode() === 'signin') {
      if (await this.auth.signInWithPassword(email, this.password())) {
        await this.router.navigate(['/accueil']);
      }
      return;
    }

    const result = await this.auth.signUpWithPassword(email, this.password());
    if (result === 'signed-in') await this.router.navigate(['/accueil']);
  }

  protected setMode(mode: 'signin' | 'signup'): void {
    this.mode.set(mode);
    this.password.set('');
    this.passwordConfirmation.set('');
    this.auth.clearFeedback();
  }

  protected async resetPassword(): Promise<void> {
    const email = this.email().trim();
    if (!email || !email.includes('@')) {
      this.auth.error.set('Entre d’abord ton adresse e-mail.');
      return;
    }
    await this.auth.sendPasswordReset(email);
  }

  protected async sendMagicLink(): Promise<void> {
    const email = this.email().trim();
    if (!email || !email.includes('@')) {
      this.auth.error.set('Entre d’abord ton adresse e-mail.');
      return;
    }
    await this.auth.sendMagicLink(email);
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
