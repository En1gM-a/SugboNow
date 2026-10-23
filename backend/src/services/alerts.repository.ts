// public.alerts: read for the API, written by ingestion jobs. Uses the
// service-role client; alerts are shared by every signed-in user.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertRow, AlertSeverity, AlertType, NewAlert } from "../types";
import { dbError, escapeLike } from "../utils/db";

export const ALERT_COLUMNS =
  "id, source, type, severity, title, summary, lat, lng, area_name, starts_at, ends_at, source_url, image_url, created_at";

export interface ActiveAlertsFilter {
  now: Date;
  // Include alerts starting up to this time (upcoming alerts).
  startsBefore: Date;
  types?: readonly AlertType[];
  severities?: readonly AlertSeverity[];
  area?: string;
  limit: number;
}

export interface NewsFilter {
  since: Date;
  sources: readonly string[];
  area?: string;
  limit: number;
}

export interface AlertsRepository {
  // Not yet ended (ends_at null or in the future) and started before `startsBefore`.
  listActive(filter: ActiveAlertsFilter): Promise<AlertRow[]>;
  // Newest first by publish time (starts_at), whether or not they have ended.
  listNews(filter: NewsFilter): Promise<AlertRow[]>;
  getById(id: string): Promise<AlertRow | null>;
  // Inserts new alerts by fingerprint. With updateExisting, alerts already
  // saved are refreshed (traffic, weather); otherwise they are left as is
  // (news). Returns how many rows were written.
  upsert(alerts: NewAlert[], options: { updateExisting: boolean }): Promise<number>;
}

// PostgREST filter values containing ":" or "." must be quoted inside or().
function quoted(value: string): string {
  return `"${value}"`;
}

function toColumns(alert: NewAlert) {
  return {
    source: alert.source,
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    summary: alert.summary,
    lat: alert.lat,
    lng: alert.lng,
    area_name: alert.areaName,
    starts_at: alert.startsAt,
    ends_at: alert.endsAt,
    source_url: alert.sourceUrl,
    image_url: alert.imageUrl,
    fingerprint: alert.fingerprint,
    raw: alert.raw,
  };
}

// One row per fingerprint (the last one wins): Postgres rejects an upsert
// that touches the same row twice.
export function dedupeByFingerprint(alerts: NewAlert[]): NewAlert[] {
  return [...new Map(alerts.map((alert) => [alert.fingerprint, alert])).values()];
}

export function createAlertsRepository(db: SupabaseClient): AlertsRepository {
  return {
    async listActive(filter) {
      let query = db
        .from("alerts")
        .select(ALERT_COLUMNS)
        .or(`ends_at.is.null,ends_at.gt.${quoted(filter.now.toISOString())}`)
        .or(`starts_at.is.null,starts_at.lte.${quoted(filter.startsBefore.toISOString())}`);
      if (filter.types) query = query.in("type", [...filter.types]);
      if (filter.severities) query = query.in("severity", [...filter.severities]);
      if (filter.area) query = query.ilike("area_name", `%${escapeLike(filter.area)}%`);
      const { data, error } = await query
        .order("starts_at", { ascending: false, nullsFirst: false })
        .limit(filter.limit);
      if (error) throw dbError(error);
      return (data ?? []) as AlertRow[];
    },

    async listNews(filter) {
      let query = db
        .from("alerts")
        .select(ALERT_COLUMNS)
        .in("source", [...filter.sources])
        .gte("starts_at", filter.since.toISOString());
      if (filter.area) query = query.ilike("area_name", `%${escapeLike(filter.area)}%`);
      const { data, error } = await query.order("starts_at", { ascending: false }).limit(filter.limit);
      if (error) throw dbError(error);
      return (data ?? []) as AlertRow[];
    },

    async getById(id) {
      const { data, error } = await db.from("alerts").select(ALERT_COLUMNS).eq("id", id).maybeSingle();
      if (error) throw dbError(error);
      return (data as AlertRow | null) ?? null;
    },

    async upsert(alerts, options) {
      const rows = dedupeByFingerprint(alerts).map(toColumns);
      let written = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const { data, error } = await db
          .from("alerts")
          .upsert(rows.slice(i, i + 200), { onConflict: "fingerprint", ignoreDuplicates: !options.updateExisting })
          .select("id");
        if (error) throw dbError(error);
        written += data?.length ?? 0;
      }
      return written;
    },
  };
}
