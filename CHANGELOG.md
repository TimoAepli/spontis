# Changelog – spontis

Hier steht jede Änderung am Prototyp mit Grund.
Ab den Tests mit der Zielgruppe (03.–05.12.2026) gilt das Format:

> **Rückmeldung aus Test → Anpassung**

## Entscheide vor den Tests

### 25.11.2026
- **Login nur mit Benutzername statt E-Mail (Magic Link)**
  Entscheid im Team → Registrierung mit eindeutigem Benutzernamen und Vorname, ohne E-Mail und ohne Passwort (Supabase «Anonymous Sign-In»).
  Grund: möglichst schneller Einstieg für Testpersonen, kein E-Mail-Versand nötig.
  Kompromiss: Das Konto ist an den Browser gebunden.
- **Demo-Modus lokal statt in der Datenbank**
  Beispieldaten kommen aus dem App-Code und werden nie in Supabase gespeichert.
  Grund: Demo- und echte Daten können so nicht vermischt werden, und die Pitch-Demo funktioniert auch mit schlechtem WLAN.
- **Ionic 8 mit Angular 21, Node 24 oder neuer**
  Grund: Ionic 8 entspricht dem Auftrag, Angular 21 ist die neueste Version, die Ionic 8 sicher unterstützt.
  Node wurde auf 26 aktualisiert, weil npm 10.5 beim Installieren abstürzte.

- **Veröffentlicht auf https://spontis-sg.netlify.app**
  Netlify-Team-Login für diese Website ausgeschaltet, damit Testpersonen die App ohne Konto öffnen können.
  Das Abzeichen «Powered by Netlify» ist im Gratis-Plan Pflicht. Es bekommt einen eigenen Streifen unter der App, damit es keine Knöpfe verdeckt.

## Nach den Tests

_(folgt ab 05.12.2026)_
