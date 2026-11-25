import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { AuthService } from '../core/auth.service';
import { DataSource } from '../core/data/data-source';
import { leaveDemoMode } from '../core/demo-mode';
import {
  friendRequestMessage,
  isFriendRequestSuccess,
  isValidInviteCode,
  normalizeInviteCode,
} from '../core/logic/friends';
import { emailError, passwordError } from '../core/logic/account';
import { usernameError } from '../core/logic/username';
import { Friend } from '../core/models';
import { appLink, ShareService } from '../core/share.service';

@Component({
  selector: 'app-profile',
  imports: [
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonInput,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage implements ViewWillEnter {
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly data = inject(DataSource);
  private readonly sharing = inject(ShareService);
  readonly auth = inject(AuthService);

  readonly friendships = signal<Friend[]>([]);
  readonly loading = signal(true);
  readonly code = signal('');
  readonly busy = signal(false);
  readonly message = signal<{ text: string; ok: boolean } | null>(null);

  // Konto sichern
  readonly secureEmail = signal('');
  readonly securePassword = signal('');
  readonly secureSubmitted = signal(false);
  readonly secureBusy = signal(false);
  readonly secureMessage = signal<{ text: string; ok: boolean } | null>(null);
  readonly secureEmailError = computed(() => (this.secureSubmitted() ? emailError(this.secureEmail()) : null));
  readonly securePasswordError = computed(() =>
    this.secureSubmitted() ? passwordError(this.securePassword()) : null,
  );

  // Benutzername für Gäste
  readonly newUsername = signal('');
  readonly usernameSubmitted = signal(false);
  readonly usernameMessage = signal<string | null>(null);
  readonly newUsernameError = computed(() => (this.usernameSubmitted() ? usernameError(this.newUsername()) : null));

  readonly incoming = computed(() =>
    this.friendships().filter((f) => f.status === 'pending' && f.direction === 'incoming'),
  );
  readonly outgoing = computed(() =>
    this.friendships().filter((f) => f.status === 'pending' && f.direction === 'outgoing'),
  );
  readonly friends = computed(() =>
    this.friendships()
      .filter((f) => f.status === 'accepted')
      .sort((a, b) => a.firstName.localeCompare(b.firstName, 'de-CH')),
  );

  constructor() {
    void this.load();
  }

  ionViewWillEnter(): void {
    if (!this.loading()) void this.load();
  }

  async load(): Promise<void> {
    try {
      this.friendships.set(await this.data.listFriends());
    } catch (e) {
      console.error('Freunde laden fehlgeschlagen', e);
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    (event.target as HTMLIonRefresherElement).complete();
  }

  async shareInvite(): Promise<void> {
    const p = this.auth.profile();
    if (!p) return;
    await this.sharing.share({
      title: 'spontis',
      text: `${p.first_name} lädt dich auf spontis ein – spontan etwas unternehmen in St. Gallen.`,
      url: appLink(`/f/${p.invite_code}`),
    });
  }

  async copyCode(): Promise<void> {
    const p = this.auth.profile();
    if (p) await this.sharing.copy(p.invite_code, 'Code kopiert.');
  }

  async addByCode(): Promise<void> {
    const code = normalizeInviteCode(this.code());
    if (!isValidInviteCode(code)) {
      this.message.set({ text: 'Ein Code hat 6 Zeichen, z. B. 4F9A2C.', ok: false });
      return;
    }
    this.busy.set(true);
    this.message.set(null);
    try {
      const [result, name] = await Promise.all([
        this.data.requestFriend(code),
        this.data.nameForInviteCode(code),
      ]);
      this.message.set({ text: friendRequestMessage(result, name ?? undefined), ok: isFriendRequestSuccess(result) });
      if (isFriendRequestSuccess(result)) this.code.set('');
      await this.load();
    } catch (e) {
      console.error(e);
      this.message.set({ text: 'Das hat nicht geklappt. Prüfe die Internetverbindung.', ok: false });
    } finally {
      this.busy.set(false);
    }
  }

  async accept(f: Friend): Promise<void> {
    await this.data.acceptFriend(f.userId);
    await this.load();
  }

  async decline(f: Friend): Promise<void> {
    await this.data.removeFriend(f.userId);
    await this.load();
  }

  async confirmRemove(f: Friend): Promise<void> {
    const alert = await this.alerts.create({
      header: `${f.firstName} entfernen?`,
      message: 'Ihr seht danach eure «Nur Freunde»-Aktivitäten nicht mehr.',
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        { text: 'Entfernen', role: 'destructive', handler: () => void this.decline(f) },
      ],
    });
    await alert.present();
  }

  leaveDemo(): void {
    leaveDemoMode();
  }

  // ---------- Konto sichern (E-Mail + Passwort) ----------

  async secureAccount(): Promise<void> {
    this.secureSubmitted.set(true);
    this.secureMessage.set(null);
    if (emailError(this.secureEmail()) || passwordError(this.securePassword())) return;

    this.secureBusy.set(true);
    const result = await this.auth.secureAccount(this.secureEmail(), this.securePassword());
    this.secureBusy.set(false);

    const messages: Record<typeof result, { text: string; ok: boolean }> = {
      ok: { text: 'Konto gesichert. Du kannst dich jetzt auf jedem Gerät anmelden.', ok: true },
      confirm_email: {
        text: 'Wir haben dir eine E-Mail geschickt. Bestätige den Link darin und tippe dann nochmals auf «Konto sichern».',
        ok: true,
      },
      email_taken: { text: 'Diese E-Mail gehört schon zu einem anderen Konto. Melde dich damit an.', ok: false },
      error: { text: 'Das hat nicht geklappt. Prüfe die Internetverbindung.', ok: false },
    };
    this.secureMessage.set(messages[result]);
    if (result === 'ok') this.securePassword.set('');
  }

  // ---------- Benutzername für Gäste ----------

  async saveUsername(): Promise<void> {
    this.usernameSubmitted.set(true);
    this.usernameMessage.set(null);
    if (usernameError(this.newUsername())) return;
    const result = await this.auth.chooseUsername(this.newUsername());
    if (result === 'username_taken') this.usernameMessage.set('Dieser Benutzername ist schon vergeben.');
    else if (result === 'error') this.usernameMessage.set('Das hat nicht geklappt.');
  }

  async confirmSignOut(): Promise<void> {
    const email = this.auth.email();
    const alert = await this.alerts.create({
      header: 'Abmelden?',
      message: email
        ? `Du kannst dich jederzeit mit ${email} und deinem Passwort wieder anmelden.`
        : 'Dein Konto ist nicht mit E-Mail und Passwort gesichert. Nach dem Abmelden kommst du nicht mehr hinein. ' +
          'Sichere es zuerst unter «Konto sichern».',
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Abmelden',
          role: 'destructive',
          handler: async () => {
            await this.auth.signOut();
            await this.router.navigateByUrl('/willkommen', { replaceUrl: true });
          },
        },
      ],
    });
    await alert.present();
  }
}
