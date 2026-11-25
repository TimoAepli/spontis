-- =====================================================================
-- spontis – RLS-Prüfung
--
-- Ausführen: Supabase Dashboard → SQL Editor → ganzen Inhalt einfügen → Run.
-- Das Skript legt drei Testpersonen an, prüft die Regeln und macht am Ende
-- alles rückgängig (rollback). Es bleiben keine Testdaten zurück.
--
--   Anna (a1) – erstellt die Aktivitäten
--   Ben  (a2) – Freund von Anna
--   Cem  (a3) – kein Freund von Anna
--   Dora (a4) – Gast ohne Benutzername, öffnet einen geteilten Link
--
-- Ergebnis: Bei Erfolg erscheint «Alle RLS-Prüfungen bestanden».
-- Sonst bricht das Skript mit einer Meldung «FEHLER: …» ab.
-- =====================================================================

begin;

-- ---------- Testdaten (als Administrator) ----------
insert into auth.users (id, aud, role, is_anonymous, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', true, now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', true, now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated', true, now(), now()),
  ('00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated', true, now(), now());

insert into public.profiles (id, username, first_name, invite_code) values
  ('00000000-0000-0000-0000-0000000000a1', 'rlstest_anna', 'Anna', 'TANNA1'),
  ('00000000-0000-0000-0000-0000000000a2', 'rlstest_ben',  'Ben',  'TBEN02'),
  ('00000000-0000-0000-0000-0000000000a3', 'rlstest_cem',  'Cem',  'TCEM03');

insert into public.friendships (user_id, friend_id, status) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', 'accepted');

insert into public.activities
  (id, creator_id, category, title, starts_at, lat, lng, place_name, min_participants, visibility)
values
  -- b1: «Nur Freunde», heute
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1',
   'essen', 'Pizza nur Freunde', public.today_start() + interval '20 hours',
   47.4245, 9.3767, 'Marktplatz', 3, 'friends'),
  -- b2: «Alle in der Nähe», heute
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1',
   'sport', 'Volleyball offen', public.today_start() + interval '18 hours',
   47.4300, 9.3800, 'Kreuzbleiche', 4, 'nearby'),
  -- b3: «Alle in der Nähe», aber gestern
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a1',
   'kultur', 'Gestern vorbei', public.today_start() - interval '4 hours',
   47.4230, 9.3700, 'Stiftsbezirk', 2, 'nearby');


-- ---------- Cem (kein Freund) ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';

do $$
declare n int;
begin
  if exists (select 1 from public.activities where id = '00000000-0000-0000-0000-0000000000b1') then
    raise exception 'FEHLER: Nicht-Freund sieht «Nur Freunde»-Aktivität (activities)';
  end if;
  if exists (select 1 from public.activity_feed where id = '00000000-0000-0000-0000-0000000000b1') then
    raise exception 'FEHLER: Nicht-Freund sieht «Nur Freunde»-Aktivität (activity_feed)';
  end if;
  if exists (select 1 from public.participants where activity_id = '00000000-0000-0000-0000-0000000000b1') then
    raise exception 'FEHLER: Nicht-Freund sieht Zusagen einer «Nur Freunde»-Aktivität';
  end if;
  if not exists (select 1 from public.activity_feed where id = '00000000-0000-0000-0000-0000000000b2') then
    raise exception 'FEHLER: «Alle in der Nähe»-Aktivität ist nicht sichtbar';
  end if;
  if exists (select 1 from public.activities where id = '00000000-0000-0000-0000-0000000000b3') then
    raise exception 'FEHLER: Aktivität von gestern ist noch sichtbar';
  end if;

  -- (Beitreten per Link zu «Nur Freunde» ist seit der 2. Migration erlaubt → siehe Dora unten)

  -- Für eine andere Person beitreten muss scheitern
  begin
    insert into public.participants (activity_id, user_id)
    values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2');
    raise exception 'FEHLER: Man kann eine andere Person eintragen';
  exception when insufficient_privilege then null;
  end;

  -- Freundschaft direkt eintragen (statt über request_friend) muss scheitern
  begin
    insert into public.friendships (user_id, friend_id, status)
    values ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', 'accepted');
    raise exception 'FEHLER: Freundschaft konnte direkt als angenommen eingetragen werden';
  exception when insufficient_privilege then null;
  end;

  -- Gesponsert selbst setzen muss scheitern
  begin
    insert into public.activities (category, title, starts_at, lat, lng, place_name, min_participants, visibility, is_sponsored)
    values ('sport', 'Fake Sponsor', now(), 47.42, 9.37, 'Test', 2, 'nearby', true);
    raise exception 'FEHLER: is_sponsored kann von der App gesetzt werden';
  exception when insufficient_privilege then null;
  end;

  -- Aktivität für morgen erstellen muss scheitern
  begin
    insert into public.activities (category, title, starts_at, lat, lng, place_name, min_participants, visibility)
    values ('sport', 'Morgen', public.today_start() + interval '1 day 10 hours', 47.42, 9.37, 'Test', 2, 'nearby');
    raise exception 'FEHLER: Aktivität für morgen konnte erstellt werden';
  exception when insufficient_privilege then null;
  end;

  -- Fremde Aktivität löschen: darf nichts bewirken
  delete from public.activities where id = '00000000-0000-0000-0000-0000000000b2';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FEHLER: Fremde Aktivität konnte gelöscht werden'; end if;

  -- Beitreten zu «Alle in der Nähe» muss klappen
  insert into public.participants (activity_id) values ('00000000-0000-0000-0000-0000000000b2');

  -- Freundschaftsanfrage an Anna senden
  if public.request_friend('tanna1') <> 'requested' then
    raise exception 'FEHLER: Freundschaftsanfrage per Code klappt nicht';
  end if;

  -- Eigene Anfrage selbst annehmen muss wirkungslos sein
  update public.friendships set status = 'accepted'
  where user_id = '00000000-0000-0000-0000-0000000000a3';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FEHLER: Man kann die eigene Anfrage selbst annehmen'; end if;

  if exists (select 1 from public.activities where id = '00000000-0000-0000-0000-0000000000b1') then
    raise exception 'FEHLER: Offene (nicht angenommene) Anfrage gibt schon Zugriff';
  end if;
end $$;


-- ---------- Ben (Freund) ----------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';

do $$
declare c int;
begin
  if not exists (select 1 from public.activity_feed where id = '00000000-0000-0000-0000-0000000000b1') then
    raise exception 'FEHLER: Freund sieht «Nur Freunde»-Aktivität nicht';
  end if;

  insert into public.participants (activity_id) values ('00000000-0000-0000-0000-0000000000b1');

  select participant_count into c from public.activity_feed where id = '00000000-0000-0000-0000-0000000000b1';
  if c <> 2 then raise exception 'FEHLER: Zusagezähler stimmt nicht (erwartet 2, ist %)', c; end if;

  if not (select is_joined from public.activity_feed where id = '00000000-0000-0000-0000-0000000000b1') then
    raise exception 'FEHLER: is_joined ist falsch';
  end if;

  -- Ben sieht die Anfrage zwischen Cem und Anna nicht
  if exists (select 1 from public.friendships where user_id = '00000000-0000-0000-0000-0000000000a3') then
    raise exception 'FEHLER: Fremde Freundschaftsanfragen sind sichtbar';
  end if;

  -- Austreten
  delete from public.participants where activity_id = '00000000-0000-0000-0000-0000000000b1';
  select participant_count into c from public.activity_feed where id = '00000000-0000-0000-0000-0000000000b1';
  if c <> 1 then raise exception 'FEHLER: Austreten hat nicht funktioniert'; end if;
end $$;


-- ---------- Anna nimmt Cems Anfrage an ----------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

do $$
declare n int;
begin
  update public.friendships set status = 'accepted'
  where user_id = '00000000-0000-0000-0000-0000000000a3' and friend_id = '00000000-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FEHLER: Empfängerin kann Anfrage nicht annehmen'; end if;
end $$;


-- ---------- Cem ist jetzt Freund ----------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';

do $$
begin
  if not exists (select 1 from public.activity_feed where id = '00000000-0000-0000-0000-0000000000b1') then
    raise exception 'FEHLER: Nach angenommener Anfrage ist «Nur Freunde»-Aktivität nicht sichtbar';
  end if;
end $$;


-- ---------- Dora: Gast öffnet geteilten Link einer «Nur Freunde»-Aktivität ----------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}';

do $$
declare n int;
begin
  -- Gast-Profil nur mit Anzeigename (ohne Benutzername)
  insert into public.profiles (first_name) values ('Dora');

  -- In der Liste erscheint «Nur Freunde» weiterhin nicht
  if exists (select 1 from public.activity_feed where id = '00000000-0000-0000-0000-0000000000b1') then
    raise exception 'FEHLER: «Nur Freunde» erscheint ohne Freundschaft in der Liste';
  end if;

  -- Über den Link ist sie sichtbar, inkl. Anzeigenamen
  select count(*) into n from public.activity_by_link('00000000-0000-0000-0000-0000000000b1');
  if n <> 1 then raise exception 'FEHLER: Link-Ansicht liefert die Aktivität nicht'; end if;
  select count(*) into n from public.participants_by_link('00000000-0000-0000-0000-0000000000b1');
  if n <> 1 then raise exception 'FEHLER: Link-Ansicht liefert die Zusagen nicht'; end if;

  -- Beitreten per Link klappt, danach ist die Aktivität für Dora sichtbar
  insert into public.participants (activity_id) values ('00000000-0000-0000-0000-0000000000b1');
  if not exists (select 1 from public.activity_feed where id = '00000000-0000-0000-0000-0000000000b1') then
    raise exception 'FEHLER: Nach dem Beitritt ist die Aktivität nicht sichtbar';
  end if;

  -- Vergangene Aktivitäten: weder per Link sichtbar noch beitretbar
  select count(*) into n from public.activity_by_link('00000000-0000-0000-0000-0000000000b3');
  if n <> 0 then raise exception 'FEHLER: Link zeigt Aktivität von gestern'; end if;
  begin
    insert into public.participants (activity_id) values ('00000000-0000-0000-0000-0000000000b3');
    raise exception 'FEHLER: Beitritt zu Aktivität von gestern möglich';
  exception when insufficient_privilege then null;
  end;

  -- Austreten (damit die Zähler oben stimmen, falls das Skript erweitert wird)
  delete from public.participants
  where activity_id = '00000000-0000-0000-0000-0000000000b1'
    and user_id = '00000000-0000-0000-0000-0000000000a4';
end $$;


-- ---------- Nicht angemeldet (anon) ----------
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
declare n int;
begin
  begin
    perform 1 from public.activities limit 1;
    raise exception 'FEHLER: Nicht angemeldete Aufrufe können Aktivitäten lesen';
  exception when insufficient_privilege then null;
  end;

  -- Link-Vorschau ohne Konto ist erlaubt …
  select count(*) into n from public.activity_by_link('00000000-0000-0000-0000-0000000000b1');
  if n <> 1 then raise exception 'FEHLER: Link-Vorschau ohne Konto funktioniert nicht'; end if;

  -- … beitreten aber nur mit (Gast-)Konto
  begin
    insert into public.participants (activity_id, user_id)
    values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'FEHLER: Beitritt ohne Konto möglich';
  exception when insufficient_privilege then null;
  end;
end $$;


reset role;
select 'Alle RLS-Prüfungen bestanden' as ergebnis;

rollback;
