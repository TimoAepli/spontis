import { Injectable, signal } from '@angular/core';
import { isDemoMode } from './demo-mode';
import { MetricEntry, MetricType } from './logic/metrics';

const STORAGE_KEY = 'spontis-metrics';
const RUN_KEY = 'spontis-metrics-run';
const MAX_ENTRIES = 1000;

/**
 * Misst lokal im Browser, wie lange Testpersonen brauchen.
 * Die Daten verlassen das Gerät nie (nur localStorage) und enthalten keine persönlichen Angaben.
 * Auswertung auf der versteckten Seite /test.
 */
@Injectable({ providedIn: 'root' })
export class MetricsService {
  /** Startzeitpunkt der Messung: Öffnen der App oder «Neuer Testlauf». */
  private startedAt = Math.round(performance.timeOrigin);
  private formOpenedAt: number | null = null;
  private readonly recordedThisRun = new Set<MetricType>();

  readonly entries = signal<MetricEntry[]>(this.read());
  readonly run = signal<number>(this.readRun());

  /** Erstellen-Formular wurde geöffnet. */
  formOpened(): void {
    this.formOpenedAt = Date.now();
  }

  /** Aktivität wurde erstellt. */
  activityCreated(): void {
    const now = Date.now();
    if (this.formOpenedAt !== null) {
      this.add('create_form', now - this.formOpenedAt);
      this.formOpenedAt = null;
    }
    this.addOncePerRun('created', now - this.startedAt);
  }

  /** Einer Aktivität beigetreten. */
  activityJoined(): void {
    this.addOncePerRun('joined', Date.now() - this.startedAt);
  }

  /** Vor jeder neuen Testperson: Zeit neu starten und Laufnummer erhöhen. */
  startNewRun(): void {
    const next = this.run() + 1;
    this.run.set(next);
    localStorage.setItem(RUN_KEY, String(next));
    this.startedAt = Date.now();
    this.formOpenedAt = null;
    this.recordedThisRun.clear();
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(RUN_KEY, '1');
    this.entries.set([]);
    this.run.set(1);
    this.startedAt = Date.now();
    this.recordedThisRun.clear();
  }

  /** Sekunden seit Start der Messung (für die Testseite). */
  secondsSinceStart(): number {
    return Math.round((Date.now() - this.startedAt) / 1000);
  }

  // ---------- intern ----------

  /** «Öffnen → …» nur beim ersten Mal pro Testlauf bzw. App-Start messen. */
  private addOncePerRun(type: MetricType, ms: number): void {
    if (this.recordedThisRun.has(type)) return;
    this.recordedThisRun.add(type);
    this.add(type, ms);
  }

  private add(type: MetricType, ms: number): void {
    const entry: MetricEntry = {
      type,
      ms: Math.max(0, Math.round(ms)),
      run: this.run(),
      demo: isDemoMode(),
      at: new Date().toISOString(),
    };
    const next = [...this.entries(), entry].slice(-MAX_ENTRIES);
    this.entries.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* Speicher voll oder privat → Messung nur für diese Sitzung */
    }
  }

  private read(): MetricEntry[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as MetricEntry[];
    } catch {
      return [];
    }
  }

  private readRun(): number {
    const n = Number(localStorage.getItem(RUN_KEY));
    return Number.isInteger(n) && n > 0 ? n : 1;
  }
}
