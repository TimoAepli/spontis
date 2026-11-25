import { computed, Injectable, signal } from '@angular/core';
import { DEMO_ME } from './data/demo-seed';
import { isDemoMode, leaveDemoMode } from './demo-mode';
import { Profile } from './models';
import { normalizeUsername } from './logic/username';
import { supabase } from './supabase';

/** Ergebnis der Registrierung, damit die Seite eine passende Meldung zeigen kann. */
export type RegisterResult = 'ok' | 'username_taken' | 'error';
export type LoginResult = 'ok' | 'wrong_credentials' | 'no_profile' | 'error';
export type SecureResult = 'ok' | 'confirm_email' | 'email_taken' | 'error';

const PROFILE_COLUMNS = 'id, username, first_name, invite_code';

/**
 * Konten:
 * - Registrieren: Benutzername + Anzeigename → anonymes Supabase-Konto + Profil.
 * - Gast: nur Anzeigename (über einen geteilten Link) → Profil ohne Benutzername.
 * - Konto sichern: E-Mail + Passwort hinterlegen → später auf jedem Gerät anmelden.
 * - Anmelden: mit E-Mail + Passwort.
 *
 * Im Demo-Modus ist man automatisch «Lena» – ohne Supabase.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _profile = signal<Profile | null>(null);
  private readonly _email = signal<string | null>(null);
  private initPromise: Promise<void> | null = null;

  /** Aktuelles Profil oder null, wenn noch nicht registriert. */
  readonly profile = this._profile.asReadonly();
  /** Hinterlegte E-Mail (Konto gesichert) oder null. */
  readonly email = this._email.asReadonly();
  readonly isRegistered = computed(() => this._profile() !== null);
  readonly isGuest = computed(() => this._profile() !== null && !this._profile()!.username);
  readonly isDemo = isDemoMode();

  /** Einmal beim Start: bestehende Sitzung und Profil laden. */
  init(): Promise<void> {
    this.initPromise ??= this.isDemo ? Promise.resolve(this._profile.set(DEMO_ME)) : this.loadProfile();
    return this.initPromise;
  }

  private async loadProfile(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;
    this._email.set(user.email || null);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .maybeSingle();
    if (!error && profile) this._profile.set(profile);
  }

  /** Anonymes Konto anlegen, falls noch keine Sitzung besteht. */
  private async ensureSession(): Promise<boolean> {
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;
    const { error } = await supabase.auth.signInAnonymously();
    if (error) console.error('Anonyme Anmeldung fehlgeschlagen', error);
    return !error;
  }

  async register(usernameInput: string, firstNameInput: string): Promise<RegisterResult> {
    if (this.isDemo) return 'ok';
    // Gast registriert sich: dasselbe Konto bekommt einen Benutzernamen (Zusagen bleiben erhalten)
    if (this.isGuest()) return this.upgradeGuest(usernameInput, firstNameInput);
    if (!(await this.ensureSession())) return 'error';

    const { data, error } = await supabase
      .from('profiles')
      .insert({ username: normalizeUsername(usernameInput), first_name: firstNameInput.trim() })
      .select(PROFILE_COLUMNS)
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

  /** Gast: nur Anzeigename, z. B. beim Beitreten über einen geteilten Link. */
  async registerGuest(displayName: string): Promise<boolean> {
    if (this.isDemo) return true;
    if (!(await this.ensureSession())) return false;
    const { data, error } = await supabase
      .from('profiles')
      .insert({ first_name: displayName.trim() })
      .select(PROFILE_COLUMNS)
      .single();
    if (error) {
      console.error('Gast-Profil speichern fehlgeschlagen', error);
      return false;
    }
    this._profile.set(data);
    return true;
  }

  /** Gast wählt einen Benutzernamen (und ggf. neuen Anzeigenamen) und wird damit zum vollen Konto. */
  private async upgradeGuest(usernameInput: string, firstNameInput: string): Promise<RegisterResult> {
    const p = this._profile();
    if (!p) return 'error';
    const { data, error } = await supabase
      .from('profiles')
      .update({ username: normalizeUsername(usernameInput), first_name: firstNameInput.trim() })
      .eq('id', p.id)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) return error.code === '23505' ? 'username_taken' : 'error';
    this._profile.set(data);
    return 'ok';
  }

  /**
   * Konto sichern: E-Mail und Passwort hinterlegen.
   * Supabase verlangt zuerst die E-Mail, danach das Passwort.
   * Ist in Supabase «Confirm email» eingeschaltet, muss die E-Mail zuerst bestätigt werden.
   */
  async secureAccount(email: string, password: string): Promise<SecureResult> {
    if (this.isDemo) return 'error';
    const { data, error } = await supabase.auth.updateUser({ email: email.trim() });
    if (error) {
      console.error('E-Mail hinterlegen fehlgeschlagen', error);
      return /already|registered|exists/i.test(error.message) ? 'email_taken' : 'error';
    }
    if (data.user?.email?.toLowerCase() !== email.trim().toLowerCase()) {
      // E-Mail wartet auf Bestätigung (Link im Postfach)
      return 'confirm_email';
    }
    const pw = await supabase.auth.updateUser({ password });
    if (pw.error) {
      console.error('Passwort setzen fehlgeschlagen', pw.error);
      return 'error';
    }
    this._email.set(data.user.email);
    return 'ok';
  }

  /** Anmelden mit E-Mail und Passwort (ersetzt ein evtl. vorhandenes Gast-/Gerätekonto). */
  async login(email: string, password: string): Promise<LoginResult> {
    if (this.isDemo) return 'error';
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      return /invalid|credentials/i.test(error.message) ? 'wrong_credentials' : 'error';
    }
    this._profile.set(null);
    this.initPromise = this.loadProfile();
    await this.initPromise;
    return this._profile() ? 'ok' : 'no_profile';
  }

  /** Meldet ab und löscht die Sitzung im Browser. */
  async signOut(): Promise<void> {
    if (this.isDemo) {
      leaveDemoMode();
      return;
    }
    await supabase.auth.signOut();
    this._profile.set(null);
    this._email.set(null);
    this.initPromise = Promise.resolve();
  }
}
