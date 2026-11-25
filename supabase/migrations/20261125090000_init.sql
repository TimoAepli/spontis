-- =====================================================================
-- spontis – Grundschema
-- Tabellen, Hilfsfunktionen, Row Level Security (RLS), View und Realtime.
--
-- Grundsatz: Sicherheit liegt in der Datenbank. Die App kann nur das
-- lesen und schreiben, was die Policies unten erlauben – auch wenn
-- jemand die API direkt mit dem öffentlichen Key aufruft.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Hilfsfunktion: Beginn des heutigen Tages in der Schweiz
-- ---------------------------------------------------------------------
create or replace function public.today_start()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select date_trunc('day', now() at time zone 'Europe/Zurich') at time zone 'Europe/Zurich'
$$;


-- ---------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------

-- Profil pro Konto. Konten entstehen über Supabase «Anonymous Sign-In».
create table public.profiles (
  id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  username    text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  first_name  text not null check (char_length(trim(first_name)) between 1 and 40),
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_at  timestamptz not null default now()
);

-- Freundschaften: user_id fragt an, friend_id nimmt an.
create table public.friendships (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  friend_id  uuid not null references public.profiles (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- Nur eine Freundschaft pro Paar, egal in welche Richtung angefragt wurde.
create unique index friendships_pair_idx
  on public.friendships (least(user_id, friend_id), greatest(user_id, friend_id));
create index friendships_friend_idx on public.friendships (friend_id);

-- Aktivitäten. Gespeichert wird nur der Treffpunkt, nie ein Live-Standort.
create table public.activities (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category         text not null check (category in ('sport', 'ausgang', 'essen', 'kultur', 'anderes')),
  title            text not null check (char_length(trim(title)) between 2 and 60),
  starts_at        timestamptz not null,
  lat              double precision not null check (lat between -90 and 90),
  lng              double precision not null check (lng between -180 and 180),
  place_name       text not null check (char_length(trim(place_name)) between 1 and 120),
  min_participants int not null check (min_participants between 2 and 10),
  visibility       text not null check (visibility in ('friends', 'nearby')),
  is_sponsored     boolean not null default false,
  created_at       timestamptz not null default now()
);
create index activities_starts_at_idx on public.activities (starts_at);
create index activities_creator_idx on public.activities (creator_id);

-- Zusagen
create table public.participants (
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (activity_id, user_id)
);
create index participants_user_idx on public.participants (user_id);


-- ---------------------------------------------------------------------
-- Funktionen (security definer = laufen mit Rechten des Besitzers,
-- damit sie Freundschaften prüfen können, ohne RLS zu umgehen)
-- ---------------------------------------------------------------------

-- Sind a und b befreundet (angenommene Anfrage)?
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.user_id = a and f.friend_id = b) or (f.user_id = b and f.friend_id = a))
  )
$$;

-- Freundschaftsanfrage per Einladungscode.
-- Rückgabe: 'requested' | 'accepted' | 'pending' | 'already_friends' | 'self' | 'not_found'
-- Hat die andere Person mich schon angefragt, wird die Anfrage direkt angenommen.
create or replace function public.request_friend(code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me       uuid := auth.uid();
  target   uuid;
  existing public.friendships;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select p.id into target from public.profiles p where p.invite_code = upper(trim(code));
  if target is null then return 'not_found'; end if;
  if target = me then return 'self'; end if;

  select * into existing from public.friendships f
  where (f.user_id = me and f.friend_id = target) or (f.user_id = target and f.friend_id = me);

  if found then
    if existing.status = 'accepted' then return 'already_friends'; end if;
    if existing.user_id = target then
      update public.friendships set status = 'accepted'
      where user_id = target and friend_id = me;
      return 'accepted';
    end if;
    return 'pending';
  end if;

  insert into public.friendships (user_id, friend_id) values (me, target);
  return 'requested';
end
$$;

-- Wer eine Aktivität erstellt, ist automatisch dabei.
create or replace function public.add_creator_as_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.participants (activity_id, user_id) values (new.id, new.creator_id);
  return new;
end
$$;

create trigger activities_add_creator
  after insert on public.activities
  for each row execute function public.add_creator_as_participant();


-- ---------------------------------------------------------------------
-- Rechte: Nicht angemeldete Aufrufe (anon) dürfen gar nichts.
-- Angemeldete (auch anonyme Konten) nur die nötigen Spalten.
-- ---------------------------------------------------------------------
revoke all on public.profiles, public.friendships, public.activities, public.participants
  from anon, authenticated;

grant select on public.profiles, public.friendships, public.activities, public.participants
  to authenticated;

grant insert (username, first_name) on public.profiles to authenticated;
grant update (username, first_name) on public.profiles to authenticated;

-- Freundschaften entstehen nur über request_friend(); annehmen = nur Status ändern.
grant update (status) on public.friendships to authenticated;
grant delete on public.friendships to authenticated;

-- is_sponsored und creator_id kann die App nicht selbst setzen.
grant insert (category, title, starts_at, lat, lng, place_name, min_participants, visibility)
  on public.activities to authenticated;
grant delete on public.activities to authenticated;

grant insert (activity_id) on public.participants to authenticated;
grant delete on public.participants to authenticated;

revoke execute on function public.are_friends(uuid, uuid) from public, anon;
revoke execute on function public.request_friend(text) from public, anon;
revoke execute on function public.add_creator_as_participant() from public, anon, authenticated;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.request_friend(text) to authenticated;


-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.friendships  enable row level security;
alter table public.activities   enable row level security;
alter table public.participants enable row level security;

-- profiles: Vornamen sind für alle Angemeldeten lesbar (Zusageliste, Freunde).
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- friendships: nur eigene sehen; nur der Empfänger kann annehmen.
create policy friendships_select on public.friendships
  for select to authenticated using (auth.uid() in (user_id, friend_id));
create policy friendships_accept on public.friendships
  for update to authenticated
  using (friend_id = auth.uid() and status = 'pending')
  with check (friend_id = auth.uid() and status = 'accepted');
create policy friendships_delete on public.friendships
  for delete to authenticated using (auth.uid() in (user_id, friend_id));

-- activities: nur heute, und nur eigene, «Alle in der Nähe» oder von Freunden.
create policy activities_select on public.activities
  for select to authenticated using (
    starts_at >= public.today_start()
    and starts_at < public.today_start() + interval '1 day'
    and (
      creator_id = auth.uid()
      or visibility = 'nearby'
      or public.are_friends(creator_id, auth.uid())
    )
  );
create policy activities_insert on public.activities
  for insert to authenticated with check (
    creator_id = auth.uid()
    and starts_at >= public.today_start()
    and starts_at < public.today_start() + interval '1 day'
  );
create policy activities_delete on public.activities
  for delete to authenticated using (creator_id = auth.uid());

-- participants: sichtbar und beitretbar nur, wenn die Aktivität selbst
-- lesbar ist (die Unterabfrage unterliegt der Policy von activities).
create policy participants_select on public.participants
  for select to authenticated using (
    exists (select 1 from public.activities a where a.id = activity_id)
  );
create policy participants_insert on public.participants
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.activities a where a.id = activity_id)
  );
create policy participants_delete on public.participants
  for delete to authenticated using (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- View für Liste, Karte und Detail.
-- security_invoker = true: Die View gilt mit den Rechten der abfragenden
-- Person, alle RLS-Policies oben greifen also auch hier.
-- ---------------------------------------------------------------------
create view public.activity_feed
with (security_invoker = true)
as
select
  a.id,
  a.creator_id,
  a.category,
  a.title,
  a.starts_at,
  a.lat,
  a.lng,
  a.place_name,
  a.min_participants,
  a.visibility,
  a.is_sponsored,
  a.created_at,
  p.first_name  as creator_first_name,
  p.invite_code as creator_invite_code,
  (select count(*) from public.participants x where x.activity_id = a.id)::int as participant_count,
  exists (
    select 1 from public.participants x
    where x.activity_id = a.id and x.user_id = auth.uid()
  ) as is_joined
from public.activities a
join public.profiles p on p.id = a.creator_id;

revoke all on public.activity_feed from anon, authenticated;
grant select on public.activity_feed to authenticated;


-- ---------------------------------------------------------------------
-- Realtime: Änderungen an Zusagen und Aktivitäten an die App senden.
-- Supabase prüft dabei für jede empfangende Person die SELECT-Policy.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.participants, public.activities;
