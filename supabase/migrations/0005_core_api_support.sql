-- Schema support for the core REST API and ingestion jobs.
--
-- 1. locations.kind: what a saved place is (home, school, work, other).
-- 2. alerts.image_url: thumbnail for news-based alerts.
-- 3. weather_snapshots: latest conditions and 24-hour forecast per Metro Cebu
--    area, written hourly by the weather job (service role) and readable by
--    signed-in users.
-- 4. Indexes for the alert and brief read paths.

-- ---------------------------------------------------------------------------
-- 1. locations.kind
-- ---------------------------------------------------------------------------

alter table public.locations
  add column kind text not null default 'other'
    check (kind in ('home', 'school', 'work', 'other'));

-- ---------------------------------------------------------------------------
-- 2. alerts.image_url
-- ---------------------------------------------------------------------------

alter table public.alerts
  add column image_url text;

-- ---------------------------------------------------------------------------
-- 3. weather_snapshots
-- ---------------------------------------------------------------------------

create table public.weather_snapshots (
  -- Area slug, e.g. 'cebu_city' (same values as profiles.city).
  area_slug text primary key check (area_slug ~ '^[a-z0-9_]+$'),
  area_name text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  -- When the provider last updated the observation.
  observed_at timestamptz not null,
  -- {tempC, feelsLikeC, condition, iconUrl, isDay, humidity, windKph, precipMm, chanceOfRain}
  current_conditions jsonb not null check (jsonb_typeof(current_conditions) = 'object'),
  -- Next 24 hours: [{time, tempC, condition, iconUrl, chanceOfRain, precipMm}]
  hourly_forecast jsonb not null default '[]'::jsonb check (jsonb_typeof(hourly_forecast) = 'array'),
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger weather_snapshots_updated_at
before update on public.weather_snapshots
for each row execute procedure public.set_updated_at();

alter table public.weather_snapshots enable row level security;

revoke all on table public.weather_snapshots from anon, authenticated;
grant select on public.weather_snapshots to authenticated;
grant all on public.weather_snapshots to service_role;

-- No insert/update/delete policies: only the service role (weather job) writes.
create policy "Signed-in users can view weather"
on public.weather_snapshots for select to authenticated
using (true);

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------

-- /api/alerts and the brief filter alerts by type within the active window.
create index alerts_type_starts_at_idx on public.alerts(type, starts_at desc);

-- /api/news lists the latest items from the news sources.
create index alerts_source_starts_at_idx on public.alerts(source, starts_at desc);

-- The 05:30 brief job finds users with a trip on today's weekday.
create index schedule_entries_days_of_week_idx on public.schedule_entries using gin (days_of_week);
