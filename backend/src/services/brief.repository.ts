// Data for building daily briefs (public.daily_briefs plus the user's
// profile, places and schedule). Uses the service-role client because the
// brief job runs without a signed-in user; every query filters by user id.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyBriefRow, LocationRow, ProfileRow, ScheduleRow } from "../types";
import { dbError } from "../utils/db";
import { LOCATION_COLUMNS } from "./locations.repository";
import { SCHEDULE_COLUMNS } from "./schedule.repository";

const BRIEF_COLUMNS = "id, user_id, brief_date, content, alert_ids, created_at, updated_at";

export type BriefProfile = Pick<ProfileRow, "first_name" | "display_name" | "city" | "subscribed_mayor">;

export interface SaveBriefInput {
  userId: string;
  date: string; // YYYY-MM-DD
  content: string;
  alertIds: string[];
}

export interface BriefRepository {
  getProfile(userId: string): Promise<BriefProfile | null>;
  listLocations(userId: string): Promise<LocationRow[]>;
  listSchedule(userId: string): Promise<ScheduleRow[]>;
  // Users with at least one schedule entry on this weekday (0 = Sunday).
  listUserIdsWithScheduleOn(weekday: number): Promise<string[]>;
  getBrief(userId: string, date: string): Promise<DailyBriefRow | null>;
  // Creates or replaces the user's brief for that date.
  saveBrief(input: SaveBriefInput): Promise<DailyBriefRow>;
}

export function createBriefRepository(db: SupabaseClient): BriefRepository {
  return {
    async getProfile(userId) {
      const { data, error } = await db
        .from("profiles")
        .select("first_name, display_name, city, subscribed_mayor")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw dbError(error);
      return (data as BriefProfile | null) ?? null;
    },

    async listLocations(userId) {
      const { data, error } = await db
        .from("locations")
        .select(LOCATION_COLUMNS)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw dbError(error);
      return (data ?? []) as LocationRow[];
    },

    async listSchedule(userId) {
      const { data, error } = await db
        .from("schedule_entries")
        .select(SCHEDULE_COLUMNS)
        .eq("user_id", userId)
        .order("arrive_by", { ascending: true });
      if (error) throw dbError(error);
      return (data ?? []) as unknown as ScheduleRow[];
    },

    async listUserIdsWithScheduleOn(weekday) {
      const { data, error } = await db
        .from("schedule_entries")
        .select("user_id")
        .contains("days_of_week", [weekday]);
      if (error) throw dbError(error);
      return [...new Set((data ?? []).map((row) => (row as { user_id: string }).user_id))];
    },

    async getBrief(userId, date) {
      const { data, error } = await db
        .from("daily_briefs")
        .select(BRIEF_COLUMNS)
        .eq("user_id", userId)
        .eq("brief_date", date)
        .maybeSingle();
      if (error) throw dbError(error);
      return (data as DailyBriefRow | null) ?? null;
    },

    async saveBrief(input) {
      const { data, error } = await db
        .from("daily_briefs")
        .upsert(
          { user_id: input.userId, brief_date: input.date, content: input.content, alert_ids: input.alertIds },
          { onConflict: "user_id,brief_date" },
        )
        .select(BRIEF_COLUMNS)
        .single();
      if (error) throw dbError(error);
      return data as DailyBriefRow;
    },
  };
}
