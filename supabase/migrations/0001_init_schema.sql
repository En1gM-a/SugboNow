-- Initial Sugbo Now schema.
-- Apply this migration once to a fresh Supabase project.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  address_text text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  days_of_week smallint[] not null,
  arrive_by time not null,
  origin_location_id uuid not null references public.locations(id) on delete restrict,
  destination_location_id uuid not null references public.locations(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_days_of_week
    check (
      cardinality(days_of_week) > 0
      and days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]
    )
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  type text not null,
  severity text not null,
  title text not null,
  summary text,
  lat double precision,
  lng double precision,
  area_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  source_url text,
  fingerprint text not null unique,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brief_date date not null,
  content text not null,
  alert_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brief_date)
);

create index locations_user_id_idx on public.locations(user_id);
create index schedule_entries_user_id_idx on public.schedule_entries(user_id);
create index daily_briefs_user_id_idx on public.daily_briefs(user_id);
create index alerts_active_idx on public.alerts(starts_at, ends_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger locations_updated_at
before update on public.locations
for each row execute procedure public.set_updated_at();

create trigger schedule_entries_updated_at
before update on public.schedule_entries
for each row execute procedure public.set_updated_at();

create trigger daily_briefs_updated_at
before update on public.daily_briefs
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.alerts enable row level security;
alter table public.daily_briefs enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.locations from anon, authenticated;
revoke all on table public.schedule_entries from anon, authenticated;
revoke all on table public.alerts from anon, authenticated;
revoke all on table public.daily_briefs from anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.locations to authenticated;
grant select, insert, update, delete on public.schedule_entries to authenticated;
grant select on public.alerts to authenticated;
grant select, insert, update, delete on public.daily_briefs to authenticated;

grant all on public.profiles to service_role;
grant all on public.locations to service_role;
grant all on public.schedule_entries to service_role;
grant all on public.alerts to service_role;
grant all on public.daily_briefs to service_role;

create policy "Users can view their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can view their own locations"
on public.locations for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own locations"
on public.locations for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own locations"
on public.locations for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own locations"
on public.locations for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own schedules"
on public.schedule_entries for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own schedules"
on public.schedule_entries for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.locations
    where id = origin_location_id and user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.locations
    where id = destination_location_id and user_id = (select auth.uid())
  )
);

create policy "Users can update their own schedules"
on public.schedule_entries for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own schedules"
on public.schedule_entries for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Signed-in users can view alerts"
on public.alerts for select to authenticated
using (true);

create policy "Users can view their own briefs"
on public.daily_briefs for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own briefs"
on public.daily_briefs for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own briefs"
on public.daily_briefs for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own briefs"
on public.daily_briefs for delete to authenticated
using ((select auth.uid()) = user_id);
