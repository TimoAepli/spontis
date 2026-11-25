import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
import { Friend } from '../core/models';
import { appLink, ShareService } from '../core/share.service';

@Component({
  selector: 'app-profile',
  imports: [
    FormsModule,
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

  async confirmSignOut(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Abmelden?',
      message:
        'Ohne E-Mail und Passwort kannst du dich danach nicht mehr in dieses Konto einloggen. ' +
        'Deine Aktivitäten und Freunde bleiben dann ohne dich zurück.',
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
