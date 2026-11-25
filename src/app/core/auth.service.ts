import { computed, Injectable, signal } from '@angular/core';
import { DEMO_ME } from './data/demo-seed';
import { isDemoMode, leaveDemoMode } from './demo-mode';
import { Profile } from './models';
import { normalizeUsername } from './logic/username';
import { supabase } from './supabase';

/** Ergebnis der Registrierung, damit die Seite eine passende Meldung zeigen kann. */
export type RegisterResult = 'ok' | 'username_taken' | 'error';

/**
 * Anmeldung ohne E-Mail und Passwort:
 * 1. Supabase legt ein anonymes Konto an (Sitzung bleibt im Browser gespeichert).
 * 2. Wir speichern dazu ein Profil mit Benutzername und Vorname.
 *
 * Im Demo-Modus ist man automatisch «Lena» – ohne Supabase.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _profile = signal<Profile | null>(null);
  private initPromise: Promise<void> | null = null;

  /** Aktuelles Profil oder null, wenn noch nicht registriert. */
  readonly profile = this._profile.asReadonly();
  readonly isRegistered = computed(() => this._profile() !== null);
  readonly isDemo = isDemoMode();

  /** Einmal beim Start: bestehende Sitzung und Profil laden. */
  init(): Promise<void> {
    this.initPromise ??= this.isDemo ? Promise.resolve(this._profile.set(DEMO_ME)) : this.loadProfile();
    return this.initPromise;
  }

  private async loadProfile(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, first_name, invite_code')
      .eq('id', userId)
      .maybeSingle();
    if (!error && profile) this._profile.set(profile);
  }

  async register(usernameInput: string, firstNameInput: string): Promise<RegisterResult> {
    if (this.isDemo) return 'ok';
    const username = normalizeUsername(usernameInput);
    const first_name = firstNameInput.trim();

    // Anonymes Konto nur anlegen, wenn noch keine Sitzung besteht
    // (z. B. wenn der erste Versuch am vergebenen Benutzernamen scheiterte).
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error('Anonyme Anmeldung fehlgeschlagen', error);
        return 'error';
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({ username, first_name })
      .select('id, username, first_name, invite_code')
      .single();

    if (error) {
      // 23505 = Wert existiert schon (unique)
      if (error.code === '23505') return 'username_taken';
      console.error('Profil speichern fehlgeschlagen', error);
      return 'error';
    }

    this._profile.set(data);
    return 'ok';
  }

  /** Meldet ab und löscht die Sitzung im Browser. Das anonyme Konto ist danach nicht mehr erreichbar. */
  async signOut(): Promise<void> {
    if (this.isDemo) {
      leaveDemoMode();
      return;
    }
    await supabase.auth.signOut();
    this._profile.set(null);
  }
}
