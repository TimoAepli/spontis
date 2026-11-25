/**
 * Regeln für Benutzernamen – identisch mit der Prüfung in der Datenbank:
 * 3–20 Zeichen, nur Kleinbuchstaben a–z, Ziffern, Punkt und Unterstrich.
 */
export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

/** Macht aus der Eingabe einen gültigen Kandidaten: klein, ohne Leerzeichen, Umlaute ersetzt. */
export function normalizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/\s+/g, '_');
}

/** Gibt eine Fehlermeldung auf Deutsch zurück oder null, wenn der Name gültig ist. */
export function usernameError(input: string): string | null {
  const name = normalizeUsername(input);
  if (name.length === 0) return 'Bitte wähle einen Benutzernamen.';
  if (name.length < 3) return 'Mindestens 3 Zeichen.';
  if (name.length > 20) return 'Höchstens 20 Zeichen.';
  if (!USERNAME_PATTERN.test(name)) return 'Nur Buchstaben a–z, Zahlen, Punkt und _.';
  return null;
}

/** Gibt eine Fehlermeldung auf Deutsch zurück oder null, wenn der Vorname gültig ist. */
export function firstNameError(input: string): string | null {
  const name = input.trim();
  if (name.length === 0) return 'Bitte gib deinen Vornamen an.';
  if (name.length > 40) return 'Höchstens 40 Zeichen.';
  return null;
}
