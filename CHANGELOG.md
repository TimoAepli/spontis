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

### Erste Tests im Team (25.11.2026)

- **Rückmeldung aus Test:** Wer einen Link bekommt, muss sich zuerst registrieren, bevor er beitreten kann. Das hält Leute ab.
  **→ Anpassung:** Ein geteilter Link öffnet die Aktivität auch ohne Konto. Beitreten geht als **Gast** nur mit einem Anzeigenamen. Gäste können später im Profil einen Benutzernamen wählen.

- **Rückmeldung aus Test:** Das Konto geht verloren, wenn man den Browser löscht oder das Handy wechselt.
  **→ Anpassung:** Im Profil kann man unter «Konto sichern» E-Mail und Passwort hinterlegen. Neue Seite **«Anmelden»** (`/login`). Registrieren bleibt bei Benutzername und Anzeigename. «Vorname» heisst neu «Anzeigename».

- **Rückmeldung aus Test:** «Nur Freunde»-Aktivitäten lassen sich nicht in einen Gruppenchat teilen, weil dort nicht alle befreundet sind.
  **→ Anpassung:** Wer den Link hat, sieht die Aktivität und kann beitreten, auch ohne Freundschaft. In «Entdecken» erscheinen «Nur Freunde»-Aktivitäten weiterhin nur für Freunde. Wer beigetreten ist, sieht die Aktivität danach auch dort.

- **Rückmeldung aus Test:** Über einen Link kommen oft neue Leute dazu, aber man wird nicht automatisch befreundet.
  **→ Anpassung:** Wer angemeldet einen Link öffnet und mit dem Ersteller noch nicht befreundet ist, bekommt ein Pop-up «Mit Lea befreundet sein?» mit «Anfrage senden». Es erscheint pro Person einmal pro Sitzung.

- **Rückmeldung aus Test:** Das Abzeichen «Powered by Netlify» stört und wirkt unprofessionell.
  **→ Anpassung:** Hosting zu **Vercel** gewechselt (gratis, ohne Abzeichen). Neue Adresse: **https://spontis-sg.vercel.app**. Der Streifen für das Abzeichen ist entfernt, die App geht wieder bis zum unteren Rand.
