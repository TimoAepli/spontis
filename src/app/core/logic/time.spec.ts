import { formatTime, isToday, relativeStart, sortByStart, suggestStart, todayAt } from './time';

describe('Zeit', () => {
  it('formatiert in Schweizer Zeit', () => {
    // 17:30 UTC = 18:30 in Zürich (Winterzeit)
    expect(formatTime(new Date('2026-11-25T17:30:00Z'))).toBe('18:30');
  });

  it('erkennt «heute» nach Zürcher Kalendertag, nicht nach UTC', () => {
    const now = new Date('2026-11-25T22:30:00Z'); // 23:30 in Zürich, 25.11.
    expect(isToday(new Date('2026-11-25T08:00:00Z'), now)).toBe(true);
    // 23:30 UTC = 00:30 am 26.11. in Zürich → nicht mehr heute
    expect(isToday(new Date('2026-11-25T23:30:00Z'), now)).toBe(false);
  });

  it('zeigt relative Startzeiten', () => {
    const now = new Date('2026-11-25T17:00:00Z');
    const plus = (min: number) => new Date(now.getTime() + min * 60000);
    expect(relativeStart(plus(1), now)).toBe('jetzt');
    expect(relativeStart(plus(25), now)).toBe('in 25 Min.');
    expect(relativeStart(plus(120), now)).toBe('in 2 Std.');
    expect(relativeStart(plus(90), now)).toBe('in 1 Std. 30 Min.');
    expect(relativeStart(plus(-10), now)).toBe('seit 10 Min.');
    expect(relativeStart(plus(-130), now)).toBe('seit 2 Std.');
  });

  it('rechnet «18:30 heute» in Schweizer Zeit um (Winter- und Sommerzeit)', () => {
    const winter = new Date('2026-11-25T09:00:00Z');
    expect(todayAt('18:30', winter)?.toISOString()).toBe('2026-11-25T17:30:00.000Z');
    const summer = new Date('2026-07-01T09:00:00Z');
    expect(todayAt('18:30', summer)?.toISOString()).toBe('2026-07-01T16:30:00.000Z');
    // kurz nach Mitternacht in Zürich ist in UTC noch der Vortag
    const lateNight = new Date('2026-11-25T23:30:00Z'); // 00:30 am 26.11. in Zürich
    expect(todayAt('09:00', lateNight)?.toISOString()).toBe('2026-11-26T08:00:00.000Z');
  });

  it('lehnt ungültige Zeiten ab', () => {
    expect(todayAt('')).toBeNull();
    expect(todayAt('25:00')).toBeNull();
    expect(todayAt('abc')).toBeNull();
  });

  it('schlägt eine Startzeit in etwa 30 Minuten vor (Viertelstunde)', () => {
    const now = new Date('2026-11-25T16:07:00Z'); // 17:07 Zürich
    expect(formatTime(suggestStart(now))).toBe('17:45');
    const late = new Date('2026-11-25T22:40:00Z'); // 23:40 Zürich
    expect(formatTime(suggestStart(late))).toBe('23:45');
  });

  it('sortiert nach Startzeit', () => {
    const a = { id: 'a', startsAt: new Date('2026-11-25T19:00:00Z') };
    const b = { id: 'b', startsAt: new Date('2026-11-25T12:00:00Z') };
    const c = { id: 'c', startsAt: new Date('2026-11-25T15:00:00Z') };
    expect(sortByStart([a, b, c]).map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
});
