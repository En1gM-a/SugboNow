// Road routes between two of the signed-in user's places (GET /api/routes).

import type { AlertRow, PlaceRouteRow, RequestUser, RouteTraffic } from "../types";
import { notFound } from "../utils/errors";
import type { LatLng } from "../utils/geo";
import { addHours } from "../utils/time";
import type { AlertsRepository } from "./alerts.repository";
import { UPCOMING_HOURS } from "./alerts.service";
import type { LocationsRepository } from "./locations.repository";
import { ROUTE_ALERT_TYPES, compareAlerts, isOnRoute } from "./matching.service";
import type { PlaceRouteMeta, RoutesRepository } from "./routes.repository";
import { colorRoute, type TrafficFlowService } from "./trafficFlow.service";

// About 10 cm: a place that moved further than this needs a new route.
const SAME_POINT = 1e-6;

const samePoint = (lat: number, lng: number, point: LatLng) =>
  Math.abs(lat - point.lat) < SAME_POINT && Math.abs(lng - point.lng) < SAME_POINT;

// True when the route was fetched for the places where they are now.
export function routeFitsPlaces(route: PlaceRouteMeta, origin: LatLng, destination: LatLng): boolean {
  return samePoint(route.origin_lat, route.origin_lng, origin) && samePoint(route.destination_lat, route.destination_lng, destination);
}

// A route with the current traffic along it and the traffic alerts on it.
export interface RouteOnTheWay extends PlaceRouteRow {
  traffic: RouteTraffic[];
  alerts: AlertRow[];
}

export interface RoutesBetween {
  from: string;
  to: string;
  withCclex: RouteOnTheWay | null;
  withoutCclex: RouteOnTheWay | null;
}

export interface RoutesServiceDeps {
  routes: RoutesRepository;
  locations: LocationsRepository;
  alerts: Pick<AlertsRepository, "listActive">;
  flow: TrafficFlowService;
  now?: () => Date;
}

export function createRoutesService({ routes, locations, alerts, flow, now = () => new Date() }: RoutesServiceDeps) {
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
      const withCclex = pick(true);
      const withoutCclex = pick(false);
      if (!withCclex && !withoutCclex) return { from: fromId, to: toId, withCclex: null, withoutCclex: null };

      // The same window as GET /api/alerts: active now or starting soon.
      const current = now();
      const [active, traffic] = await Promise.all([
        alerts.listActive({ now: current, startsBefore: addHours(current, UPCOMING_HOURS), types: ROUTE_ALERT_TYPES, limit: 200 }),
        flow.current(),
      ]);
      const onTheWay = (row: PlaceRouteRow | null): RouteOnTheWay | null =>
        row && {
          ...row,
          traffic: traffic ? colorRoute(row.line, traffic.lines) : [],
          alerts: active.filter((alert) => isOnRoute(alert, row.line)).sort(compareAlerts),
        };
      return { from: fromId, to: toId, withCclex: onTheWay(withCclex), withoutCclex: onTheWay(withoutCclex) };
    },
  };
}

export type RoutesService = ReturnType<typeof createRoutesService>;
