# spontis – Umsetzungsplan (Entwurf zur Freigabe)

Stand: 25.11.2026 · Ziel: testbereit am 02.12.2026

---

## 1. Stack-Check

Der vorgeschlagene Stack passt. Ionic 8 + Angular (Standalone), Supabase, Leaflet/OSM und Netlify bleiben so.
Vier Punkte, bei denen ich bewusst etwas anpasse oder ergänze:

| Punkt | Entscheid | Begründung |
|---|---|---|
| **Login nur mit Benutzername** (Entscheid Team, 25.11.) | Supabase «Anonymous Sign-In»: Beim ersten Öffnen wählt man einen eindeutigen Benutzernamen und gibt den Vornamen an – fertig. Kein Passwort, keine E-Mail. | Schnellste mögliche Registrierung, kein Mail-Versand. **Bewusster Kompromiss:** Das Konto hängt am Browser. Wird der Browser-Speicher gelöscht oder das Gerät gewechselt, ist das Konto weg. Auf dem iPhone ist eine Homescreen-PWA ein eigener Speicher, getrennt von Safari. Für Tests und Pitch ist das akzeptabel. |
| **Demo-Modus komplett lokal im Browser** | `?demo=1` lädt Beispieldaten aus dem App-Code, nichts wird in die Datenbank geschrieben. Die Spalte `is_demo` fällt weg. | Demo-Daten können so **technisch gar nicht** mit echten Daten gemischt werden. Zudem läuft die Pitch-Demo auch bei schlechtem WLAN, und simulierte Zusagen kommen exakt im richtigen Moment. |
| **Ortssuche: Nominatim (OpenStreetMap)** | Gratis, kein API-Key, auf die Schweiz bzw. Region St. Gallen eingeschränkt. | Passt zu Leaflet/OSM. Limite von 1 Anfrage/Sekunde ist für einen Prototyp kein Problem (Suche erst nach Tippen-Pause). |

«In der Nähe» definiere ich für den Prototyp einfach: alle «Alle in der Nähe»-Aktivitäten im Umkreis von 15 km um den eigenen Standort
(falls freigegeben, wird **nicht** gespeichert) bzw. um das Zentrum von St. Gallen. Die Distanz rechnet die App im Browser.

---

## 2. Projektstruktur

```
spontis/
├─ CLAUDE.md                 Stack, Befehle, Konventionen
├─ README.md                 Installation, Supabase-Setup, Deployment, Demo-Modus
├─ CHANGELOG.md              «Rückmeldung aus Test → Anpassung»
├─ netlify.toml              Build + SPA-Weiterleitung
├─ supabase/
│  ├─ migrations/            SQL-Migrationen (Schema, RLS, Funktionen)
│  └─ tests/rls_check.sql    Prüft: Nicht-Freunde sehen «Nur Freunde» nicht
└─ src/
   ├─ environments/          Supabase-URL + öffentlicher Anon-Key
   ├─ theme/variables.scss   Farben #0b6b5e / #ffc832, Schrift, Grössen
   └─ app/
      ├─ core/
      │  ├─ logic/           Reine Logik + Unit-Tests
      │  │                   (Zusagezähler, Sichtbarkeit, «heute», Distanz)
      │  ├─ data/            DataSource-Schnittstelle mit zwei Umsetzungen:
      │  │                   SupabaseDataSource (echt) und DemoDataSource (lokal)
      │  ├─ auth.service.ts, metrics.service.ts, share.service.ts, geocoding.service.ts
      ├─ auth/               Registrierung: Benutzername + Vorname
      ├─ tabs/               Tab-Leiste: Entdecken | (+) | Profil
      ├─ discover/           Liste/Karte umschaltbar, Aktivitäts-Karte
      ├─ create/             Erstellen-Formular, Ort wählen (Karte + Suche)
      ├─ activity/           Detail: Beitreten/Austreten, Zähler, Teilen
      ├─ profile/            Profil, Freunde, Einladungscode, Anfragen
      ├─ invite/             /f/:code – Freundschaftsanfrage per Link
      └─ test/               versteckte Testseite /test (Messwerte)
```

Wichtigster Architekturentscheid: Alle Seiten sprechen nur mit der **DataSource-Schnittstelle**.
Ob dahinter Supabase oder der Demo-Modus steckt, entscheidet sich einmal beim Start. Dadurch funktioniert jede Seite in beiden Modi gleich.

### Routen
| Route | Inhalt |
|---|---|
| `/willkommen` | Benutzername + Vorname wählen (erscheint nur ohne bestehendes Konto) |
| `/tabs/entdecken`, `/tabs/profil` | Haupt-Tabs |
| `/neu` | Erstellen (öffnet sich als Vollbild-Modal über dem Plus-Knopf) |
| `/a/:id?f=CODE` | Geteilte Aktivität. `f` = Einladungscode des Erstellers, damit Nicht-Freunde direkt eine Freundschaftsanfrage senden können |
| `/f/:code` | Einladungslink für Freunde |
| `/test` | Versteckte Testseite (nicht in der Navigation) |
| `?demo=1` / `?demo=0` | Demo-Modus ein/aus (bleibt für die Sitzung aktiv, gut sichtbares «DEMO»-Band) |

---

## 3. Datenbankschema mit RLS

Zeitzone für «heute»: `Europe/Zurich`.

```sql
-- Hilfsfunktion: Beginn des heutigen Tages in Zürich
create function today_start() returns timestamptz language sql stable as $$
  select (date_trunc('day', now() at time zone 'Europe/Zurich')) at time zone 'Europe/Zurich'
$$;

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),  -- klein geschrieben
  first_name  text not null check (char_length(trim(first_name)) between 1 and 40),
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_at  timestamptz not null default now()
);

create table friendships (
  user_id    uuid not null references profiles on delete cascade,  -- wer anfragt
  friend_id  uuid not null references profiles on delete cascade,  -- wer annimmt
  status     text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
-- verhindert doppelte Anfragen in beide Richtungen
create unique index friendships_pair on friendships (least(user_id, friend_id), greatest(user_id, friend_id));

create table activities (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid not null references profiles on delete cascade default auth.uid(),
  category         text not null check (category in ('sport','ausgang','essen','kultur','anderes')),
  title            text not null check (char_length(trim(title)) between 2 and 60),
  starts_at        timestamptz not null,
  lat              double precision not null check (lat between -90 and 90),
  lng              double precision not null check (lng between -180 and 180),
  place_name       text not null,
  min_participants int  not null check (min_participants between 2 and 10),
  visibility       text not null check (visibility in ('friends','nearby')),
  is_sponsored     boolean not null default false,
  created_at       timestamptz not null default now()
);

create table participants (
  activity_id uuid not null references activities on delete cascade,
  user_id     uuid not null references profiles on delete cascade default auth.uid(),
  joined_at   timestamptz not null default now(),
  primary key (activity_id, user_id)
);
```

### Funktionen (security definer, damit RLS sie nutzen kann)
- `are_friends(a, b)` → true, wenn eine **angenommene** Freundschaft besteht.
- `request_friend(code)` → sucht das Profil zum Einladungscode und legt eine Anfrage an (bzw. nimmt sie an, falls die Gegenseite schon angefragt hat).
- Trigger `on activity insert` → Ersteller wird automatisch als erster Teilnehmer eingetragen.

### RLS-Policies (auf allen vier Tabellen aktiviert)

| Tabelle | Lesen | Schreiben |
|---|---|---|
| `profiles` | alle eingeloggten (Benutzername, Vorname, Code – nötig für Zusageliste und Freunde) | nur eigenes Profil anlegen/ändern |
| `friendships` | nur eigene (als Anfragende oder Empfänger) | anlegen nur über `request_friend`; **annehmen nur durch Empfänger**; löschen durch beide |
| `activities` | **nur heute** UND (eigene ODER `nearby` ODER `are_friends(creator_id, auth.uid())`) | anlegen nur als sich selbst und nur für heute; ändern/löschen nur Ersteller |
| `participants` | nur, wenn die Aktivität selbst lesbar ist | beitreten nur sich selbst und nur bei lesbarer Aktivität; austreten nur sich selbst |

```sql
create policy "activities_read" on activities for select to authenticated using (
  starts_at >= today_start() and starts_at < today_start() + interval '1 day'
  and (creator_id = auth.uid() or visibility = 'nearby' or are_friends(creator_id, auth.uid()))
);
```

Damit gilt «Nur Freunde ist für Nicht-Freunde unsichtbar» **in der Datenbank selbst** – also auch, wenn jemand die API direkt mit dem öffentlichen Key abfragt.
Aktivitäten von gestern fallen automatisch aus allen Abfragen heraus.

Zusätzlich:
- View `activity_feed` (`security_invoker = true`, respektiert also RLS): Aktivität + Vorname Ersteller + Anzahl Zusagen + «bin ich dabei».
- Realtime für `participants` und `activities` aktiviert. Die App lädt bei jeder Änderung die betroffenen Zähler neu (einfach und robust).
- `supabase/tests/rls_check.sql`: simuliert im SQL-Editor drei Benutzer (Ersteller, Freund, Fremder) und prüft, dass der Fremde die «Nur Freunde»-Aktivität nicht sieht und nicht beitreten kann.

Gespeichert wird nur der **Treffpunkt** (`lat`, `lng`, `place_name`). Der eigene Standort wird nur im Browser für die Distanz verwendet und nie gesendet.

---

## 4. Reihenfolge und Zeitschätzung

Nach jedem Schritt läuft die App (`npm start`), und ich erkläre kurz, was neu ist.

| # | Schritt | Ergebnis | Zeit |
|---|---|---|---|
| 0 | Projekt aufsetzen | Ionic/Angular-PWA, Theme, Tab-Leiste mit Plus-Knopf (leere Seiten), `CLAUDE.md`, `README` (Gerüst), `CHANGELOG`, Git | 1.5 h |
| 1 | Datenbank | Migration mit Schema, RLS, Funktionen, View, Realtime; RLS-Prüfskript | 1.5 h |
| 2 | Registrierung | Benutzername (Prüfung «schon vergeben») + Vorname, anonymes Supabase-Konto, Weiterleitung | 1 h |
| 3 | Entdecken | Liste nach Startzeit + Karte (Leaflet), Karten mit «2/4 dabei» | 2 h |
| 4 | Erstellen | Formular, Kategorie-abhängige Sichtbarkeit, Pin auf Karte + Ortssuche, Validierung | 2 h |
| 5 | Beitreten & Echtzeit | Detailseite, Beitreten/Austreten, Fortschrittsbalken, «Findet statt», Vornamenliste, Realtime | 2 h |
| 6 | Freunde | Einladungscode/-link, Anfragen senden und annehmen, Freundesliste | 1.5 h |
| 7 | Teilen | Web Share API (Fallback: Link kopieren), Deep Link `/a/:id` öffnet direkt | 1 h |
| 8 | Unit-Tests | Zusagezähler, Sichtbarkeitsregeln, «heute»-Logik, Distanz | 1 h |
| 9 | Demo-Modus | Lokale Beispieldaten rund um St. Gallen, simulierte Zusagen, DEMO-Band | 1.5 h |
| 10 | Messung | Zeit vom Öffnen bis Erstellen/Beitreten lokal, Testseite `/test` mit Export | 1 h |
| 11 | Deployment | Netlify, öffentlicher Link, Test mit zwei Konten auf zwei Handys | 1 h |
| 12 | Doku | README fertig (Installation, Supabase-Setup, Deployment, Demo) | 0.5 h |
| | **Total Muss** | | **≈ 18 h** |
| (13) | Soll: Filter nach Kategorie | falls Zeit bleibt (vor 02.12 oder in der Verbesserungsphase) | 1 h |
| (14) | Soll: «Gesponsert»-Kennzeichnung | Spalte ist schon da, nur Anzeige | 0.5 h |

### Zeitplan bis zur Testbereitschaft
| Datum | Schritte |
|---|---|
| Mi 25.11. – Do 26.11. | 0, 1, 2 |
| Fr 27.11. – Sa 28.11. | 3, 4, 5 |
| So 29.11. – Mo 30.11. | 6, 7, 8, 9, 10 |
| Di 01.12. | 11, 12 – erster Test im Team auf echten Handys |
| Mi 02.12. | **Puffer / testbereit** |
| 03.–05.12. | Tests mit der Zielgruppe (Messwerte über `/test`) |
| 06.–07.12. | Verbesserungen, jede mit Eintrag im `CHANGELOG.md` |

---

## 5. Was ich von euch brauche

1. **Supabase-Projekt** (gratis) anlegen, Region Zürich/Frankfurt, und unter *Authentication → Sign In / Providers* **«Allow anonymous sign-ins»** einschalten. Mir danach **Project URL** und **anon public key** geben (der ist für den Browser gedacht und darf in den Code). Den `service_role`-Key braucht es nicht – bitte nicht weitergeben.
2. **Netlify-Konto** (gratis) für das Hosting – erst ab Schritt 11 nötig.
3. **Git/GitHub**: Soll ich ein Git-Repository anlegen? Für drei Personen empfehle ich ein gemeinsames GitHub-Repo, das Netlify direkt deployt.

## 6. Bewusst nicht im Prototyp

Chat, Bezahlung, Priorisierungs-Algorithmus, Push-Benachrichtigungen (laut Auftrag) – und zusätzlich: kein Profilbild, kein Bearbeiten von Aktivitäten (nur Löschen), keine Maximalanzahl Teilnehmende.
