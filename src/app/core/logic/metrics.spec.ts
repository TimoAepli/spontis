import { formatDuration, median, MetricEntry, summarize, toCsv } from './metrics';

const entry = (type: MetricEntry['type'], ms: number, run: number): MetricEntry => ({
  type,
  ms,
  run,
  demo: false,
  at: '2026-12-03T10:00:00.000Z',
});

describe('Messung', () => {
  it('Median bei gerader und ungerader Anzahl', () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 20, 30, 40])).toBe(25);
    expect(median([])).toBe(0);
  });

  it('zählt pro Testlauf nur die erste erstellte Aktivität', () => {
    const s = summarize([
      entry('created', 40000, 1),
      entry('created', 90000, 1), // zweite Aktivität derselben Person → ignoriert
      entry('created', 60000, 2),
    ]).find((x) => x.type === 'created')!;
    expect(s.count).toBe(2);
    expect(s.medianMs).toBe(50000);
    expect(s.minMs).toBe(40000);
    expect(s.maxMs).toBe(60000);
  });

  it('Formular-Zeit zählt jede Erstellung', () => {
    const s = summarize([entry('create_form', 20000, 1), entry('create_form', 30000, 1)]).find(
      (x) => x.type === 'create_form',
    )!;
    expect(s.count).toBe(2);
  });

  it('leere Messung ergibt 0', () => {
    expect(summarize([]).every((s) => s.count === 0 && s.medianMs === 0)).toBe(true);
  });

  it('formatiert Sekunden und Minuten', () => {
    expect(formatDuration(8200)).toBe('8 s');
    expect(formatDuration(65000)).toBe('1 Min. 05 s');
  });

  it('CSV mit Semikolon und ohne persönliche Daten', () => {
    const csv = toCsv([entry('joined', 12345, 3)]);
    expect(csv).toBe('Lauf;Messpunkt;Sekunden;Demo;Zeitpunkt\n3;Öffnen → beigetreten;12.3;nein;2026-12-03T10:00:00.000Z');
  });
});
