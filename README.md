# spontis

Spontane Aktivitäten für heute: erstellen, auf Karte und Liste entdecken, mit einem Klick beitreten.
Testbarer Prototyp (PWA) im Modul M245, GBS St. Gallen.

> Dieses README wird mit jedem Schritt ergänzt. Fertig ist es nach Schritt 12 (siehe `PLAN.md`).

## Voraussetzungen
- Node.js 24 oder neuer (`node -v`)
- Ein Supabase-Projekt (gratis), siehe unten

## Installation
```powershell
npm install
npm start
```
Danach http://localhost:4200 öffnen. Für die Handy-Ansicht im Browser die Entwicklertools öffnen (F12) und die Geräteansicht wählen.

## Supabase einrichten

1. Auf [supabase.com](https://supabase.com) ein Gratis-Projekt anlegen (Region: Central EU / Zürich oder Frankfurt).
2. **Anonyme Anmeldung einschalten:** *Authentication → Sign In / Providers → «Allow anonymous sign-ins»* aktivieren.
   Zum Registrieren braucht spontis keine E-Mail: nur Benutzername und Anzeigename (Gäste: nur Anzeigename).
3. **Datenbank anlegen:** *SQL Editor → New query*, nacheinander den Inhalt dieser Dateien einfügen und jeweils **Run** klicken:
   1. `supabase/migrations/20261125090000_init.sql`
   2. `supabase/migrations/20261126090000_link_access_guests.sql` (Gäste und Link-Zugriff)

   Weitere Migrationen in `supabase/migrations/` immer in der Reihenfolge des Dateinamens ausführen.
4. **«Konto sichern» ermöglichen:** *Authentication → Sign In / Providers → Email*: «Enable Email provider» **an**, **«Confirm email» aus**.
   Grund: Der eingebaute Mailer von Supabase schickt nur wenige E-Mails pro Stunde. Ohne Bestätigung ist das Konto sofort gesichert.
   Wer «Confirm email» anlässt, bekommt beim Sichern eine Bestätigungs-Mail. Das funktioniert auch, ist aber langsamer.
5. **Sicherheit prüfen:** Im SQL Editor den Inhalt von `supabase/tests/rls_check.sql` ausführen.
   Erwartet wird die Zeile «Alle RLS-Prüfungen bestanden». Das Skript hinterlässt keine Daten.
6. **Schlüssel eintragen:** *Project Settings → API* öffnen und **Project URL** sowie den
   **anon public key** in `src/environments/environment.ts` eintragen.
   Der anon key ist für den Browser gedacht. Den `service_role`-Key nie in die App oder ins Git kopieren.

### Was die Datenbank absichert (Row Level Security)
| Regel | Umsetzung |
|---|---|
| «Nur Freunde»-Aktivitäten erscheinen in «Entdecken» nur für Freunde | Policy `activities_select` mit `are_friends()` |
| Wer den Link hat, sieht die Aktivität und kann beitreten (auch ohne Konto als Gast) | Funktionen `activity_by_link()`, `participants_by_link()`, Policy `participants_insert` |
| Aktivitäten verschwinden nach Ende des Tages | `activities_select` zeigt nur `starts_at` von heute (Zeitzone Zürich) |
| Beitreten nur zu Aktivitäten von heute, nur für sich selbst | Policy `participants_insert` |
| Freundschaft nur über Einladungscode, annehmen nur durch Empfänger | Funktion `request_friend()`, Policy `friendships_accept` |
| «Gesponsert» kann die App nicht selbst setzen | Spaltenrechte auf `activities` |
| Ohne Anmeldung nur die Link-Vorschau, kein Beitreten und keine Listen | Rechte für die Rolle `anon` entzogen |

Hinweis: Supabase pausiert Gratis-Projekte nach 7 Tagen ohne Aktivität. Vor Tests und Pitch das Dashboard öffnen und das Projekt bei Bedarf wieder starten.

## Deployment (Vercel)

Die PWA läuft gratis auf Vercel: **https://spontis-sg.vercel.app**
Die Einstellungen stehen in `vercel.json`: Build mit `npm run build`, veröffentlicht wird `dist/spontis/browser`. Alle Pfade wie `/a/…`, `/f/…` oder `/login` führen auf die App.

**Erstes Mal** (einmalig, im Projektordner):
```powershell
npx vercel login
```
```powershell
npx vercel link --yes --project spontis-sg
```

**Neue Version veröffentlichen** (Vercel baut selbst):
```powershell
npx vercel deploy --prod --yes
```

- Geöffnete Apps laden die neue Version beim nächsten Start automatisch (Service Worker + Update-Prüfung).
- Ein Gratis-Supabase-Projekt pausiert nach 7 Tagen ohne Nutzung. Vor Tests und Pitch das Dashboard öffnen.
- Optional: Mit `npx vercel git connect` veröffentlicht Vercel bei jedem Push auf GitHub automatisch.
- Früher lief die App auf Netlify. Dort blendet der Gratis-Plan ein Pflicht-Abzeichen «Powered by Netlify» ein, darum der Wechsel.

### Auf dem Handy installieren
- **Android (Chrome):** Link öffnen → Menü ⋮ → «App installieren» bzw. «Zum Startbildschirm hinzufügen».
- **iPhone (Safari):** Link öffnen → Teilen-Symbol → «Zum Home-Bildschirm».
  Achtung: Die Homescreen-App hat auf dem iPhone ein eigenes Konto, getrennt von Safari. Registriert euch am besten direkt in der installierten App.

## Demo-Modus

Für die Pitch-Vorführung ohne echte Nutzerinnen und Nutzer.

| Aktion | Adresse |
|---|---|
| Demo einschalten | `https://<eure-app>/?demo=1` |
| Demo ausschalten | `https://<eure-app>/?demo=0` oder im Profil «Demo beenden» |

- Man ist automatisch **Lena (@lena_sg)** und hat Freunde (Jonas, Sara, Luca, Nina, Mia) sowie eine offene Anfrage von Ben.
- **7 Beispiel-Aktivitäten** rund um St. Gallen (Marktplatz, Drei Weieren, Kreuzbleiche, Gallusplatz, Kletterhalle, Palace, Linsebühl). Die Zeiten werden beim Laden relativ zu «jetzt» berechnet und passen deshalb zu jeder Tageszeit.
- **Simulierte Zusagen:** Erstellt man eine Aktivität oder tritt einer bei, kommen etwa alle 4 Sekunden weitere Zusagen dazu, bis «Findet statt» erreicht ist.
- Unten links steht immer **«DEMO · Beispieldaten»**.
- **Nie vermischt:** Im Demo-Modus spricht die App gar nicht mit Supabase. Alle Daten liegen nur im Arbeitsspeicher, alle IDs beginnen mit `demo-`. Neu laden setzt alles zurück.
- Der Modus gilt pro Browser-Tab. Die Kartenbilder und die Ortssuche brauchen Internet. Ohne Ortssuche: einfach auf die Karte tippen.

### Ablauf für die 2-Minuten-Vorführung

1. **Vorher:** `…/?demo=1` auf dem Demo-Handy öffnen, einmal neu laden (frische Daten), Bildschirm spiegeln.
2. **Problem zeigen (15 s):** «Im Gruppenchat fragt jemand: Wer kommt heute Volleyball? – keine Antwort.»
3. **Entdecken (20 s):** Liste zeigen («Zmittag Thai» ist gelb: *Findet statt*), auf **Karte** wechseln.
4. **Beitreten (20 s):** «Volleyball auf der Kreuzbleiche» (4/6) öffnen → **Ich bin dabei** → 5/6 → wenige Sekunden später 6/6, gelb: **Findet statt**.
5. **Erstellen (45 s):** Plus-Knopf → Essen → «Pizza am Marktplatz» → Schnellwahl «in 1 Std.» → Ort suchen oder auf die Karte tippen → Mindestanzahl 3 → **Aktivität erstellen**. Jonas und Sara sagen live zu → **Findet statt**.
6. **Teilen (10 s):** «In den Gruppenchat teilen» zeigen: Der Gruppenchat bleibt, spontis zeigt, wer wirklich mitkommt.
7. **Reserve:** Profil → Bens Anfrage annehmen, Einladungscode zeigen.

## Messung bei den Tests mit der Zielgruppe

Die App misst lokal auf dem Handy, wie schnell Testpersonen ans Ziel kommen. Die Daten verlassen das Gerät nicht und enthalten **keine persönlichen Angaben** (keine Namen, Orte oder Titel).

| Messpunkt | Bedeutung |
|---|---|
| Öffnen → Aktivität erstellt | Zeit vom Öffnen der App bzw. «Neuer Testlauf» bis zur ersten erstellten Aktivität |
| Öffnen → beigetreten | Zeit bis zum ersten Beitritt |
| Zeit im Erstellen-Formular | Plus-Knopf bis «Aktivität erstellen» |

**So läuft ein Test:**
1. Auf dem Test-Handy die versteckte Seite `https://<eure-app>/test` öffnen.
2. **«Neuer Testlauf (nächste Testperson)»** drücken. Die Uhr startet bei 0, und die Laufnummer zählt hoch.
3. Auf «App» tippen und das Handy übergeben, zum Beispiel mit dem Auftrag «Erstelle eine Aktivität für heute Abend» oder «Tritt einer Sport-Aktivität bei».
4. Danach zeigt `/test` Median, Minimum und Maximum. **«Als CSV kopieren»** fügt die Werte in Excel ein, für die Präsentationsmappe.

Die Messungen bleiben auf dem Gerät gespeichert, bis ihr sie auf `/test` löscht. Demo-Messungen werden getrennt ausgewertet.

## Tests
```powershell
npx ng test --watch=false
```
