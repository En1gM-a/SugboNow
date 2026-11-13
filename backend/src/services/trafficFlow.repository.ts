// public.traffic_flow: the latest TomTom traffic flow for Metro Cebu, replaced
// by the traffic job and read by the API.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TrafficFlowLines, TrafficFlowRow } from "../types";
import { dbError } from "../utils/db";

const AREA = "metro_cebu";

export interface TrafficFlowRepository {
  get(): Promise<TrafficFlowRow | null>;
  save(lines: TrafficFlowLines, fetchedAt: Date): Promise<void>;
}

export function createTrafficFlowRepository(db: SupabaseClient): TrafficFlowRepository {
  return {
    async get() {
      const { data, error } = await db.from("traffic_flow").select("area, lines, fetched_at").eq("area", AREA).maybeSingle();
      if (error) throw dbError(error);
      return (data as TrafficFlowRow | null) ?? null;
    },

    async save(lines, fetchedAt) {
      const { error } = await db
        .from("traffic_flow")
        .upsert({ area: AREA, lines, fetched_at: fetchedAt.toISOString() }, { onConflict: "area" });
      if (error) throw dbError(error);
    },
  };
}
