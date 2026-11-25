import { Component, OnDestroy, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shareOutline } from 'ionicons/icons';
import { AuthService } from '../core/auth.service';
import { DataSource } from '../core/data/data-source';
import {
  friendRequestMessage,
  isFriendRequestSuccess,
  isValidInviteCode,
  normalizeInviteCode,
} from '../core/logic/friends';
import { missingHint, participation } from '../core/logic/participation';
import { sharePath, shareText } from '../core/logic/share-text';
import { MetricsService } from '../core/metrics.service';
import { appLink, ShareService } from '../core/share.service';
import { formatTime, relativeStart } from '../core/logic/time';
import { Activity, CATEGORIES, Participant, VISIBILITY_LABELS } from '../core/models';
import { StaticMapComponent } from './static-map.component';

/** Detailseite: Infos, Zusagezähler in Echtzeit, Vornamen, Beitreten/Austreten. */
@Component({
  selector: 'app-activity-detail',
  imports: [
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
    StaticMapComponent,
  ],
  templateUrl: './activity-detail.page.html',
  styleUrl: './activity-detail.page.scss',
})
export class ActivityDetailPage implements OnInit, OnDestroy {
  private readonly data = inject(DataSource);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);
  private readonly sharing = inject(ShareService);
  private readonly metrics = inject(MetricsService);

  /** Aus der URL /a/:id */
  readonly id = input.required<string>();
  /** Einladungscode des Erstellers aus dem geteilten Link (?f=…) */
  readonly f = input<string>();

  /** Für Nicht-Freunde: Name des Erstellers und Ergebnis der Anfrage */
  readonly inviterName = signal<string | null>(null);
  readonly requestMessage = signal<{ text: string; ok: boolean } | null>(null);

  readonly activity = signal<Activity | null>(null);
  readonly participants = signal<Participant[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly busy = signal(false);
  /** Kurz true, wenn «Findet statt» gerade eben erreicht wurde (Animation). */
  readonly justHappened = signal(false);
  readonly now = signal(new Date());

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

  private unwatch?: () => void;
  private reloadTimer?: ReturnType<typeof setTimeout>;
  private readonly clock = setInterval(() => this.now.set(new Date()), 60_000);
  private wasHappening: boolean | null = null;
  private friendPoll?: ReturnType<typeof setInterval>;

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

  ngOnInit(): void {
    void this.load();
    // Echtzeit: bei jeder Änderung an dieser Aktivität neu laden
    this.unwatch = this.data.watch((changedId) => {
      if (changedId === null || changedId === this.id()) this.scheduleReload();
    });
  }

  ngOnDestroy(): void {
    this.unwatch?.();
    clearInterval(this.clock);
    clearTimeout(this.reloadTimer);
    clearInterval(this.friendPoll);
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
      // Geteilter Link, aber nicht sichtbar → vermutlich «Nur Freunde»: Ersteller anzeigen
      const code = this.inviteCode();
      if (activity === null && code && this.inviterName() === null) {
        this.inviterName.set(await this.data.nameForInviteCode(code));
      }
    } catch (e) {
      console.error('Aktivität laden fehlgeschlagen', e);
      if (!this.activity()) this.notFound.set(true);
    } finally {
      this.loading.set(false);
      this.now.set(new Date());
    }
  }

  private inviteCode(): string | null {
    const code = normalizeInviteCode(this.f() ?? '');
    return isValidInviteCode(code) ? code : null;
  }

  async share(): Promise<void> {
    const a = this.activity();
    if (!a) return;
    await this.sharing.share({ title: a.title, text: shareText(a), url: appLink(sharePath(a)) });
  }

  /** Nicht-Freund öffnet einen geteilten Link → Freundschaftsanfrage an den Ersteller. */
  async requestFriendFromLink(): Promise<void> {
    const code = this.inviteCode();
    if (!code) return;
    this.busy.set(true);
    try {
      const result = await this.data.requestFriend(code);
      this.requestMessage.set({
        text: friendRequestMessage(result, this.inviterName() ?? undefined),
        ok: isFriendRequestSuccess(result),
      });
      // Falls die Gegenseite schon angefragt hatte, sind wir jetzt Freunde → Aktivität laden
      if (result === 'accepted' || result === 'already_friends') await this.load();
      // Sonst alle 10 s nachschauen, ob die Anfrage angenommen wurde
      else if (isFriendRequestSuccess(result) || result === 'pending') this.startWaitingForFriend();
    } catch (e) {
      console.error(e);
      this.requestMessage.set({ text: 'Das hat nicht geklappt. Prüfe die Internetverbindung.', ok: false });
    } finally {
      this.busy.set(false);
    }
  }

  private startWaitingForFriend(): void {
    clearInterval(this.friendPoll);
    this.friendPoll = setInterval(async () => {
      await this.load();
      if (this.activity()) clearInterval(this.friendPoll);
    }, 10_000);
  }

  async join(): Promise<void> {
    await this.run(async () => {
      await this.data.join(this.id());
      this.metrics.activityJoined();
    }, 'Beitreten hat nicht geklappt.');
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
