// The signed-in user's recurring schedule (public.schedule_entries), read and
// written as that user so Row Level Security applies. Each entry comes back
// with its origin and destination places embedded.

import type { RequestUser, ScheduleRow, UserClientFactory } from "../types";
import { dbError } from "../utils/db";

export const SCHEDULE_COLUMNS = [
  "id, title, days_of_week, arrive_by, origin_location_id, destination_location_id, created_at, updated_at",
  "origin:locations!schedule_entries_origin_location_id_fkey(id, label, kind)",
  "destination:locations!schedule_entries_destination_location_id_fkey(id, label, kind)",
].join(", ");

export interface ScheduleInput {
  title: string;
  daysOfWeek: number[];
  arriveBy: string; // "HH:MM"
  originLocationId: string;
  destinationLocationId: string;
}

export interface ScheduleRepository {
  list(user: RequestUser): Promise<ScheduleRow[]>;
  create(user: RequestUser, input: ScheduleInput): Promise<ScheduleRow>;
  update(user: RequestUser, id: string, input: ScheduleInput): Promise<ScheduleRow | null>;
  // False when there was no such entry.
  remove(user: RequestUser, id: string): Promise<boolean>;
}

function toColumns(input: ScheduleInput) {
  return {
    title: input.title,
    days_of_week: input.daysOfWeek,
    arrive_by: input.arriveBy,
    origin_location_id: input.originLocationId,
    destination_location_id: input.destinationLocationId,
  };
}

export function createScheduleRepository(clientFor: UserClientFactory): ScheduleRepository {
  return {
    async list(user) {
      const { data, error } = await clientFor(user.accessToken)
        .from("schedule_entries")
        .select(SCHEDULE_COLUMNS)
        .eq("user_id", user.id)
        .order("arrive_by", { ascending: true });
      if (error) throw dbError(error);
      return (data ?? []) as unknown as ScheduleRow[];
    },

    async create(user, input) {
      const { data, error } = await clientFor(user.accessToken)
        .from("schedule_entries")
        .insert({ user_id: user.id, ...toColumns(input) })
        .select(SCHEDULE_COLUMNS)
        .single();
      if (error) throw dbError(error);
      return data as unknown as ScheduleRow;
    },

    async update(user, id, input) {
      const { data, error } = await clientFor(user.accessToken)
        .from("schedule_entries")
        .update(toColumns(input))
        .eq("id", id)
        .eq("user_id", user.id)
        .select(SCHEDULE_COLUMNS)
        .maybeSingle();
      if (error) throw dbError(error);
      return (data as unknown as ScheduleRow | null) ?? null;
    },

    async remove(user, id) {
      const { data, error } = await clientFor(user.accessToken)
        .from("schedule_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id");
      if (error) throw dbError(error);
      return (data ?? []).length > 0;
    },
  };
}
