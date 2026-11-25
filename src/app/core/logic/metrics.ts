/**
 * Messung für die Tests mit der Zielgruppe.
 * Gespeichert wird nur: welcher Messpunkt, wie lange (ms), welcher Testlauf, Demo ja/nein, Zeitpunkt.
 * KEINE Namen, IDs, Titel oder Orte.
 */
export type MetricType =
  /** Zeit vom Öffnen der App (bzw. Start des Testlaufs) bis zur ersten erstellten Aktivität */
  | 'created'
  /** Zeit vom Öffnen der App (bzw. Start des Testlaufs) bis zum ersten Beitritt */
  | 'joined'
  /** Zeit im Erstellen-Formular (Plus-Knopf bis «Aktivität erstellen») */
  | 'create_form';

export interface MetricEntry {
  type: MetricType;
  ms: number;
  /** Laufnummer: 1, 2, 3 … (eine pro Testperson, wenn ihr vor jedem Test «Neuer Testlauf» drückt) */
  run: number;
  demo: boolean;
  /** Zeitpunkt (ISO), nur zur Einordnung */
  at: string;
}

export const METRIC_LABELS: Record<MetricType, string> = {
  created: 'Öffnen → Aktivität erstellt',
  joined: 'Öffnen → beigetreten',
  create_form: 'Zeit im Erstellen-Formular',
};

export interface MetricSummary {
  type: MetricType;
  count: number;
  medianMs: number;
  minMs: number;
  maxMs: number;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Pro Messpunkt: Anzahl, Median, Minimum, Maximum.
 * Für «created» und «joined» zählt pro Testlauf nur das erste Mal
 * (sonst würde die zweite Aktivität einer Person die Zeit verfälschen).
 */
export function summarize(entries: readonly MetricEntry[]): MetricSummary[] {
  const types: MetricType[] = ['created', 'joined', 'create_form'];
  return types.map((type) => {
    let relevant = entries.filter((e) => e.type === type);
    if (type !== 'create_form') {
      const firstPerRun = new Map<number, MetricEntry>();
      for (const e of relevant) {
        const prev = firstPerRun.get(e.run);
        if (!prev || e.ms < prev.ms) firstPerRun.set(e.run, e);
      }
      relevant = [...firstPerRun.values()];
    }
    const values = relevant.map((e) => e.ms);
    return {
      type,
      count: values.length,
      medianMs: median(values),
      minMs: values.length ? Math.min(...values) : 0,
      maxMs: values.length ? Math.max(...values) : 0,
    };
  });
}

/** «8 s», «1 Min. 05 s» */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} Min. ${String(seconds).padStart(2, '0')} s`;
}

/** CSV für Excel (Semikolon, wie in der Schweiz üblich). */
export function toCsv(entries: readonly MetricEntry[]): string {
  const header = 'Lauf;Messpunkt;Sekunden;Demo;Zeitpunkt';
  const rows = entries.map((e) =>
    [e.run, METRIC_LABELS[e.type], (e.ms / 1000).toFixed(1), e.demo ? 'ja' : 'nein', e.at].join(';'),
  );
  return [header, ...rows].join('\n');
}
