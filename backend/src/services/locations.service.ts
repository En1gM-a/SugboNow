// The signed-in user's saved places (home, school, work, other).

import type { LocationBody } from "../schemas/location.schema";
import type { LocationRow, RequestUser } from "../types";
import { notFound } from "../utils/errors";
import type { LocationsRepository } from "./locations.repository";

export function createLocationsService(locations: LocationsRepository) {
  return {
    list(user: RequestUser): Promise<LocationRow[]> {
      return locations.list(user);
    },

    create(user: RequestUser, body: LocationBody): Promise<LocationRow> {
      return locations.create(user, body);
    },

    async update(user: RequestUser, id: string, body: LocationBody): Promise<LocationRow> {
      const location = await locations.update(user, id, body);
      if (!location) throw notFound("Place not found.");
      return location;
    },

    // Fails with 409 while a schedule entry still uses the place.
    async remove(user: RequestUser, id: string): Promise<void> {
      if (!(await locations.remove(user, id))) throw notFound("Place not found.");
    },
  };
}

export type LocationsService = ReturnType<typeof createLocationsService>;
