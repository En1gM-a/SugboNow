import { CEBU_AREAS, type CebuArea } from "../config/areas";
import {
  fetchWeatherForecast,
  officialWeatherAlerts,
  rainAlert,
  toWeatherSnapshot,
  type WeatherApiForecast,
} from "../integrations/weatherapi";
import type { AlertsRepository } from "../services/alerts.repository";
import type { WeatherRepository } from "../services/weather.repository";
import type { NewAlert } from "../types";
import type { Logger } from "../utils/logger";
import type { Job } from "./types";

export interface IngestWeatherDeps {
  apiKey?: string;
  alerts: Pick<AlertsRepository, "upsert">;
  weather: Pick<WeatherRepository, "save">;
  logger: Logger;
  fetchForecast?: (apiKey: string, area: CebuArea) => Promise<WeatherApiForecast>;
}

// WeatherAPI.com: current conditions and forecast per Metro Cebu area, plus
// rain and official-warning alerts.
export function createIngestWeatherJob(deps: IngestWeatherDeps): Job {
  const fetchForecast = deps.fetchForecast ?? fetchWeatherForecast;
  return {
    name: "ingestWeather",
    schedule: "5 * * * *", // hourly at :05
    description: "WeatherAPI.com conditions and forecast per Metro Cebu area",
    async run(now) {
      if (!deps.apiKey) return { status: "skipped", detail: "WEATHER_API_KEY is not set" };
      const alerts: NewAlert[] = [];
      let saved = 0;
      let failed = 0;
      for (const area of CEBU_AREAS) {
        try {
          const forecast = await fetchForecast(deps.apiKey, area);
          await deps.weather.save(toWeatherSnapshot(area, forecast, now));
          saved++;
          const rain = rainAlert(area, forecast, now);
          if (rain) alerts.push(rain);
          alerts.push(...officialWeatherAlerts(area, forecast, now));
        } catch (error) {
          failed++;
          deps.logger.warn("Weather fetch failed", {
            area: area.slug,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      if (saved === 0) return { status: "failed", detail: `All ${failed} areas failed` };
      const savedAlerts = await deps.alerts.upsert(alerts, { updateExisting: true });
      return {
        status: "ok",
        detail: `${saved} areas saved, ${failed} failed, ${alerts.length} weather alerts`,
        saved: saved + savedAlerts,
      };
    },
  };
}
