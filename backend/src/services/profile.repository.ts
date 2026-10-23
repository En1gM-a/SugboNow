// The signed-in user's profile (public.profiles), read and written as that
// user so Row Level Security applies.

import type { ProfileRow, RequestUser, UserClientFactory } from "../types";
import { dbError } from "../utils/db";

const PROFILE_COLUMNS =
  "id, display_name, first_name, city, address_text, subscribed_mayor, commute_origin_location_id, commute_destination_location_id, created_at, updated_at";

// Column values to change; keys are profiles column names.
export type ProfileUpdate = Partial<
  Pick<
    ProfileRow,
    | "display_name"
    | "first_name"
    | "city"
    | "address_text"
    | "subscribed_mayor"
    | "commute_origin_location_id"
    | "commute_destination_location_id"
  >
>;

export interface ProfileRepository {
  get(user: RequestUser): Promise<ProfileRow | null>;
  update(user: RequestUser, changes: ProfileUpdate): Promise<ProfileRow | null>;
}

export function createProfileRepository(clientFor: UserClientFactory): ProfileRepository {
  return {
    async get(user) {
      const { data, error } = await clientFor(user.accessToken)
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw dbError(error);
      return (data as ProfileRow | null) ?? null;
    },

    async update(user, changes) {
      const { data, error } = await clientFor(user.accessToken)
        .from("profiles")
        .update(changes)
        .eq("id", user.id)
        .select(PROFILE_COLUMNS)
        .maybeSingle();
      if (error) throw dbError(error);
      return (data as ProfileRow | null) ?? null;
    },
  };
}
