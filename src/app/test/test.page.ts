import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { isDemoMode } from '../core/demo-mode';
import { formatDuration, METRIC_LABELS, summarize, toCsv } from '../core/logic/metrics';
import { MetricsService } from '../core/metrics.service';
import { ShareService } from '../core/share.service';

/**
 * Versteckte Testseite /test (nicht in der Navigation).
 * Zeigt die lokal gemessenen Zeiten dieses Geräts und erlaubt Export und neue Testläufe.
 */
@Component({
  selector: 'app-test',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonButton],
  templateUrl: './test.page.html',
  styleUrl: './test.page.scss',
})
export class TestPage implements OnDestroy {
  private readonly alerts = inject(AlertController);
  private readonly sharing = inject(ShareService);
  readonly metrics = inject(MetricsService);

  readonly labels = METRIC_LABELS;
  readonly format = formatDuration;
  readonly demo = isDemoMode();

  /** Demo-Probeläufe und echte Tests nicht mischen: nur Messungen aus dem aktuellen Modus auswerten. */
  readonly summary = computed(() => summarize(this.metrics.entries().filter((e) => e.demo === this.demo)));
  readonly recent = computed(() => [...this.metrics.entries()].reverse().slice(0, 30));
  readonly elapsed = signal(this.metrics.secondsSinceStart());
  private readonly clock = setInterval(() => this.elapsed.set(this.metrics.secondsSinceStart()), 1000);

  ngOnDestroy(): void {
    clearInterval(this.clock);
  }

  time(iso: string): string {
    return new Date(iso).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' });
  }

  newRun(): void {
    this.metrics.startNewRun();
    this.elapsed.set(0);
  }

  async copyCsv(): Promise<void> {
    await this.sharing.copy(toCsv(this.metrics.entries()), 'CSV kopiert – in Excel einfügen.');
  }

  async confirmClear(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Alle Messungen löschen?',
      message: 'Vorher als CSV kopieren, falls ihr sie noch braucht.',
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        { text: 'Löschen', role: 'destructive', handler: () => this.metrics.clear() },
      ],
    });
    await alert.present();
  }
}
