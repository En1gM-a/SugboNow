// Road routes between two of the signed-in user's places (GET /api/routes).

import type { PlaceRouteRow, RequestUser } from "../types";
import { notFound } from "../utils/errors";
import type { LatLng } from "../utils/geo";
import type { LocationsRepository } from "./locations.repository";
import type { PlaceRouteMeta, RoutesRepository } from "./routes.repository";

// About 10 cm: a place that moved further than this needs a new route.
const SAME_POINT = 1e-6;

const samePoint = (lat: number, lng: number, point: LatLng) =>
  Math.abs(lat - point.lat) < SAME_POINT && Math.abs(lng - point.lng) < SAME_POINT;

// True when the route was fetched for the places where they are now.
export function routeFitsPlaces(route: PlaceRouteMeta, origin: LatLng, destination: LatLng): boolean {
  return samePoint(route.origin_lat, route.origin_lng, origin) && samePoint(route.destination_lat, route.destination_lng, destination);
}

export interface RoutesBetween {
  from: string;
  to: string;
  withCclex: PlaceRouteRow | null;
  withoutCclex: PlaceRouteRow | null;
}

export function createRoutesService({ routes, locations }: { routes: RoutesRepository; locations: LocationsRepository }) {
  return {
    async between(user: RequestUser, fromId: string, toId: string): Promise<RoutesBetween> {
      const owned = await locations.findOwned(user, [fromId, toId]);
      const from = owned.find((place) => place.id === fromId);
      const to = owned.find((place) => place.id === toId);
      if (!from || !to) throw notFound("Place not found.");
      const rows = fromId === toId ? [] : await routes.between(user, fromId, toId);
      // A route saved before a place moved is out of date until the job fetches it again.
      const pick = (allowCclex: boolean) =>
        rows.find((row) => row.allow_cclex === allowCclex && routeFitsPlaces(row, from, to)) ?? null;
      return { from: fromId, to: toId, withCclex: pick(true), withoutCclex: pick(false) };
    },
  };
}

export type RoutesService = ReturnType<typeof createRoutesService>;
