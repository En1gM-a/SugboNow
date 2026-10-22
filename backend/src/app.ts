// Importable Express app factory. Services are passed in so tests can build
// the app without real Supabase or outside-service access.

import cors from "cors";
import express from "express";
import { createRequireAuth, type VerifyToken } from "./middleware/auth";
import { createErrorHandler } from "./middleware/errorHandler";
import { createAlertsRouter, createNewsRouter } from "./routes/alerts.routes";
import { createBriefRouter } from "./routes/brief.routes";
import { createLguPostsRouter } from "./routes/lguPosts.routes";
import { createLocationsRouter } from "./routes/locations.routes";
import { createProfileRouter } from "./routes/profile.routes";
import { createAreasRouter, createLguSourcesRouter } from "./routes/reference.routes";
import { createScheduleRouter } from "./routes/schedule.routes";
import { createWeatherRouter } from "./routes/weather.routes";
import type { AlertsService } from "./services/alerts.service";
import type { BriefService } from "./services/brief.service";
import type { LguPostsService } from "./services/lguPosts.service";
import type { LguSourcesRepository } from "./services/lguSources.repository";
import type { LocationsService } from "./services/locations.service";
import type { ProfileService } from "./services/profile.service";
import type { ScheduleService } from "./services/schedule.service";
import type { WeatherService } from "./services/weather.service";
import type { Logger } from "./utils/logger";

export interface AppServices {
  profile: ProfileService;
  locations: LocationsService;
  schedule: ScheduleService;
  alerts: AlertsService;
  weather: WeatherService;
  briefs: BriefService;
  lguSources: LguSourcesRepository;
  lguPosts: LguPostsService;
}

export interface AppDependencies {
  frontendOrigin: string;
  verifyToken: VerifyToken;
  services: AppServices;
  logger: Logger;
  now?: () => Date;
}

export function createApp(deps: AppDependencies) {
  const { services } = deps;
  const now = deps.now ?? (() => new Date());
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: deps.frontendOrigin }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Every other route needs a signed-in user.
  const auth = createRequireAuth(deps.verifyToken);
  app.use("/api/profile", auth, createProfileRouter(services.profile));
  app.use("/api/areas", auth, createAreasRouter());
  app.use("/api/lgu-sources", auth, createLguSourcesRouter(services.lguSources));
  app.use("/api/locations", auth, createLocationsRouter(services.locations));
  app.use("/api/schedule", auth, createScheduleRouter(services.schedule));
  app.use("/api/alerts", auth, createAlertsRouter(services.alerts, now));
  app.use("/api/news", auth, createNewsRouter(services.alerts));
  app.use("/api/weather", auth, createWeatherRouter(services.weather));
  app.use("/api/brief", auth, createBriefRouter(services.briefs, now));
  app.use("/api/lgu-posts", auth, createLguPostsRouter(services.lguPosts));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "not_found", message: "Not found." } });
  });
  app.use(createErrorHandler(deps.logger));

  return app;
}
