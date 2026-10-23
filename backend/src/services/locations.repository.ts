// The signed-in user's saved places (public.locations), read and written as
// that user so Row Level Security applies.

import type { LocationKind, LocationRow, RequestUser, UserClientFactory } from "../types";
import { dbError } from "../utils/db";

export const LOCATION_COLUMNS = "id, label, kind, address_text, lat, lng, created_at, updated_at";

export interface LocationInput {
  label: string;
  kind: LocationKind;
  addressText: string;
  lat: number;
  lng: number;
}

export interface LocationsRepository {
  list(user: RequestUser): Promise<LocationRow[]>;
  // The subset of `ids` that are this user's places.
  findOwned(user: RequestUser, ids: string[]): Promise<LocationRow[]>;
  create(user: RequestUser, input: LocationInput): Promise<LocationRow>;
  update(user: RequestUser, id: string, input: LocationInput): Promise<LocationRow | null>;
  // False when there was no such place.
  remove(user: RequestUser, id: string): Promise<boolean>;
}

function toColumns(input: LocationInput) {
  return { label: input.label, kind: input.kind, address_text: input.addressText, lat: input.lat, lng: input.lng };
}

export function createLocationsRepository(clientFor: UserClientFactory): LocationsRepository {
  return {
    async list(user) {
      const { data, error } = await clientFor(user.accessToken)
        .from("locations")
        .select(LOCATION_COLUMNS)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw dbError(error);
      return (data ?? []) as LocationRow[];
    },

    async findOwned(user, ids) {
      if (ids.length === 0) return [];
      const { data, error } = await clientFor(user.accessToken)
        .from("locations")
        .select(LOCATION_COLUMNS)
        .eq("user_id", user.id)
        .in("id", ids);
      if (error) throw dbError(error);
      return (data ?? []) as LocationRow[];
    },

    async create(user, input) {
      const { data, error } = await clientFor(user.accessToken)
        .from("locations")
        .insert({ user_id: user.id, ...toColumns(input) })
        .select(LOCATION_COLUMNS)
        .single();
      if (error) throw dbError(error);
      return data as LocationRow;
    },

    async update(user, id, input) {
      const { data, error } = await clientFor(user.accessToken)
        .from("locations")
        .update(toColumns(input))
        .eq("id", id)
        .eq("user_id", user.id)
        .select(LOCATION_COLUMNS)
        .maybeSingle();
      if (error) throw dbError(error);
      return (data as LocationRow | null) ?? null;
    },

    async remove(user, id) {
      const { data, error } = await clientFor(user.accessToken)
        .from("locations")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id");
      if (error) {
        throw dbError(error, {
          foreignKey: "This place is used by a schedule entry. Change or delete that entry first.",
        });
      }
      return (data ?? []).length > 0;
    },
  };
}
