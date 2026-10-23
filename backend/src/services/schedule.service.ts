// The signed-in user's recurring schedule: where they go, which days, and
// when they need to arrive.

import type { ScheduleBody } from "../schemas/schedule.schema";
import type { RequestUser, ScheduleRow } from "../types";
import { badRequest, notFound, type ErrorDetail } from "../utils/errors";
import type { LocationsRepository } from "./locations.repository";
import type { ScheduleRepository } from "./schedule.repository";

export function createScheduleService(schedule: ScheduleRepository, locations: LocationsRepository) {
  // Both places must be the user's own; the database checks this too.
  async function checkPlaces(user: RequestUser, body: ScheduleBody): Promise<void> {
    const owned = new Set(
      (await locations.findOwned(user, [body.originLocationId, body.destinationLocationId])).map((place) => place.id),
    );
    const problems: ErrorDetail[] = [];
    if (!owned.has(body.originLocationId)) problems.push({ path: "originLocationId", message: "Not one of your saved places." });
    if (!owned.has(body.destinationLocationId)) {
      problems.push({ path: "destinationLocationId", message: "Not one of your saved places." });
    }
    if (problems.length > 0) throw badRequest("Some fields are invalid.", problems);
  }

  return {
    list(user: RequestUser): Promise<ScheduleRow[]> {
      return schedule.list(user);
    },

    async create(user: RequestUser, body: ScheduleBody): Promise<ScheduleRow> {
      await checkPlaces(user, body);
      return schedule.create(user, body);
    },

    async update(user: RequestUser, id: string, body: ScheduleBody): Promise<ScheduleRow> {
      await checkPlaces(user, body);
      const entry = await schedule.update(user, id, body);
      if (!entry) throw notFound("Schedule entry not found.");
      return entry;
    },

    async remove(user: RequestUser, id: string): Promise<void> {
      if (!(await schedule.remove(user, id))) throw notFound("Schedule entry not found.");
    },
  };
}

export type ScheduleService = ReturnType<typeof createScheduleService>;
