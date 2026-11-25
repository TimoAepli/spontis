import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonInput, IonSpinner } from '@ionic/angular/standalone';
import { AuthService } from '../core/auth.service';
import { firstNameError, normalizeUsername, usernameError } from '../core/logic/username';

/** Registrierung: Benutzername + Vorname, mehr nicht. */
@Component({
  selector: 'app-welcome',
  imports: [FormsModule, IonContent, IonInput, IonButton, IonSpinner],
  templateUrl: './welcome.page.html',
  styleUrl: './welcome.page.scss',
})
export class WelcomePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Zielseite nach der Registrierung (z. B. ein geteilter Aktivitäts-Link). */
  readonly weiter = input<string>();

  readonly username = signal('');
  readonly firstName = signal('');
  readonly submitted = signal(false);
  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly usernamePreview = computed(() => normalizeUsername(this.username()));
  readonly usernameError = computed(() => usernameError(this.username()));
  readonly firstNameError = computed(() => firstNameError(this.firstName()));

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.serverError.set(null);
    if (this.usernameError() || this.firstNameError()) return;

    this.busy.set(true);
    const result = await this.auth.register(this.username(), this.firstName());
    this.busy.set(false);

    if (result === 'username_taken') {
      this.serverError.set('Dieser Benutzername ist schon vergeben.');
      return;
    }
    if (result === 'error') {
      this.serverError.set('Das hat nicht geklappt. Prüfe die Internetverbindung und versuche es nochmals.');
      return;
    }

    const target = this.weiter();
    await this.router.navigateByUrl(target?.startsWith('/') ? target : '/tabs/entdecken', {
      replaceUrl: true,
    });
  }
}
