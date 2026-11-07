import { cebuWeatherAlerts, fetchPagasaPage, PAGASA_VISAYAS_URL, parsePagasaRegional } from "../integrations/pagasa";
import type { AlertsRepository } from "../services/alerts.repository";
import type { WeatherRepository } from "../services/weather.repository";
import type { Job } from "./types";

export interface IngestPagasaDeps {
  alerts: Pick<AlertsRepository, "upsert">;
  weather: Pick<WeatherRepository, "saveRegionalForecast">;
  url?: string;
  fetchPage?: (url: string) => Promise<string>;
}

// PAGASA Visayas: the regional forecast and outlook for the Weather page, and
// Cebu's thunderstorm advisories as weather alerts.
export function createIngestPagasaJob(deps: IngestPagasaDeps): Job {
  const url = deps.url ?? PAGASA_VISAYAS_URL;
  const fetchPage = deps.fetchPage ?? fetchPagasaPage;
  return {
    name: "ingestPagasa",
    schedule: "10,40 * * * *", // every 30 minutes; thunderstorm advisories are re-issued about hourly
    description: "PAGASA Visayas forecast, outlook and Cebu thunderstorm advisories",
    async run(now) {
      const page = parsePagasaRegional(await fetchPage(url));
      if (page.periods.length === 0 && page.outlook.length === 0) {
        return { status: "failed", detail: "No forecast or outlook found on the PAGASA page (layout changed?)" };
      }
      await deps.weather.saveRegionalForecast({
        region: "visayas",
        issuedAt: page.issuedAt?.toISOString() ?? null,
        periods: page.periods,
        outlookIssuedAt: page.outlookIssuedAt?.toISOString() ?? null,
        outlook: page.outlook,
        rainfallWarning: page.rainfallWarning,
        sourceUrl: url,
      });
      const alerts = cebuWeatherAlerts(page.advisories, now, url);
      const savedAlerts = await deps.alerts.upsert(alerts, { updateExisting: false });
      return {
        status: "ok",
        detail: `${page.periods.length} forecast periods, ${page.outlook.length} outlook days, ${alerts.length} Cebu thunderstorm alerts`,
        saved: 1 + savedAlerts,
      };
    },
  };
}
