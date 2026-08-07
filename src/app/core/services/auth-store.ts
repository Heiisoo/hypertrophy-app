import { computed, Injectable, OnDestroy, signal } from '@angular/core';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthStore implements OnDestroy {
  readonly session = signal<Session | null>(null);
  readonly loading = signal(true);
  readonly message = signal('');
  readonly error = signal('');
  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.user() !== null);

  private readonly subscription = supabase.auth.onAuthStateChange((_event, session) => {
    this.session.set(session);
    this.loading.set(false);
  }).data.subscription;

  constructor() {
    void this.initialize();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  async sendMagicLink(email: string): Promise<boolean> {
    this.error.set('');
    this.message.set('');
    this.loading.set(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/accueil`,
        shouldCreateUser: true,
      },
    });
    this.loading.set(false);

    if (error) {
      this.error.set(this.toFrenchError(error));
      return false;
    }

    this.message.set(
      'Lien envoyé. Ouvre ton e-mail sur cet appareil pour activer la synchronisation.',
    );
    return true;
  }

  async signOut(): Promise<void> {
    this.loading.set(true);
    const { error } = await supabase.auth.signOut();
    this.loading.set(false);
    if (error) this.error.set(this.toFrenchError(error));
  }

  private async initialize(): Promise<void> {
    const { data, error } = await supabase.auth.getSession();
    if (error) this.error.set(this.toFrenchError(error));
    this.session.set(data.session);
    this.loading.set(false);
  }

  private toFrenchError(error: AuthError): string {
    if (error.status === 429) return 'Trop de tentatives. Réessaie dans quelques minutes.';
    return 'Connexion impossible pour le moment. Vérifie ton adresse et réessaie.';
  }
}
