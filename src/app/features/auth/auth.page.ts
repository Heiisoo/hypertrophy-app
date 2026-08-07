import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  protected readonly email = signal('');

  protected async submit(): Promise<void> {
    const email = this.email().trim();
    if (!email || !email.includes('@')) {
      this.auth.error.set('Entre une adresse e-mail valide.');
      return;
    }
    await this.auth.sendMagicLink(email);
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
