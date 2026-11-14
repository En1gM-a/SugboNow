import { fetchTomtomRoute, type RoadRoute } from "../integrations/tomtom";
import type { RoutePair, RoutesJobRepository, PlaceRouteMeta } from "../services/routes.repository";
import { routeFitsPlaces } from "../services/routes.service";
import type { PlaceRouteRow } from "../types";
import type { LatLng } from "../utils/geo";
import type { Job } from "./types";

// A route older than this is fetched again, in case the roads changed.
export const ROUTE_MAX_AGE_DAYS = 7;
// At most this many TomTom requests per run; the rest wait for the next run.
export const MAX_ROUTE_REQUESTS_PER_RUN = 40;

export interface IngestRoutesDeps {
  apiKey?: string;
  routes: RoutesJobRepository;
  fetchRoute?: (apiKey: string, from: LatLng, to: LatLng, options: { allowCclex: boolean }) => Promise<RoadRoute>;
  maxRequests?: number;
}

const routeKey = (origin: string, destination: string, allowCclex: boolean) => `${origin}>${destination}:${allowCclex}`;

// A route fetched in this run carries its line; one read from the database only has its summary.
const hasLine = (route: PlaceRouteMeta | PlaceRouteRow): route is PlaceRouteRow => "line" in route;

function toRow(pair: RoutePair, allowCclex: boolean, route: RoadRoute, now: Date): PlaceRouteRow {
  return {
    origin_location_id: pair.origin.id,
    destination_location_id: pair.destination.id,
    allow_cclex: allowCclex,
    origin_lat: pair.origin.lat,
    origin_lng: pair.origin.lng,
    destination_lat: pair.destination.lat,
    destination_lng: pair.destination.lng,
    distance_m: route.distanceM,
    travel_s: route.travelS,
    uses_cclex: route.usesCclex,
    line: route.line,
    fetched_at: now.toISOString(),
  };
}

// Road routes for every pair of places a trip or a usual commute uses: the
// fastest route, and, when that one crosses CCLEX, the fastest that avoids it.
// Only new pairs, moved places and week-old routes cost a request.
export function createIngestRoutesJob(deps: IngestRoutesDeps): Job {
  const fetchRoute = deps.fetchRoute ?? fetchTomtomRoute;
  const maxRequests = deps.maxRequests ?? MAX_ROUTE_REQUESTS_PER_RUN;
  return {
    name: "ingestRoutes",
    schedule: "20,50 * * * *", // every 30 minutes, at :20 and :50
    description: "TomTom road routes between saved places",
    async run(now) {
      if (!deps.apiKey) return { status: "skipped", detail: "TOMTOM_API_KEY is not set" };
      const apiKey = deps.apiKey;
      const [pairs, savedRows] = await Promise.all([deps.routes.listPairs(), deps.routes.listSaved()]);
      const saved = new Map(savedRows.map((row) => [routeKey(row.origin_location_id, row.destination_location_id, row.allow_cclex), row]));
      const maxAgeMs = ROUTE_MAX_AGE_DAYS * 24 * 60 * 60_000;
      const isFresh = (row: PlaceRouteMeta | undefined, pair: RoutePair): row is PlaceRouteMeta =>
        Boolean(row) &&
        routeFitsPlaces(row as PlaceRouteMeta, pair.origin, pair.destination) &&
        now.getTime() - Date.parse((row as PlaceRouteMeta).fetched_at) < maxAgeMs;

      let requests = 0;
      let written = 0;
      let failed = 0;
      let waiting = 0;

      // One TomTom request, saved; null when the request failed or the run is out of requests.
      async function fetchAndSave(pair: RoutePair, allowCclex: boolean): Promise<PlaceRouteRow | null> {
        if (requests >= maxRequests) {
          waiting++;
          return null;
        }
        requests++;
        try {
          const row = toRow(pair, allowCclex, await fetchRoute(apiKey, pair.origin, pair.destination, { allowCclex }), now);
          await deps.routes.save(row);
          written++;
          return row;
        } catch {
          failed++;
          return null;
        }
      }

      for (const pair of pairs) {
        const savedWith = saved.get(routeKey(pair.origin.id, pair.destination.id, true));
        const withCclex = isFresh(savedWith, pair) ? savedWith : await fetchAndSave(pair, true);
        if (!withCclex) continue;

        const savedWithout = saved.get(routeKey(pair.origin.id, pair.destination.id, false));
        if (withCclex.uses_cclex) {
          if (!isFresh(savedWithout, pair)) await fetchAndSave(pair, false);
          continue;
        }
        // The fastest route doesn't cross CCLEX, so it's also the route that avoids it.
        if (isFresh(savedWithout, pair) && Date.parse(savedWithout.fetched_at) >= Date.parse(withCclex.fetched_at)) continue;
        if (hasLine(withCclex)) {
          // Just fetched: save a copy, with no second request.
          await deps.routes.save({ ...withCclex, allow_cclex: false });
          written++;
        } else {
          // Loaded without its line (only the summary is read), so ask TomTom for the copy. Rare: both are
          // normally saved in the same run and go stale together.
          await fetchAndSave(pair, false);
        }
      }

      const detail = `${pairs.length} pairs, ${requests} TomTom requests, ${failed} failed${waiting ? `, ${waiting} waiting for the next run` : ""}`;
      return { status: failed > 0 && written === 0 ? "failed" : "ok", detail, saved: written };
    },
  };
}
