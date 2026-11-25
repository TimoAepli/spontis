import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { DataSource } from '../core/data/data-source';
import { ST_GALLEN } from '../core/logic/geo';
import { sortByStart } from '../core/logic/time';
import { isInDiscoverRange } from '../core/logic/visibility';
import { Activity } from '../core/models';
import { ActivityCardComponent } from './activity-card.component';
import { ActivityMapComponent } from './activity-map.component';

type View = 'liste' | 'karte';

/** Entdecken: Aktivitäten von heute als Liste oder auf der Karte. */
@Component({
  selector: 'app-discover',
  imports: [
    IonHeader,
    IonToolbar,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    ActivityCardComponent,
    ActivityMapComponent,
  ],
  templateUrl: './discover.page.html',
  styleUrl: './discover.page.scss',
})
export class DiscoverPage implements ViewWillEnter, OnDestroy {
  private readonly data = inject(DataSource);

  readonly view = signal<View>('liste');
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly now = signal(new Date());
  private readonly all = signal<Activity[]>([]);

  /** Nach Startzeit sortiert; «Alle in der Nähe» nur im Umkreis von St. Gallen. */
  readonly activities = computed(() =>
    sortByStart(this.all().filter((a) => isInDiscoverRange(a, ST_GALLEN))),
  );

  // «in 25 Min.» jede Minute aktualisieren
  private readonly clock = setInterval(() => this.now.set(new Date()), 60_000);

  private firstLoadDone = false;

  private reloadTimer?: ReturnType<typeof setTimeout>;
  /** Echtzeit: Zusagen und neue Aktivitäten erscheinen ohne Neuladen. */
  private readonly unwatch = this.data.watch(() => {
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => void this.load(), 400);
  });

  constructor() {
    // Sofort laden, nicht erst nach der Seiten-Animation von Ionic.
    void this.load();
  }

  /** Beim Zurückkehren auf den Tab (z. B. nach dem Erstellen) neu laden. */
  ionViewWillEnter(): void {
    if (this.firstLoadDone) void this.load();
  }

  ngOnDestroy(): void {
    clearInterval(this.clock);
    clearTimeout(this.reloadTimer);
    this.unwatch();
  }

  async load(): Promise<void> {
    this.error.set(false);
    try {
      this.all.set(await this.data.listToday());
    } catch (e) {
      console.error('Aktivitäten laden fehlgeschlagen', e);
      this.error.set(true);
    } finally {
      this.loading.set(false);
      this.firstLoadDone = true;
      this.now.set(new Date());
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    (event.target as HTMLIonRefresherElement).complete();
  }

  setView(value: unknown): void {
    if (value === 'liste' || value === 'karte') this.view.set(value);
  }
}
