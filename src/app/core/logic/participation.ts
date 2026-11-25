/**
 * Zusagezähler: Wie viele sind dabei, wie viele braucht es, findet es statt?
 * Die Mindestanzahl zählt den Ersteller mit (2–10).
 */
export interface Participation {
  count: number;
  min: number;
  /** Füllstand des Fortschrittsbalkens, 0 bis 1 (nie mehr als 1). */
  ratio: number;
  /** true, sobald die Mindestanzahl erreicht ist. */
  isHappening: boolean;
  /** Wie viele fehlen noch (0, wenn sie stattfindet). */
  missing: number;
  /** Text für die Anzeige, z. B. «2/4 dabei». */
  label: string;
}

export function participation(count: number, min: number): Participation {
  const safeCount = Math.max(0, Math.floor(count));
  const safeMin = Math.max(1, Math.floor(min));
  const isHappening = safeCount >= safeMin;
  return {
    count: safeCount,
    min: safeMin,
    ratio: Math.min(1, safeCount / safeMin),
    isHappening,
    missing: Math.max(0, safeMin - safeCount),
    label: `${safeCount}/${safeMin} dabei`,
  };
}

/** Kurzer Hinweis unter dem Balken, z. B. «Noch 2 Personen, dann findet es statt». */
export function missingHint(p: Participation): string {
  if (p.isHappening) return 'Findet statt';
  return p.missing === 1 ? 'Noch 1 Person, dann findet es statt' : `Noch ${p.missing} Personen, dann findet es statt`;
}
