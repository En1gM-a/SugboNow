// public.lgu_sources: the official LGU pages users can follow.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LguSource } from "../types";
import { dbError } from "../utils/db";

const SOURCE_COLUMNS =
  "id, slug, display_name, official_name, official_title, lgu_type, fb_page_url, is_active, last_fetched_at";

export interface LguSourcesRepository {
  listActive(): Promise<LguSource[]>;
  isActiveSlug(slug: string): Promise<boolean>;
}

export function createLguSourcesRepository(db: SupabaseClient): LguSourcesRepository {
  return {
    async listActive() {
      const { data, error } = await db
        .from("lgu_sources")
        .select(SOURCE_COLUMNS)
        .eq("is_active", true)
        .order("display_name");
      if (error) throw dbError(error);
      return (data ?? []) as LguSource[];
    },

    async isActiveSlug(slug) {
      const { data, error } = await db
        .from("lgu_sources")
        .select("id")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw dbError(error);
      return data !== null;
    },
  };
}
