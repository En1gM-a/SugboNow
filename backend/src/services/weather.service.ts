// Weather for the API: the latest snapshot per Metro Cebu area, saved hourly
// by the weather job.

import { getArea } from "../config/areas";
import type { WeatherSnapshotRow } from "../types";
import { notFound } from "../utils/errors";
import type { WeatherRepository } from "./weather.repository";

export function createWeatherService(weather: WeatherRepository) {
  return {
    list(): Promise<WeatherSnapshotRow[]> {
      return weather.list();
    },

    async get(areaSlug: string): Promise<WeatherSnapshotRow> {
      if (!getArea(areaSlug)) throw notFound("Unknown area. Use a slug from GET /api/areas.");
      const snapshot = await weather.get(areaSlug);
      if (!snapshot) throw notFound("No weather saved for this area yet.");
      return snapshot;
    },
  };
}

export type WeatherService = ReturnType<typeof createWeatherService>;
