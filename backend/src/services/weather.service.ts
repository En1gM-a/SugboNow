// Weather for the API: the latest snapshot per Metro Cebu area, saved hourly
// by the weather job.

import { getArea } from "../config/areas";
import type { WeatherSnapshotRow } from "../types";
import { notFound } from "../utils/errors";
import type { WeatherRepository } from "./weather.repository";

const HOUR_MS = 3_600_000;
// The weather job runs hourly, so an observation is up to about 80 minutes old
// just before the next run. Older means the job stopped running.
const STALE_AFTER_MS = 90 * 60_000;

// A snapshot is only as fresh as the last weather job. Drop the forecast hours
// already gone, and once the observation is stale, show this hour from the saved
// 24-hour forecast instead. Manila is a whole number of hours ahead of UTC, so
// UTC hour boundaries are Manila's too.
export function weatherAt(row: WeatherSnapshotRow, now: Date): WeatherSnapshotRow {
  const thisHour = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
  const hourly = row.hourly_forecast.filter((hour) => Date.parse(hour.time) >= thisHour);
  // The forecast no longer reaches this hour (no job for a day): keep what was saved.
  if (hourly.length === 0 || Date.parse(hourly[0].time) !== thisHour) return row;
  if (now.getTime() - Date.parse(row.observed_at) <= STALE_AFTER_MS) return { ...row, hourly_forecast: hourly };
  const { time: _time, ...forecast } = hourly[0];
  return { ...row, current_conditions: { ...row.current_conditions, ...forecast }, hourly_forecast: hourly };
}

export function createWeatherService(weather: WeatherRepository) {
  return {
    list(): Promise<WeatherSnapshotRow[]> {
      const now = new Date();
      return weather.list().then((rows) => rows.map((row) => weatherAt(row, now)));
    },

    async get(areaSlug: string): Promise<WeatherSnapshotRow> {
      if (!getArea(areaSlug)) throw notFound("Unknown area. Use a slug from GET /api/areas.");
      const snapshot = await weather.get(areaSlug);
      if (!snapshot) throw notFound("No weather saved for this area yet.");
      return weatherAt(snapshot, new Date());
    },
  };
}

export type WeatherService = ReturnType<typeof createWeatherService>;
