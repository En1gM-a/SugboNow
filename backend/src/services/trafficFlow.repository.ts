// public.traffic_flow: the latest TomTom traffic flow for Metro Cebu, replaced
// by the traffic job and read by the API.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TrafficFlowLines, TrafficFlowRow } from "../types";
import { dbError } from "../utils/db";

const AREA = "metro_cebu";

export interface TrafficFlowRepository {
  // The saved flow. Given the `fetched_at` of a flow the caller already holds, null
  // when that is still the one saved, so its lines (about 400 KB) aren't read again.
  get(heldFetchedAt?: string): Promise<TrafficFlowRow | null>;
  // When the saved flow was fetched, without reading its lines.
  fetchedAt(): Promise<string | null>;
  save(lines: TrafficFlowLines, fetchedAt: Date): Promise<void>;
}

export function createTrafficFlowRepository(db: SupabaseClient): TrafficFlowRepository {
  return {
    async get(heldFetchedAt) {
      let query = db.from("traffic_flow").select("area, lines, fetched_at").eq("area", AREA);
      if (heldFetchedAt) query = query.neq("fetched_at", heldFetchedAt);
      const { data, error } = await query.maybeSingle();
      if (error) throw dbError(error);
      return (data as TrafficFlowRow | null) ?? null;
    },

    async fetchedAt() {
      const { data, error } = await db.from("traffic_flow").select("fetched_at").eq("area", AREA).maybeSingle();
      if (error) throw dbError(error);
      return (data as { fetched_at: string } | null)?.fetched_at ?? null;
    },

    async save(lines, fetchedAt) {
      const { error } = await db
        .from("traffic_flow")
        .upsert({ area: AREA, lines, fetched_at: fetchedAt.toISOString() }, { onConflict: "area" });
      if (error) throw dbError(error);
    },
  };
}
