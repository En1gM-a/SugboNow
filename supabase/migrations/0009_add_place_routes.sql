-- Road routes between saved places (docs/api-contract.md, GET /api/routes), and
-- the profile's CCLEX choice. The ingestRoutes job asks TomTom Routing for the
-- fastest car route of every pair a trip or the usual commute uses: one that may
-- use CCLEX, the toll expressway between Cordova and Cebu City, and one that
-- avoids toll roads. The API reads them; the browser never calls TomTom.
--
-- Undo:
--   drop table public.place_routes;
--   alter table public.profiles drop column allow_cclex;

-- One setting for every trip. Routes and leave times may use CCLEX unless it's off.
alter table public.profiles
  add column allow_cclex boolean not null default true;

create table public.place_routes (
  origin_location_id uuid not null references public.locations(id) on delete cascade,
  destination_location_id uuid not null references public.locations(id) on delete cascade,
  -- true: the fastest route, which may use CCLEX; false: the fastest route avoiding toll roads.
  allow_cclex boolean not null,
  -- The places' coordinates when the route was fetched. A moved place gets a new route.
  origin_lat double precision not null,
  origin_lng double precision not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  distance_m integer not null check (distance_m >= 0),
  -- Typical car travel time (TomTom's historic traffic), in seconds.
  travel_s integer not null check (travel_s >= 0),
  uses_cclex boolean not null,
  -- [[lat, lng], ...] along the roads, simplified to at most 300 points.
  line jsonb not null check (jsonb_typeof(line) = 'array'),
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (origin_location_id, destination_location_id, allow_cclex),
  constraint different_places check (origin_location_id <> destination_location_id)
);

create index place_routes_destination_idx on public.place_routes (destination_location_id);

create trigger place_routes_updated_at
before update on public.place_routes
for each row execute procedure public.set_updated_at();

alter table public.place_routes enable row level security;

revoke all on table public.place_routes from anon, authenticated;
grant select on public.place_routes to authenticated;
grant all on public.place_routes to service_role;

-- A user sees the routes that start at one of their own places. Only the
-- routes job (service role) writes them.
create policy "Users can view routes from their own places"
on public.place_routes for select to authenticated
using (
  exists (
    select 1 from public.locations l
    where l.id = place_routes.origin_location_id
      and l.user_id = (select auth.uid())
  )
);
