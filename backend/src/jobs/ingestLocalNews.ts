import { CEBU_DAILY_NEWS_SOURCE, fetchCebuDailyNewsArticles } from "../integrations/cebuDailyNews";
import { SUNSTAR_SOURCE, fetchSunstarArticles } from "../integrations/sunstar";
import type { AlertsRepository } from "../services/alerts.repository";
import { articlesToAlerts } from "../services/newsAlerts";
import type { NewsArticle } from "../types";
import type { Job } from "./types";

export interface IngestFeedDeps {
  feedUrl: string;
  alerts: Pick<AlertsRepository, "upsert">;
  fetchArticles?: (feedUrl: string) => Promise<NewsArticle[]>;
}

interface FeedJobConfig {
  name: string;
  schedule: string;
  description: string;
  source: string;
  fetchArticles: (feedUrl: string) => Promise<NewsArticle[]>;
}

// Local news RSS feed → news items, and alerts when an article is about a
// disruption. Already-saved articles are left as they are.
function createFeedJob(config: FeedJobConfig, deps: IngestFeedDeps): Job {
  const fetchArticles = deps.fetchArticles ?? config.fetchArticles;
  return {
    name: config.name,
    schedule: config.schedule,
    description: config.description,
    async run(now) {
      const articles = await fetchArticles(deps.feedUrl);
      const alerts = articlesToAlerts(articles, config.source, now);
      const saved = await deps.alerts.upsert(alerts, { updateExisting: false });
      return { status: "ok", detail: `${articles.length} Cebu articles, ${alerts.length} recent`, saved };
    },
  };
}

export function createIngestSunstarJob(deps: IngestFeedDeps): Job {
  return createFeedJob(
    {
      name: "ingestSunstar",
      schedule: "0,30 * * * *", // every 30 minutes
      description: "SunStar Cebu stories (RSS)",
      source: SUNSTAR_SOURCE,
      fetchArticles: fetchSunstarArticles,
    },
    deps,
  );
}

export function createIngestCebuDailyNewsJob(deps: IngestFeedDeps): Job {
  return createFeedJob(
    {
      name: "ingestCebuDailyNews",
      schedule: "15,45 * * * *", // every 30 minutes, offset from SunStar
      description: "Cebu Daily News latest news (RSS)",
      source: CEBU_DAILY_NEWS_SOURCE,
      fetchArticles: fetchCebuDailyNewsArticles,
    },
    deps,
  );
}
