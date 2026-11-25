/** Zeitfunktionen. Massgebend ist immer die Schweizer Zeit (Europe/Zurich). */
export const TIME_ZONE = 'Europe/Zurich';

const timeFormat = new Intl.DateTimeFormat('de-CH', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** «18:30» */
export function formatTime(date: Date): string {
  return timeFormat.format(date);
}

/** Kalendertag in Zürich als «2026-11-25». */
export function zurichDay(date: Date): string {
  return dayFormat.format(date);
}

/** Liegt das Datum am selben Kalendertag (Zürich) wie `now`? */
export function isToday(date: Date, now: Date = new Date()): boolean {
  return zurichDay(date) === zurichDay(now);
}

/** «in 25 Min.», «in 2 Std.», «jetzt», «seit 10 Min.» */
export function relativeStart(start: Date, now: Date = new Date()): string {
  const minutes = Math.round((start.getTime() - now.getTime()) / 60000);
  if (Math.abs(minutes) <= 2) return 'jetzt';
  if (minutes > 0) {
    if (minutes < 60) return `in ${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `in ${hours} Std.` : `in ${hours} Std. ${rest} Min.`;
  }
  const since = -minutes;
  if (since < 60) return `seit ${since} Min.`;
  return `seit ${Math.floor(since / 60)} Std.`;
}

const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Abweichung der Zürcher Zeit von UTC in Minuten (Winter +60, Sommer +120). */
export function zurichOffsetMinutes(date: Date): number {
  const parts = partsFormat.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** «18:30» → Zeitpunkt heute um 18:30 Zürcher Zeit, oder null bei ungültiger Eingabe. */
export function todayAt(time: string, now: Date = new Date()): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  const [y, m, d] = zurichDay(now).split('-').map(Number);
  const wallClockAsUtc = Date.UTC(y, m - 1, d, hours, minutes);
  let result = new Date(wallClockAsUtc - zurichOffsetMinutes(new Date(wallClockAsUtc)) * 60000);
  // An Tagen mit Zeitumstellung nochmals mit dem richtigen Offset rechnen
  result = new Date(wallClockAsUtc - zurichOffsetMinutes(result) * 60000);
  return result;
}

/**
 * Vorschlag für die Startzeit: in etwa 30 Minuten, auf die nächste Viertelstunde gerundet.
 * Spät am Abend höchstens 23:45 (Aktivitäten gelten nur für heute).
 */
export function suggestStart(now: Date = new Date()): Date {
  const quarter = 15 * 60000;
  const candidate = new Date(Math.ceil((now.getTime() + 30 * 60000) / quarter) * quarter);
  if (isToday(candidate, now)) return candidate;
  const latest = todayAt('23:45', now)!;
  return latest.getTime() > now.getTime() ? latest : now;
}

/** Sortiert nach Startzeit, früheste zuerst (neue Liste, Original bleibt unverändert). */
export function sortByStart<T extends { startsAt: Date }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
