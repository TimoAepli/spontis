import { Category, Visibility } from '../models';
import { todayAt } from './time';

/** Eingaben im Erstellen-Formular. */
export interface ActivityDraft {
  category: Category | null;
  title: string;
  /** «18:30» */
  time: string;
  lat: number | null;
  lng: number | null;
  placeName: string;
  minParticipants: number;
  visibility: Visibility;
}

export type DraftField = 'category' | 'title' | 'time' | 'place' | 'minParticipants';
export type DraftErrors = Partial<Record<DraftField, string>>;

export const MIN_PARTICIPANTS = 2;
export const MAX_PARTICIPANTS = 10;
/** So viele Minuten darf die Startzeit in der Vergangenheit liegen («wir sind schon dort»). */
export const PAST_TOLERANCE_MIN = 5;

/** Prüft das Formular. Leeres Objekt = alles in Ordnung. */
export function validateDraft(d: ActivityDraft, now: Date = new Date()): DraftErrors {
  const errors: DraftErrors = {};

  if (!d.category) errors.category = 'Wähle eine Kategorie.';

  const title = d.title.trim();
  if (title.length < 2) errors.title = 'Gib einen Titel ein (mind. 2 Zeichen).';
  else if (title.length > 60) errors.title = 'Höchstens 60 Zeichen.';

  const start = todayAt(d.time, now);
  if (!start) errors.time = 'Wähle eine Startzeit.';
  else if (start.getTime() < now.getTime() - PAST_TOLERANCE_MIN * 60000) {
    errors.time = 'Diese Zeit ist schon vorbei.';
  }

  if (d.lat === null || d.lng === null) errors.place = 'Setze den Treffpunkt auf der Karte oder suche einen Ort.';
  else if (!d.placeName.trim()) errors.place = 'Gib dem Treffpunkt einen Namen.';

  if (
    !Number.isInteger(d.minParticipants) ||
    d.minParticipants < MIN_PARTICIPANTS ||
    d.minParticipants > MAX_PARTICIPANTS
  ) {
    errors.minParticipants = `Zwischen ${MIN_PARTICIPANTS} und ${MAX_PARTICIPANTS} Personen.`;
  }

  return errors;
}

/** Hält die Mindestanzahl im erlaubten Bereich (für die Plus-/Minus-Knöpfe). */
export function clampParticipants(n: number): number {
  return Math.min(MAX_PARTICIPANTS, Math.max(MIN_PARTICIPANTS, Math.round(n)));
}
