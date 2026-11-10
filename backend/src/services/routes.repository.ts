// Road routes between saved places (public.place_routes). The ingestRoutes job
// reads every pair in use and writes routes with the service-role client; the
// API reads a user's routes as that user, so Row Level Security applies.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlaceRouteRow, RequestUser, UserClientFactory } from "../types";
import { dbError } from "../utils/db";

export const ROUTE_META_COLUMNS =
  "origin_location_id, destination_location_id, allow_cclex, origin_lat, origin_lng, destination_lat, destination_lng, distance_m, travel_s, uses_cclex, fetched_at";
const ROUTE_COLUMNS = `${ROUTE_META_COLUMNS}, line`;

// Everything about a route except its line, which only the map needs.
export type PlaceRouteMeta = Omit<PlaceRouteRow, "line">;

export interface RoutePlace {
  id: string;
  lat: number;
  lng: number;
}

export interface RoutePair {
  origin: RoutePlace;
  destination: RoutePlace;
}

export interface RoutesJobRepository {
  // Every origin → destination pair that a trip or a usual commute uses, with the places' current coordinates.
  listPairs(): Promise<RoutePair[]>;
  listSaved(): Promise<PlaceRouteMeta[]>;
  // Creates or replaces the route for its pair and CCLEX choice.
  save(route: PlaceRouteRow): Promise<void>;
}

export interface RoutesRepository {
  // Both saved routes (with and without CCLEX) from one of the user's places to another.
  between(user: RequestUser, originId: string, destinationId: string): Promise<PlaceRouteRow[]>;
}

const pairKey = (origin: string, destination: string) => `${origin}>${destination}`;

export function createRoutesJobRepository(db: SupabaseClient): RoutesJobRepository {
  return {
    async listPairs() {
      const [trips, commutes] = await Promise.all([
        db.from("schedule_entries").select("origin_location_id, destination_location_id"),
        db
          .from("profiles")
          .select("commute_origin_location_id, commute_destination_location_id")
          .not("commute_origin_location_id", "is", null)
          .not("commute_destination_location_id", "is", null),
      ]);
      if (trips.error) throw dbError(trips.error);
      if (commutes.error) throw dbError(commutes.error);

      const ids = new Map<string, [string, string]>();
      const add = (origin: string | null, destination: string | null) => {
        if (origin && destination && origin !== destination) ids.set(pairKey(origin, destination), [origin, destination]);
      };
      for (const row of (trips.data ?? []) as Array<{ origin_location_id: string; destination_location_id: string }>) {
        add(row.origin_location_id, row.destination_location_id);
      }
      for (const row of (commutes.data ?? []) as Array<{ commute_origin_location_id: string | null; commute_destination_location_id: string | null }>) {
        add(row.commute_origin_location_id, row.commute_destination_location_id);
      }
      if (ids.size === 0) return [];

      const placeIds = [...new Set([...ids.values()].flat())];
      const places = new Map<string, RoutePlace>();
      // In chunks, so the id list never makes the request URL too long.
      for (let i = 0; i < placeIds.length; i += 150) {
        const { data, error } = await db
          .from("locations")
          .select("id, lat, lng")
          .in("id", placeIds.slice(i, i + 150));
        if (error) throw dbError(error);
        for (const place of (data ?? []) as RoutePlace[]) places.set(place.id, place);
      }

      return [...ids.values()].flatMap(([originId, destinationId]) => {
        const origin = places.get(originId);
        const destination = places.get(destinationId);
        return origin && destination ? [{ origin, destination }] : [];
      });
    },

    async listSaved() {
      const { data, error } = await db.from("place_routes").select(ROUTE_META_COLUMNS);
      if (error) throw dbError(error);
      return (data ?? []) as PlaceRouteMeta[];
    },

    async save(route) {
      const { error } = await db
        .from("place_routes")
        .upsert(route, { onConflict: "origin_location_id,destination_location_id,allow_cclex" });
      if (error) throw dbError(error);
    },
  };
}

export function createRoutesRepository(clientFor: UserClientFactory): RoutesRepository {
  return {
    async between(user, originId, destinationId) {
      const { data, error } = await clientFor(user.accessToken)
        .from("place_routes")
        .select(ROUTE_COLUMNS)
        .eq("origin_location_id", originId)
        .eq("destination_location_id", destinationId);
      if (error) throw dbError(error);
      return (data ?? []) as PlaceRouteRow[];
    },
  };
}
