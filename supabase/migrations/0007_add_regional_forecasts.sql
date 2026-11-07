-- PAGASA's regional forecast for the Visayas (docs/data-sources.md): the night and
-- day forecast, the extended outlook and the heavy-rainfall warning, saved by the
-- ingestPagasa job. The same page's Cebu thunderstorm advisories go to public.alerts.

create table public.regional_forecasts (
  -- 'visayas' (PAGASA's Visayas regional page).
  region text primary key check (region ~ '^[a-z_]+$'),
  -- When PAGASA issued the forecast.
  issued_at timestamptz,
  -- [{part: 'night'|'day', description, minC, maxC, wind, direction, coastal}], in the page's order
  periods jsonb not null default '[]'::jsonb check (jsonb_typeof(periods) = 'array'),
  outlook_issued_at timestamptz,
  -- [{day, minC, maxC, wind, direction, coastal}], usually 5 days
  outlook jsonb not null default '[]'::jsonb check (jsonb_typeof(outlook) = 'array'),
  -- The warning text, or null when PAGASA says none is issued.
  rainfall_warning text,
  source_url text not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger regional_forecasts_updated_at
before update on public.regional_forecasts
for each row execute procedure public.set_updated_at();

alter table public.regional_forecasts enable row level security;

revoke all on table public.regional_forecasts from anon, authenticated;
grant select on public.regional_forecasts to authenticated;
grant all on public.regional_forecasts to service_role;

-- No insert/update/delete policies: only the service role (PAGASA job) writes.
create policy "Signed-in users can view regional forecasts"
on public.regional_forecasts for select to authenticated
using (true);
