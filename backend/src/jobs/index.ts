// All scheduled jobs, built from their dependencies.

import type { AlertsRepository } from "../services/alerts.repository";
import type { BriefService } from "../services/brief.service";
import type { WeatherRepository } from "../services/weather.repository";
import type { Logger } from "../utils/logger";
import { createGenerateBriefsJob } from "./generateBriefs";
import { createIngestCebuDailyNewsJob, createIngestSunstarJob } from "./ingestLocalNews";
import { createIngestNewsJob } from "./ingestNews";
import { createIngestTrafficJob } from "./ingestTraffic";
import { createIngestWeatherJob } from "./ingestWeather";
import type { Job } from "./types";

export interface JobDependencies {
  alerts: Pick<AlertsRepository, "upsert">;
  weather: Pick<WeatherRepository, "save">;
  briefs: Pick<BriefService, "generateAll">;
  keys: { tomtom?: string; gnews?: string; weatherApi?: string };
  feeds: { sunstar: string; cebuDailyNews: string };
  logger: Logger;
}

export function buildJobs(deps: JobDependencies): Job[] {
  return [
    createIngestTrafficJob({ apiKey: deps.keys.tomtom, alerts: deps.alerts }),
    createIngestWeatherJob({ apiKey: deps.keys.weatherApi, alerts: deps.alerts, weather: deps.weather, logger: deps.logger }),
    createIngestNewsJob({ apiKey: deps.keys.gnews, alerts: deps.alerts, logger: deps.logger }),
    createIngestSunstarJob({ feedUrl: deps.feeds.sunstar, alerts: deps.alerts }),
    createIngestCebuDailyNewsJob({ feedUrl: deps.feeds.cebuDailyNews, alerts: deps.alerts }),
    createGenerateBriefsJob(deps.briefs),
  ];
}

export type { Job, JobResult } from "./types";
