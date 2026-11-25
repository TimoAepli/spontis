import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput, IonSpinner } from '@ionic/angular/standalone';
import { AuthService } from '../core/auth.service';
import { emailError, passwordError } from '../core/logic/account';

/** Anmelden mit E-Mail und Passwort (für Konten, die im Profil gesichert wurden). */
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, IonContent, IonInput, IonButton, IonSpinner],
  templateUrl: './login.page.html',
  styleUrl: './welcome.page.scss',
})
export class LoginPage {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  /** Zielseite nach dem Anmelden */
  readonly weiter = input<string>();

  readonly email = signal('');
  readonly password = signal('');
  readonly submitted = signal(false);
  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly emailError = computed(() => (this.submitted() ? emailError(this.email()) : null));
  readonly passwordError = computed(() =>
    this.submitted() && this.password().length === 0 ? passwordError('') : null,
  );
  /** Ist auf diesem Gerät gerade ein ungesichertes Konto angemeldet? Das ginge verloren. */
  readonly losesCurrent = computed(() => this.auth.isRegistered() && !this.auth.email());

  constructor() {
    void this.auth.init();
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.serverError.set(null);
    if (emailError(this.email()) || this.password().length === 0) return;

    this.busy.set(true);
    const result = await this.auth.login(this.email(), this.password());
    this.busy.set(false);

    if (result === 'wrong_credentials') {
      this.serverError.set('E-Mail oder Passwort stimmt nicht.');
      return;
    }
    if (result === 'error') {
      this.serverError.set('Das hat nicht geklappt. Prüfe die Internetverbindung.');
      return;
    }
    if (result === 'no_profile') {
      await this.router.navigate(['/willkommen'], { queryParams: { weiter: this.weiter() }, replaceUrl: true });
      return;
    }
    const target = this.weiter();
    await this.router.navigateByUrl(target?.startsWith('/') ? target : '/tabs/entdecken', { replaceUrl: true });
  }
}
