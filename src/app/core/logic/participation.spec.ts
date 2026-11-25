import { missingHint, participation } from './participation';

describe('Zusagezähler', () => {
  it('zeigt den Stand als «x/y dabei»', () => {
    expect(participation(2, 4).label).toBe('2/4 dabei');
  });

  it('findet noch nicht statt, solange die Mindestanzahl fehlt', () => {
    const p = participation(3, 4);
    expect(p.isHappening).toBe(false);
    expect(p.missing).toBe(1);
    expect(p.ratio).toBe(0.75);
    expect(missingHint(p)).toBe('Noch 1 Person, dann findet es statt');
  });

  it('findet statt, sobald die Mindestanzahl genau erreicht ist', () => {
    const p = participation(4, 4);
    expect(p.isHappening).toBe(true);
    expect(p.missing).toBe(0);
    expect(p.ratio).toBe(1);
    expect(missingHint(p)).toBe('Findet statt');
  });

  it('Balken bleibt bei 100 %, auch wenn mehr als nötig dabei sind', () => {
    const p = participation(7, 4);
    expect(p.ratio).toBe(1);
    expect(p.label).toBe('7/4 dabei');
    expect(p.isHappening).toBe(true);
  });

  it('Ersteller allein zählt als 1', () => {
    const p = participation(1, 2);
    expect(p.isHappening).toBe(false);
    expect(missingHint(p)).toBe('Noch 1 Person, dann findet es statt');
    expect(missingHint(participation(1, 5))).toBe('Noch 4 Personen, dann findet es statt');
  });

  it('ist robust gegen ungültige Werte', () => {
    expect(participation(-1, 4).count).toBe(0);
    expect(participation(0, 0).ratio).toBe(0);
  });
});
