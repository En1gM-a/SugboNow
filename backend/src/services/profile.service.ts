// The signed-in user's profile: personal details, home city, followed LGU,
// and typical commute.

import { CEBU_AREAS, getArea } from "../config/areas";
import type { ProfilePatch } from "../schemas/profile.schema";
import type { ProfileRow, RequestUser } from "../types";
import { badRequest, notFound, type ErrorDetail } from "../utils/errors";
import type { LocationsRepository } from "./locations.repository";
import type { LguSourcesRepository } from "./lguSources.repository";
import type { ProfileRepository, ProfileUpdate } from "./profile.repository";

export interface ProfileServiceDeps {
  profiles: ProfileRepository;
  locations: LocationsRepository;
  lguSources: LguSourcesRepository;
}

export function createProfileService({ profiles, locations, lguSources }: ProfileServiceDeps) {
  async function validate(user: RequestUser, patch: ProfilePatch): Promise<void> {
    const problems: ErrorDetail[] = [];
    if (patch.city && !getArea(patch.city)) {
      problems.push({ path: "city", message: `Unknown city. Use one of: ${CEBU_AREAS.map((a) => a.slug).join(", ")}.` });
    }
    if (patch.subscribedMayor && !(await lguSources.isActiveSlug(patch.subscribedMayor))) {
      problems.push({ path: "subscribedMayor", message: "Unknown LGU. Use a slug from GET /api/lgu-sources." });
    }
    const placeFields = ["commuteOriginLocationId", "commuteDestinationLocationId"] as const;
    const ids = placeFields.map((field) => patch[field]).filter((id): id is string => Boolean(id));
    if (ids.length > 0) {
      const owned = new Set((await locations.findOwned(user, ids)).map((location) => location.id));
      for (const field of placeFields) {
        const id = patch[field];
        if (id && !owned.has(id)) problems.push({ path: field, message: "Not one of your saved places." });
      }
    }
    if (problems.length > 0) throw badRequest("Some fields are invalid.", problems);
  }

  function toColumns(patch: ProfilePatch): ProfileUpdate {
    const changes: ProfileUpdate = {};
    if (patch.displayName !== undefined) changes.display_name = patch.displayName;
    if (patch.firstName !== undefined) changes.first_name = patch.firstName;
    if (patch.city !== undefined) changes.city = patch.city;
    if (patch.addressText !== undefined) changes.address_text = patch.addressText;
    if (patch.subscribedMayor !== undefined) changes.subscribed_mayor = patch.subscribedMayor;
    if (patch.commuteOriginLocationId !== undefined) changes.commute_origin_location_id = patch.commuteOriginLocationId;
    if (patch.commuteDestinationLocationId !== undefined) {
      changes.commute_destination_location_id = patch.commuteDestinationLocationId;
    }
    return changes;
  }

  return {
    async get(user: RequestUser): Promise<ProfileRow> {
      const profile = await profiles.get(user);
      if (!profile) throw notFound("Profile not found.");
      return profile;
    },

    async update(user: RequestUser, patch: ProfilePatch): Promise<ProfileRow> {
      await validate(user, patch);
      const profile = await profiles.update(user, toColumns(patch));
      if (!profile) throw notFound("Profile not found.");
      return profile;
    },
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;
