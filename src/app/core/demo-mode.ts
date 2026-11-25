/**
 * Demo-Modus für die Pitch-Vorführung.
 *
 * Einschalten:  https://<app>/?demo=1   Ausschalten:  https://<app>/?demo=0
 * Der Zustand gilt für den aktuellen Browser-Tab (sessionStorage).
 *
 * Im Demo-Modus spricht die App NIE mit Supabase: Alle Daten kommen aus
 * DemoDataSource im Arbeitsspeicher. Demo- und echte Daten können sich
 * deshalb nicht vermischen. Neu laden = frische Beispieldaten.
 */
const KEY = 'spontis-demo';

/** Einmal beim Start (main.ts): liest ?demo=1 / ?demo=0 aus der Adresse. */
export function initDemoMode(search: string = location.search): boolean {
  const param = new URLSearchParams(search).get('demo');
  try {
    if (param === '1') sessionStorage.setItem(KEY, '1');
    if (param === '0') sessionStorage.removeItem(KEY);
  } catch {
    /* privater Modus ohne Speicher → kein Demo */
  }
  return isDemoMode();
}

export function isDemoMode(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

// Sofort beim Laden dieser Datei auswerten – noch bevor der Supabase-Client entsteht.
initDemoMode();

/** Demo beenden und die App mit echten Daten neu starten. */
export function leaveDemoMode(): void {
  location.href = '/?demo=0';
}
