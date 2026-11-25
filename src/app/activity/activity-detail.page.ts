import { Component, OnDestroy, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shareOutline } from 'ionicons/icons';
import { AuthService } from '../core/auth.service';
import { DataSource } from '../core/data/data-source';
import { friendRequestMessage, shouldOfferFriendship } from '../core/logic/friends';
import { missingHint, participation } from '../core/logic/participation';
import { sharePath, shareText } from '../core/logic/share-text';
import { formatTime, relativeStart } from '../core/logic/time';
import { firstNameError } from '../core/logic/username';
import { MetricsService } from '../core/metrics.service';
import { Activity, CATEGORIES, Participant, VISIBILITY_LABELS } from '../core/models';
import { appLink, ShareService } from '../core/share.service';
import { StaticMapComponent } from './static-map.component';

/**
 * Detailseite: Infos, Zusagezähler in Echtzeit, Anzeigenamen, Beitreten/Austreten.
 * Funktioniert auch über einen geteilten Link ohne Konto: Dann tritt man als Gast bei
 * (nur Anzeigename).
 */
@Component({
  selector: 'app-activity-detail',
  imports: [
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonFooter,
    IonButton,
    IonSpinner,
    IonIcon,
    IonInput,
    StaticMapComponent,
  ],
  templateUrl: './activity-detail.page.html',
  styleUrl: './activity-detail.page.scss',
})
export class ActivityDetailPage implements OnInit, OnDestroy {
  private readonly data = inject(DataSource);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);
  private readonly sharing = inject(ShareService);
  private readonly metrics = inject(MetricsService);

  /** Aus der URL /a/:id */
  readonly id = input.required<string>();
  /** Einladungscode des Erstellers aus dem geteilten Link (?f=…) – zeigt: über Link geöffnet */
  readonly f = input<string>();

  readonly activity = signal<Activity | null>(null);
  readonly participants = signal<Participant[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly busy = signal(false);
  /** Kurz true, wenn «Findet statt» gerade eben erreicht wurde (Animation). */
  readonly justHappened = signal(false);
  readonly now = signal(new Date());

  // Gast-Beitritt
  readonly guestName = signal('');
  readonly guestSubmitted = signal(false);
  readonly guestError = computed(() => (this.guestSubmitted() ? firstNameError(this.guestName()) : null));

  readonly myId = computed(() => this.auth.profile()?.id ?? null);
  readonly isCreator = computed(() => this.activity()?.creatorId === this.myId());
  readonly category = computed(() => {
    const a = this.activity();
    return a ? CATEGORIES[a.category] : null;
  });
  readonly progress = computed(() => {
    const a = this.activity();
    return a ? participation(a.participantCount, a.minParticipants) : null;
  });
  readonly hint = computed(() => {
    const p = this.progress();
    return p ? missingHint(p) : '';
  });
  readonly time = computed(() => {
    const a = this.activity();
    return a ? `${formatTime(a.startsAt)} · ${relativeStart(a.startsAt, this.now())}` : '';
  });
  readonly visibilityLabel = computed(() => {
    const a = this.activity();
    return a ? VISIBILITY_LABELS[a.visibility] : '';
  });
  readonly mapsLink = computed(() => {
    const a = this.activity();
    return a ? `https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}` : '';
  });
  /** Ziel nach Anmelden/Registrieren: zurück zu dieser Aktivität */
  readonly returnUrl = computed(() => `/a/${this.id()}`);

  private unwatch?: () => void;
  private reloadTimer?: ReturnType<typeof setTimeout>;
  private readonly clock = setInterval(() => this.now.set(new Date()), 60_000);
  /**
   * Echtzeit-Meldungen bekommt nur, wer die Aktivität regulär sehen darf.
   * Wer sie nur über den Link sieht, bekommt alle 15 s den neuen Stand.
   */
  private readonly fallbackPoll = setInterval(() => void this.load(), 15_000);
  private wasHappening: boolean | null = null;

  constructor() {
    addIcons({ shareOutline });
    // «Findet statt» erreicht → kurze Animation
    effect(() => {
      const happening = this.progress()?.isHappening ?? null;
      if (happening === null) return;
      if (this.wasHappening === false && happening) {
        this.justHappened.set(true);
        setTimeout(() => this.justHappened.set(false), 1800);
      }
      this.wasHappening = happening;
    });
  }

  async ngOnInit(): Promise<void> {
    await this.auth.init();
    await this.load();
    void this.maybeOfferFriendship();
    // Echtzeit: bei jeder Änderung an dieser Aktivität neu laden
    this.unwatch = this.data.watch((changedId) => {
      if (changedId === null || changedId === this.id()) this.scheduleReload();
    });
  }

  ngOnDestroy(): void {
    this.unwatch?.();
    clearInterval(this.clock);
    clearInterval(this.fallbackPoll);
    clearTimeout(this.reloadTimer);
  }

  /** Mehrere Änderungen kurz hintereinander nur einmal laden. */
  private scheduleReload(): void {
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => void this.load(), 250);
  }

  async load(): Promise<void> {
    try {
      const [activity, participants] = await Promise.all([
        this.data.getActivity(this.id()),
        this.data.listParticipants(this.id()).catch(() => [] as Participant[]),
      ]);
      this.activity.set(activity);
      this.participants.set(participants);
      this.notFound.set(activity === null);
    } catch (e) {
      console.error('Aktivität laden fehlgeschlagen', e);
      if (!this.activity()) this.notFound.set(true);
    } finally {
      this.loading.set(false);
      this.now.set(new Date());
    }
  }

  /**
   * Über einen Link geöffnet, angemeldet und noch nicht befreundet →
   * Pop-up «Freundschaftsanfrage senden?». Pro Person nur einmal pro Sitzung.
   */
  private async maybeOfferFriendship(): Promise<void> {
    const a = this.activity();
    if (!a || this.f() === undefined) return;
    const askedKey = `spontis-friend-offer-${a.creatorId}`;
    if (sessionStorage.getItem(askedKey)) return;

    if (this.auth.isGuest()) return;
    const friends = this.myId() ? await this.data.listFriends().catch(() => []) : [];
    const offer = shouldOfferFriendship({
      viaLink: true,
      viewerId: this.myId(),
      viewerIsGuest: this.auth.isGuest(),
      creatorId: a.creatorId,
      friends,
    });
    if (!offer) return;
    sessionStorage.setItem(askedKey, '1');

    const name = a.creatorFirstName;
    const alert = await this.alerts.create({
      header: `Mit ${name} befreundet sein?`,
      message: `Dann siehst du in «Entdecken» auch die anderen «Nur Freunde»-Aktivitäten von ${name}.`,
      buttons: [
        { text: 'Später', role: 'cancel' },
        { text: 'Anfrage senden', handler: () => void this.sendFriendRequest(a.creatorInviteCode, name) },
      ],
    });
    await alert.present();
  }

  private async sendFriendRequest(code: string, name: string): Promise<void> {
    let text: string;
    try {
      text = friendRequestMessage(await this.data.requestFriend(code), name);
    } catch {
      text = 'Die Anfrage hat nicht geklappt. Prüfe die Internetverbindung.';
    }
    const toast = await this.toasts.create({ message: text, duration: 3500, position: 'top' });
    await toast.present();
  }

  async share(): Promise<void> {
    const a = this.activity();
    if (!a) return;
    await this.sharing.share({ title: a.title, text: shareText(a), url: appLink(sharePath(a)) });
  }

  async join(): Promise<void> {
    await this.run(async () => {
      await this.data.join(this.id());
      this.metrics.activityJoined();
    }, 'Beitreten hat nicht geklappt.');
  }

  /** Ohne Konto: Gast mit Anzeigename anlegen und direkt beitreten. */
  async joinAsGuest(): Promise<void> {
    this.guestSubmitted.set(true);
    if (firstNameError(this.guestName())) return;
    await this.run(async () => {
      if (!(await this.auth.registerGuest(this.guestName()))) throw new Error('Gast anlegen fehlgeschlagen');
      await this.data.join(this.id());
      this.metrics.activityJoined();
    }, 'Beitreten hat nicht geklappt. Prüfe die Internetverbindung.');
  }

  async leave(): Promise<void> {
    await this.run(() => this.data.leave(this.id()), 'Austreten hat nicht geklappt.');
  }

  async confirmDelete(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Aktivität löschen?',
      message: 'Alle Zusagen gehen verloren.',
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: async () => {
            await this.run(() => this.data.deleteActivity(this.id()), 'Löschen hat nicht geklappt.', false);
            await this.router.navigateByUrl('/tabs/entdecken', { replaceUrl: true });
          },
        },
      ],
    });
    await alert.present();
  }

  private async run(action: () => Promise<void>, errorText: string, reload = true): Promise<void> {
    this.busy.set(true);
    try {
      await action();
      if (reload) await this.load();
    } catch (e) {
      console.error(errorText, e);
      const toast = await this.toasts.create({ message: errorText, duration: 3000, color: 'danger', position: 'top' });
      await toast.present();
    } finally {
      this.busy.set(false);
    }
  }
}
