-- =====================================================================
-- spontis – Anpassungen nach den ersten Tests
--
-- 1. Gäste: Wer einen Link öffnet, kann nur mit Anzeigename beitreten
--    → Benutzername ist optional (Gäste haben keinen).
-- 2. Link-Zugriff: Wer den Link einer Aktivität hat, darf sie sehen und
--    beitreten – auch bei «Nur Freunde» und ohne Freundschaft.
--    In der Liste «Entdecken» erscheinen «Nur Freunde»-Aktivitäten weiterhin
--    nur für Freunde. Der Link (zufällige UUID) wirkt wie ein Schlüssel,
--    ähnlich wie «Jeder mit dem Link» bei Google Docs.
-- 3. Wer beigetreten ist, sieht die Aktivität danach auch ohne Freundschaft.
-- =====================================================================


-- ---------- 1. Gäste ohne Benutzername ----------
alter table public.profiles alter column username drop not null;
-- Die Prüfung username ~ '^[a-z0-9_.]{3,20}$' bleibt: NULL ist erlaubt,
-- gesetzte Namen müssen weiterhin gültig und eindeutig sein.


-- ---------- Hilfsfunktionen (security definer, ohne RLS-Schleifen) ----------

-- Ist die Person bei der Aktivität dabei?
create or replace function public.is_participant(p_activity uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.participants x
    where x.activity_id = p_activity and x.user_id = p_user
  )
$$;

-- Gibt es die Aktivität und findet sie heute statt? (Voraussetzung zum Beitreten per Link)
create or replace function public.activity_joinable(p_activity uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.activities a
    where a.id = p_activity
      and a.starts_at >= public.today_start()
      and a.starts_at < public.today_start() + interval '1 day'
  )
$$;

revoke execute on function public.is_participant(uuid, uuid) from public, anon;
revoke execute on function public.activity_joinable(uuid) from public, anon;
grant execute on function public.is_participant(uuid, uuid) to authenticated;
grant execute on function public.activity_joinable(uuid) to authenticated;


-- ---------- 2./3. Policies anpassen ----------

-- Sichtbar: heute UND (eigene, «Alle in der Nähe», von Freunden ODER ich bin dabei)
drop policy activities_select on public.activities;
create policy activities_select on public.activities
  for select to authenticated using (
    starts_at >= public.today_start()
    and starts_at < public.today_start() + interval '1 day'
    and (
      creator_id = auth.uid()
      or visibility = 'nearby'
      or public.are_friends(creator_id, auth.uid())
      or public.is_participant(id, auth.uid())
    )
  );

-- Beitreten: nur für sich selbst, zu jeder Aktivität von heute (die ID kennt man nur über die App oder einen Link)
drop policy participants_insert on public.participants;
create policy participants_insert on public.participants
  for insert to authenticated with check (
    user_id = auth.uid()
    and public.activity_joinable(activity_id)
  );


-- ---------- Link-Ansicht (auch ohne Konto) ----------

-- Eine Aktivität von heute über ihren Link, unabhängig von der Sichtbarkeit.
create or replace function public.activity_by_link(p_id uuid)
returns table (
  id uuid,
  creator_id uuid,
  category text,
  title text,
  starts_at timestamptz,
  lat double precision,
  lng double precision,
  place_name text,
  min_participants int,
  visibility text,
  is_sponsored boolean,
  created_at timestamptz,
  creator_first_name text,
  creator_invite_code text,
  participant_count int,
  is_joined boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id, a.creator_id, a.category, a.title, a.starts_at, a.lat, a.lng, a.place_name,
    a.min_participants, a.visibility, a.is_sponsored, a.created_at,
    p.first_name, p.invite_code,
    (select count(*) from public.participants x where x.activity_id = a.id)::int,
    exists (select 1 from public.participants x where x.activity_id = a.id and x.user_id = auth.uid())
  from public.activities a
  join public.profiles p on p.id = a.creator_id
  where a.id = p_id
    and a.starts_at >= public.today_start()
    and a.starts_at < public.today_start() + interval '1 day'
$$;

-- Anzeigenamen der Zugesagten einer Aktivität von heute über ihren Link.
create or replace function public.participants_by_link(p_id uuid)
returns table (user_id uuid, first_name text, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select x.user_id, p.first_name, x.joined_at
  from public.participants x
  join public.profiles p on p.id = x.user_id
  where x.activity_id = p_id
    and public.activity_joinable(p_id)
  order by x.joined_at
$$;

revoke execute on function public.activity_by_link(uuid) from public;
revoke execute on function public.participants_by_link(uuid) from public;
-- anon: Link-Vorschau ohne Konto (Gast sieht zuerst, worum es geht, und gibt dann seinen Namen ein)
grant execute on function public.activity_by_link(uuid) to anon, authenticated;
grant execute on function public.participants_by_link(uuid) to anon, authenticated;
