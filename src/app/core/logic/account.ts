/** Prüfregeln für «Konto sichern» und «Anmelden». */

export const MIN_PASSWORD_LENGTH = 8;

export function emailError(input: string): string | null {
  const email = input.trim();
  if (email.length === 0) return 'Bitte gib deine E-Mail-Adresse an.';
  // bewusst einfach: etwas@etwas.etwas
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Das sieht nicht nach einer E-Mail-Adresse aus.';
  return null;
}

export function passwordError(input: string): string | null {
  if (input.length === 0) return 'Bitte gib ein Passwort ein.';
  if (input.length < MIN_PASSWORD_LENGTH) return `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`;
  return null;
}
