// Official LGU Facebook posts: refresh on sign-in and read the latest saved posts.
//
// A refresh checks the signed-in user's subscribed LGU page at most once per
// interval, however many users sign in, and only one check per page runs at a
// time. New posts are inserted; posts already saved are left untouched.
// Posts announcing disruptions (class suspensions, floods, closures, …) are
// also saved as alerts.

import type { Logger } from "../utils/logger";
import type { LguPostRow, LguSource, NewAlert, ScrapedFbPost } from "../types";
import { categorizeLguPost, lguPostToAlert } from "./lguAlerts";

export interface LguPostsRepository {
  getSubscribedSlug(userId: string): Promise<string | null>;
  getSourceBySlug(slug: string): Promise<LguSource | null>;
  // Inserts posts whose (source, fb_post_id) is not saved yet; returns how many were new.
  insertNewPosts(sourceId: string, posts: ScrapedFbPost[]): Promise<number>;
  markFetched(sourceId: string, at: Date): Promise<void>;
  markFetchError(sourceId: string, message: string): Promise<void>;
  getLatestPosts(sourceId: string, limit: number): Promise<LguPostRow[]>;
}

export type ScrapePage = (pageUrl: string, limit: number) => Promise<ScrapedFbPost[]>;

export type RefreshStatus =
  | "no_subscription" // the user has not picked an LGU
  | "unknown_source" // the slug has no active source with a page URL
  | "disabled" // scraping is switched off; saved posts only
  | "fresh" // checked recently; saved posts are current
  | "refreshed" // checked now
  | "failed"; // the check failed; saved posts are still returned

export interface LatestPosts {
  source: LguSource | null;
  posts: LguPostRow[];
}

export interface RefreshResult extends LatestPosts {
  status: RefreshStatus;
  newPosts: number;
}

export interface LguPostsServiceOptions {
  repo: LguPostsRepository;
  scrape: ScrapePage;
  logger: Logger;
  scrapeEnabled: boolean;
  refreshIntervalMs: number;
  // Saves alerts made from posts; omitted in tests that don't need it.
  saveAlerts?: (alerts: NewAlert[]) => Promise<unknown>;
  postsPerFetch?: number;
  now?: () => Date;
}

export function createLguPostsService(options: LguPostsServiceOptions) {
  const { repo, scrape, logger, scrapeEnabled, refreshIntervalMs } = options;
  const postsPerFetch = options.postsPerFetch ?? 2;
  const now = options.now ?? (() => new Date());

  // Per-process state: checks in progress, and when each page was last
  // attempted (successful or not), so a failing page is not retried on every
  // sign-in. lgu_sources.last_fetched_at covers successful checks across
  // restarts and instances.
  const inFlight = new Map<string, Promise<{ status: RefreshStatus; newPosts: number }>>();
  const lastAttempt = new Map<string, number>();

  async function resolveSource(userId: string): Promise<{ status?: RefreshStatus; source: LguSource | null }> {
    const slug = await repo.getSubscribedSlug(userId);
    if (!slug) return { status: "no_subscription", source: null };
    const source = await repo.getSourceBySlug(slug);
    if (!source || !source.is_active || !source.fb_page_url) return { status: "unknown_source", source };
    return { source };
  }

  function isFresh(source: LguSource): boolean {
    const current = now().getTime();
    const attempted = lastAttempt.get(source.id);
    if (attempted !== undefined && current - attempted < refreshIntervalMs) return true;
    if (source.last_fetched_at) {
      const fetched = new Date(source.last_fetched_at).getTime();
      if (current - fetched < refreshIntervalMs) return true;
    }
    return false;
  }

  // An alert failure is logged but doesn't fail the refresh: the posts are saved.
  async function saveAlertsFor(source: LguSource, posts: ScrapedFbPost[]): Promise<void> {
    if (!options.saveAlerts) return;
    const alerts = posts
      .map((post) => lguPostToAlert(post, source, now()))
      .filter((alert): alert is NewAlert => alert !== null);
    if (alerts.length === 0) return;
    try {
      await options.saveAlerts(alerts);
    } catch (error) {
      logger.warn("Could not save alerts from LGU posts", {
        slug: source.slug,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function check(source: LguSource): Promise<{ status: RefreshStatus; newPosts: number }> {
    lastAttempt.set(source.id, now().getTime());
    try {
      const scraped = await scrape(source.fb_page_url as string, postsPerFetch);
      const posts = scraped.map((post) => ({ ...post, category: categorizeLguPost(post) }));
      const newPosts = await repo.insertNewPosts(source.id, posts);
      await repo.markFetched(source.id, now());
      await saveAlertsFor(source, posts);
      logger.info("Checked LGU Facebook page", { slug: source.slug, seen: posts.length, newPosts });
      return { status: "refreshed", newPosts };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("LGU Facebook check failed", { slug: source.slug, error: message });
      await repo.markFetchError(source.id, message).catch(() => undefined);
      return { status: "failed", newPosts: 0 };
    }
  }

  async function getLatest(source: LguSource | null, limit: number): Promise<LguPostRow[]> {
    return source ? repo.getLatestPosts(source.id, limit) : [];
  }

  return {
    async refreshForUser(userId: string, limit = postsPerFetch): Promise<RefreshResult> {
      const { status, source } = await resolveSource(userId);
      if (status) return { status, source, newPosts: 0, posts: await getLatest(source, limit) };
      const active = source as LguSource;

      let outcome: { status: RefreshStatus; newPosts: number };
      if (!scrapeEnabled) {
        outcome = { status: "disabled", newPosts: 0 };
      } else if (inFlight.has(active.id)) {
        outcome = await (inFlight.get(active.id) as Promise<{ status: RefreshStatus; newPosts: number }>);
      } else if (isFresh(active)) {
        outcome = { status: "fresh", newPosts: 0 };
      } else {
        const running = check(active).finally(() => inFlight.delete(active.id));
        inFlight.set(active.id, running);
        outcome = await running;
      }
      return { ...outcome, source: active, posts: await getLatest(active, limit) };
    },

    async getLatestForUser(userId: string, limit = postsPerFetch): Promise<LatestPosts> {
      const { source } = await resolveSource(userId);
      return { source, posts: await getLatest(source, limit) };
    },
  };
}

export type LguPostsService = ReturnType<typeof createLguPostsService>;
