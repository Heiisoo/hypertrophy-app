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
  private readonly initialization = this.initialize();

  async whenReady(): Promise<void> {
    await this.initialization;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  async sendMagicLink(email: string): Promise<boolean> {
    this.clearFeedback();
    this.loading.set(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/accueil`,
        shouldCreateUser: false,
      },
    });
    this.loading.set(false);

    if (error) {
      this.error.set(this.toFrenchError(error));
      return false;
    }

    this.message.set('Lien envoyé. Cette option ouvre la connexion dans le navigateur utilisé.');
    return true;
  }

  async signInWithPassword(email: string, password: string): Promise<boolean> {
    this.clearFeedback();
    this.loading.set(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    this.loading.set(false);
    if (error) {
      this.error.set(this.toFrenchError(error));
      return false;
    }
    this.message.set('Connexion réussie. Tes données personnelles vont se synchroniser.');
    return true;
  }

  async signUpWithPassword(
    email: string,
    password: string,
  ): Promise<'signed-in' | 'confirm-email' | 'failed'> {
    this.clearFeedback();
    this.loading.set(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/connexion?confirmation=1`,
      },
    });
    this.loading.set(false);
    if (error) {
      this.error.set(this.toFrenchError(error));
      return 'failed';
    }
    if (data.session) {
      this.message.set('Compte créé et connecté.');
      return 'signed-in';
    }
    this.message.set(
      'Compte créé. Confirme ton adresse avec l’e-mail reçu, puis reviens dans l’app installée pour te connecter avec ton mot de passe.',
    );
    return 'confirm-email';
  }

  async sendPasswordReset(email: string): Promise<boolean> {
    this.clearFeedback();
    this.loading.set(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
    });
    this.loading.set(false);
    if (error) {
      this.error.set(this.toFrenchError(error));
      return false;
    }
    this.message.set(
      'E-mail envoyé. Ouvre le lien une fois pour choisir ton mot de passe, puis connecte-toi depuis l’icône de l’app.',
    );
    return true;
  }

  async updatePassword(password: string): Promise<boolean> {
    this.clearFeedback();
    this.loading.set(true);
    const { error } = await supabase.auth.updateUser({ password });
    this.loading.set(false);
    if (error) {
      this.error.set(this.toFrenchError(error));
      return false;
    }
    this.message.set('Mot de passe enregistré. Tu peux maintenant te connecter depuis la PWA.');
    return true;
  }

  async signOut(): Promise<void> {
    this.clearFeedback();
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

  clearFeedback(): void {
    this.error.set('');
    this.message.set('');
  }

  private toFrenchError(error: AuthError): string {
    if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
      return 'Trop de tentatives. Réessaie dans quelques minutes.';
    }
    if (error.code === 'invalid_credentials') return 'E-mail ou mot de passe incorrect.';
    if (error.code === 'email_not_confirmed') {
      return 'Confirme d’abord ton adresse avec l’e-mail reçu.';
    }
    if (error.code === 'weak_password') {
      return 'Choisis un mot de passe plus solide d’au moins 8 caractères.';
    }
    if (error.code === 'same_password') return 'Choisis un mot de passe différent de l’ancien.';
    if (error.code === 'user_already_exists') {
      return 'Ce compte existe déjà. Utilise « Mot de passe oublié » si nécessaire.';
    }
    return 'Opération impossible pour le moment. Vérifie les informations et réessaie.';
  }
}
