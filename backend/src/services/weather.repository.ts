// public.weather_snapshots: the latest conditions and hourly forecast per
// Metro Cebu area, written by the weather job and read by the API.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WeatherConditions, WeatherHour, WeatherSnapshotRow } from "../types";
import { dbError } from "../utils/db";

const WEATHER_COLUMNS =
  "area_slug, area_name, lat, lng, observed_at, current_conditions, hourly_forecast, fetched_at";

export interface WeatherSnapshotInput {
  areaSlug: string;
  areaName: string;
  lat: number;
  lng: number;
  observedAt: string;
  current: WeatherConditions;
  hourly: WeatherHour[];
}

export interface WeatherRepository {
  list(): Promise<WeatherSnapshotRow[]>;
  get(areaSlug: string): Promise<WeatherSnapshotRow | null>;
  save(snapshot: WeatherSnapshotInput): Promise<void>;
}

export function createWeatherRepository(db: SupabaseClient): WeatherRepository {
  return {
    async list() {
      const { data, error } = await db.from("weather_snapshots").select(WEATHER_COLUMNS).order("area_name");
      if (error) throw dbError(error);
      return (data ?? []) as WeatherSnapshotRow[];
    },

    async get(areaSlug) {
      const { data, error } = await db
        .from("weather_snapshots")
        .select(WEATHER_COLUMNS)
        .eq("area_slug", areaSlug)
        .maybeSingle();
      if (error) throw dbError(error);
      return (data as WeatherSnapshotRow | null) ?? null;
    },

    async save(snapshot) {
      const { error } = await db.from("weather_snapshots").upsert(
        {
          area_slug: snapshot.areaSlug,
          area_name: snapshot.areaName,
          lat: snapshot.lat,
          lng: snapshot.lng,
          observed_at: snapshot.observedAt,
          current_conditions: snapshot.current,
          hourly_forecast: snapshot.hourly,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "area_slug" },
      );
      if (error) throw dbError(error);
    },
  };
}
