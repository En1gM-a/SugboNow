// Builds the real services, repositories and jobs from the environment.
// Used by server.ts and scripts/run-job.ts; tests build their own fakes.

import type { AppServices } from "./app";
import { env } from "./config/env";
import { createUserClient, supabaseAdmin } from "./config/supabase";
import { scrapeLatestPagePosts } from "./integrations/facebook";
import { buildJobs, type Job } from "./jobs";
import type { VerifyToken } from "./middleware/auth";
import { createAlertsRepository } from "./services/alerts.repository";
import { createAlertsService } from "./services/alerts.service";
import { createBriefWriter } from "./services/ai.service";
import { createBriefRepository } from "./services/brief.repository";
import { createBriefService } from "./services/brief.service";
import { createLguPostsRepository } from "./services/lguPosts.repository";
import { createLguPostsService } from "./services/lguPosts.service";
import { createLguSourcesRepository } from "./services/lguSources.repository";
import { createLocationsRepository } from "./services/locations.repository";
import { createLocationsService } from "./services/locations.service";
import { createProfileRepository } from "./services/profile.repository";
import { createProfileService } from "./services/profile.service";
import { createScheduleRepository } from "./services/schedule.repository";
import { createScheduleService } from "./services/schedule.service";
import { createWeatherRepository } from "./services/weather.repository";
import { createWeatherService } from "./services/weather.service";
import { logger } from "./utils/logger";

export interface Container {
  services: AppServices;
  jobs: Job[];
  verifyToken: VerifyToken;
}

export function createContainer(): Container {
  // Shared data (alerts, weather, LGU pages) uses the service-role client;
  // a user's own data uses a client that acts as that user (RLS applies).
  const alertsRepo = createAlertsRepository(supabaseAdmin);
  const weatherRepo = createWeatherRepository(supabaseAdmin);
  const lguSourcesRepo = createLguSourcesRepository(supabaseAdmin);
  const lguPostsRepo = createLguPostsRepository(supabaseAdmin);
  const locationsRepo = createLocationsRepository(createUserClient);

  const briefs = createBriefService({
    briefs: createBriefRepository(supabaseAdmin),
    alerts: alertsRepo,
    weather: weatherRepo,
    latestLguPost: async (slug) => {
      const source = await lguPostsRepo.getSourceBySlug(slug);
      if (!source) return null;
      const [post] = await lguPostsRepo.getLatestPosts(source.id, 1);
      return post
        ? { officialName: source.official_name ?? source.display_name, caption: post.caption, postedAt: post.posted_at }
        : null;
    },
    writer: createBriefWriter(env.AI_API_KEY),
    logger,
  });

  const services: AppServices = {
    profile: createProfileService({
      profiles: createProfileRepository(createUserClient),
      locations: locationsRepo,
      lguSources: lguSourcesRepo,
    }),
    locations: createLocationsService(locationsRepo),
    schedule: createScheduleService(createScheduleRepository(createUserClient), locationsRepo),
    alerts: createAlertsService({ alerts: alertsRepo, locations: locationsRepo }),
    weather: createWeatherService(weatherRepo),
    briefs,
    lguSources: lguSourcesRepo,
    lguPosts: createLguPostsService({
      repo: lguPostsRepo,
      scrape: (pageUrl, limit) => scrapeLatestPagePosts(pageUrl, { limit }),
      saveAlerts: (alerts) => alertsRepo.upsert(alerts, { updateExisting: false }),
      logger,
      scrapeEnabled: env.FB_SCRAPE_ENABLED,
      refreshIntervalMs: env.FB_REFRESH_INTERVAL_MINUTES * 60_000,
    }),
  };

  const jobs = buildJobs({
    alerts: alertsRepo,
    weather: weatherRepo,
    briefs,
    keys: { tomtom: env.TOMTOM_API_KEY, gnews: env.GNEWS_API_KEY, weatherApi: env.WEATHER_API_KEY },
    feeds: { sunstar: env.SUNSTAR_RSS_URL, cebuDailyNews: env.CDN_RSS_URL },
    logger,
  });

  const verifyToken: VerifyToken = async (token) => {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    return error || !data.user ? null : data.user.id;
  };

  return { services, jobs, verifyToken };
}
