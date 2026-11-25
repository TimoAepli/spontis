# spontis – Hinweise für Claude Code und das Team

Testbarer Handy-Prototyp (PWA) für spontane Aktivitäten in St. Gallen. Modul M245, GBS St. Gallen.
Ziel ist ein **testbarer Prototyp**, kein Produkt: immer die einfachste Lösung wählen, die funktioniert.
Plan und Zeitplan: `PLAN.md`. Änderungen mit Grund: `CHANGELOG.md`.

## Stack
- Angular 21 (Standalone Components, Signals, Zone.js) + Ionic 8 (`@ionic/angular/standalone`), Modus `ios` für alle Geräte
- PWA über `@angular/service-worker` (nur im Production-Build aktiv), Manifest in `public/manifest.webmanifest`
- Supabase (`@supabase/supabase-js`): Anonymous Sign-In, PostgreSQL mit RLS, Realtime
- Karte: Leaflet + OpenStreetMap-Kacheln, Ortssuche über Nominatim
- Unit-Tests: Vitest über `ng test` (Konfiguration in `vitest.config.ts`)
- Hosting: Netlify (`netlify.toml`)
- Node 24 oder neuer

## Befehle
| Befehl | Zweck |
|---|---|
| `npm install` | Abhängigkeiten installieren |
| `npm start` | Entwicklungsserver auf http://localhost:4200 |
| `npm run build` | Production-Build nach `dist/spontis/browser` |
| `npx ng test --watch=false` | Unit-Tests einmal ausführen |
| `npx netlify-cli deploy --prod --dir dist/spontis/browser` | Nach `npm run build`: veröffentlichen auf https://spontis-sg.netlify.app |

Öffentliche Adresse: https://spontis-sg.netlify.app · Demo: `/?demo=1` · Testseite: `/test`

## Ordner
- `src/app/core/logic/` – reine Logik ohne Angular (Zusagezähler, Sichtbarkeit, «heute», Distanz). Hier gehören die Unit-Tests hin.
- `src/app/core/data/` – `DataSource`-Schnittstelle mit `SupabaseDataSource` und `DemoDataSource`. Seiten greifen **nie** direkt auf Supabase zu.
- `src/app/<feature>/` – eine Seite pro Ordner (`discover`, `create`, `activity`, `profile`, `auth`, `tabs`, `test`)
- `src/theme/variables.scss` – Farben; `src/styles.scss` – globale Stile
- `supabase/migrations/` – SQL-Migrationen, Dateiname `YYYYMMDDHHMMSS_beschreibung.sql`

## Konventionen
- Alle sichtbaren Texte auf Deutsch (Schweiz): «ss» statt «ß», Anführungszeichen « ».
- Routen und Ordner auf Deutsch, wo der Nutzer sie sieht (`/tabs/entdecken`, `/neu`, `/a/:id`), Code-Bezeichner auf Englisch.
- Farben nur über CSS-Variablen: `--ion-color-primary` (#0b6b5e), `--ion-color-warning` (#ffc832, «Findet statt»), `--sp-*`.
- Touch-Ziele mindestens 48 px.
- Ionic-Komponenten einzeln aus `@ionic/angular/standalone` importieren, Icons mit `addIcons()` registrieren.
- Zustand mit Angular Signals; keine zusätzliche State-Library.
- Sicherheit liegt in der Datenbank (RLS), nicht im Client. Jede neue Tabelle bekommt RLS-Policies.
- Nie den Live-Standort speichern, nur den Treffpunkt einer Aktivität.
- Demo-Daten nie in Supabase schreiben (Demo-Modus ist rein lokal).
- Nach jeder Anpassung infolge eines Tests einen Eintrag in `CHANGELOG.md`: «Rückmeldung aus Test → Anpassung».
- Nicht umsetzen: Chat, Bezahlung, Priorisierungs-Algorithmus, Push-Benachrichtigungen.
