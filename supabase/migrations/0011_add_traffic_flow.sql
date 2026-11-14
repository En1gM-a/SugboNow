-- The latest TomTom traffic flow for Metro Cebu (docs/data-sources.md): every road
-- line TomTom has a speed for, grouped by traffic level. The ingestTraffic job
-- replaces it every 15 minutes. The API reads it for GET /api/traffic-flow (the All
-- Cebu map) and to color routes in GET /api/routes; the browser never calls TomTom.
--
-- Undo:
--   drop table public.traffic_flow;

create table public.traffic_flow (
  -- 'metro_cebu', the area the job covers.
  area text primary key check (area ~ '^[a-z_]+$'),
  -- {heavy, medium, free}: arrays of lines, each [[lat, lng], ...] in the direction of travel.
  lines jsonb not null check (jsonb_typeof(lines) = 'object'),
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger traffic_flow_updated_at
before update on public.traffic_flow
for each row execute procedure public.set_updated_at();

alter table public.traffic_flow enable row level security;

revoke all on table public.traffic_flow from anon, authenticated;
grant select on public.traffic_flow to authenticated;
grant all on public.traffic_flow to service_role;

-- No insert/update/delete policies: only the service role (traffic job) writes.
create policy "Signed-in users can view traffic flow"
on public.traffic_flow for select to authenticated
using (true);
