import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { DataSource } from '../core/data/data-source';
import { MetricsService } from '../core/metrics.service';
import {
  ActivityDraft,
  clampParticipants,
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  validateDraft,
} from '../core/logic/activity-draft';
import { formatTime, isToday, suggestStart, todayAt } from '../core/logic/time';
import { defaultVisibility } from '../core/logic/visibility';
import { CATEGORIES, Category, Visibility } from '../core/models';
import { LocationPickerComponent, PickedLocation } from './location-picker.component';

/** Neue Aktivität für heute erstellen. */
@Component({
  selector: 'app-create',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonFooter,
    IonInput,
    IonButton,
    IonSpinner,
    LocationPickerComponent,
  ],
  templateUrl: './create.page.html',
  styleUrl: './create.page.scss',
})
export class CreatePage {
  private readonly data = inject(DataSource);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastController);
  private readonly metrics = inject(MetricsService);

  constructor() {
    this.metrics.formOpened();
  }

  readonly categories = Object.entries(CATEGORIES) as [Category, (typeof CATEGORIES)[Category]][];
  readonly minAllowed = MIN_PARTICIPANTS;
  readonly maxAllowed = MAX_PARTICIPANTS;

  // Formularwerte
  readonly category = signal<Category | null>(null);
  readonly title = signal('');
  readonly time = signal(formatTime(suggestStart()));
  readonly lat = signal<number | null>(null);
  readonly lng = signal<number | null>(null);
  readonly placeName = signal('');
  readonly minParticipants = signal(3);
  readonly visibility = signal<Visibility>('friends');
  /** Hat die Person die Sichtbarkeit selbst gewählt? Dann nicht mehr automatisch ändern. */
  private visibilityTouched = false;

  readonly submitted = signal(false);
  readonly busy = signal(false);

  readonly draft = computed<ActivityDraft>(() => ({
    category: this.category(),
    title: this.title(),
    time: this.time(),
    lat: this.lat(),
    lng: this.lng(),
    placeName: this.placeName(),
    minParticipants: this.minParticipants(),
    visibility: this.visibility(),
  }));
  readonly errors = computed(() => validateDraft(this.draft()));
  /** Fehler erst nach dem ersten Absenden anzeigen. */
  readonly shownErrors = computed(() => (this.submitted() ? this.errors() : {}));

  /** Schnellwahl für die Startzeit */
  readonly quickTimes = computed(() => {
    const now = new Date();
    const fiveMin = 5 * 60000;
    return [30, 60, 120]
      .map((min) => {
        // auf 5 Minuten aufgerundet, damit es «18:35» statt «18:33» heisst
        const t = new Date(Math.ceil((now.getTime() + min * 60000) / fiveMin) * fiveMin);
        return { label: min < 60 ? `in ${min} Min.` : `in ${min / 60} Std.`, value: formatTime(t), today: isToday(t, now) };
      })
      .filter((q) => q.today);
  });

  selectCategory(c: Category): void {
    this.category.set(c);
    if (!this.visibilityTouched) this.visibility.set(defaultVisibility(c));
  }

  selectVisibility(v: Visibility): void {
    this.visibilityTouched = true;
    this.visibility.set(v);
  }

  changeParticipants(delta: number): void {
    this.minParticipants.update((n) => clampParticipants(n + delta));
  }

  onPicked(loc: PickedLocation): void {
    this.lat.set(loc.lat);
    this.lng.set(loc.lng);
    if (loc.name) this.placeName.set(loc.name);
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    if (Object.keys(this.errors()).length > 0) {
      document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const d = this.draft();
    this.busy.set(true);
    try {
      const id = await this.data.createActivity({
        category: d.category!,
        title: d.title,
        startsAt: todayAt(d.time)!,
        lat: d.lat!,
        lng: d.lng!,
        placeName: d.placeName,
        minParticipants: d.minParticipants,
        visibility: d.visibility,
      });
      this.metrics.activityCreated();
      await this.router.navigate(['/a', id], { replaceUrl: true });
    } catch (e) {
      console.error('Erstellen fehlgeschlagen', e);
      const toast = await this.toasts.create({
        message: 'Speichern hat nicht geklappt. Prüfe die Internetverbindung.',
        duration: 3000,
        color: 'danger',
        position: 'top',
      });
      await toast.present();
    } finally {
      this.busy.set(false);
    }
  }
}
