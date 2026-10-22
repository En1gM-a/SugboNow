import { GNEWS_QUERIES, GNEWS_SOURCE, searchGnews } from "../integrations/gnews";
import type { AlertsRepository } from "../services/alerts.repository";
import { articlesToAlerts } from "../services/newsAlerts";
import type { NewsArticle } from "../types";
import { addHours } from "../utils/time";
import type { Logger } from "../utils/logger";
import type { Job } from "./types";

export interface IngestNewsDeps {
  apiKey?: string;
  alerts: Pick<AlertsRepository, "upsert">;
  logger: Logger;
  search?: (apiKey: string, query: string, since: Date) => Promise<NewsArticle[]>;
  // Pause between queries: the free plan allows about 1 request per second.
  delayMs?: number;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// GNews: Cebu articles about class suspensions, floods, closures, utilities
// and storms. 3 queries every 3 hours = 24 of the 100 free requests/day.
export function createIngestNewsJob(deps: IngestNewsDeps): Job {
  const search = deps.search ?? searchGnews;
  const delayMs = deps.delayMs ?? 1_500;
  return {
    name: "ingestNews",
    schedule: "20 */3 * * *", // every 3 hours at :20
    description: "GNews searches for Cebu advisories",
    async run(now) {
      if (!deps.apiKey) return { status: "skipped", detail: "GNEWS_API_KEY is not set" };
      const since = addHours(now, -48);
      const articles: NewsArticle[] = [];
      let failed = 0;
      for (const [index, query] of GNEWS_QUERIES.entries()) {
        if (index > 0) await wait(delayMs);
        try {
          articles.push(...(await search(deps.apiKey, query, since)));
        } catch (error) {
          failed++;
          deps.logger.warn("GNews query failed", { error: error instanceof Error ? error.message : String(error) });
        }
      }
      if (failed === GNEWS_QUERIES.length) return { status: "failed", detail: "Every GNews query failed" };
      const alerts = articlesToAlerts(articles, GNEWS_SOURCE, now);
      const saved = await deps.alerts.upsert(alerts, { updateExisting: false });
      return { status: "ok", detail: `${articles.length} articles, ${alerts.length} kept, ${failed} queries failed`, saved };
    },
  };
}
