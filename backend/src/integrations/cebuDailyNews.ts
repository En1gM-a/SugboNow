// Cebu Daily News / CDN Digital (cebudailynews.inquirer.net). Uses the
// public RSS feed of the "Latest News" category. The site's WordPress REST
// API requires a login, and the feed is allowed by its robots.txt. The
// category also carries world and entertainment stories, so only items that
// mention Cebu or a Metro Cebu area are kept.
//
// Use the feed URL exactly as configured: some variants (for example a
// trailing slash) are answered with a bot-protection challenge (HTTP 403).

import { mentionsCebu } from "../config/areas";
import type { NewsArticle } from "../types";
import { fetchText } from "./http";
import { parseRss, type RssItem } from "./rss";

export const CEBU_DAILY_NEWS_SOURCE = "cebudailynews";

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const CLOCK_TOLERANCE_MS = 15 * 60 * 1000;

export function isCebuCdnItem(item: RssItem): boolean {
  return mentionsCebu([item.title, item.description ?? "", item.categories.join(" ")].join(" "));
}

// The feed labels Manila local time as UTC ("+0000"), so new items look up to
// 8 hours in the future. When the newest item is in the future, every item is
// shifted back 8 hours. If the feed is ever fixed, nothing is shifted.
export function correctFeedTimes(items: RssItem[], now: Date): RssItem[] {
  const newest = Math.max(0, ...items.map((item) => item.publishedAt?.getTime() ?? 0));
  if (newest <= now.getTime() + CLOCK_TOLERANCE_MS) return items;
  return items.map((item) => ({
    ...item,
    publishedAt: item.publishedAt ? new Date(item.publishedAt.getTime() - MANILA_OFFSET_MS) : null,
  }));
}

export function cebuDailyNewsArticles(xml: string, now: Date = new Date()): NewsArticle[] {
  return correctFeedTimes(parseRss(xml), now)
    .filter(isCebuCdnItem)
    .map((item) => ({
      title: item.title,
      url: item.link,
      summary: item.description,
      publishedAt: item.publishedAt,
      imageUrl: item.imageUrl,
      extra: { publisher: "Cebu Daily News", categories: item.categories.slice(0, 8) },
    }));
}

export async function fetchCebuDailyNewsArticles(feedUrl: string): Promise<NewsArticle[]> {
  return cebuDailyNewsArticles(
    await fetchText("Cebu Daily News", feedUrl, { headers: { Accept: "application/rss+xml, application/xml" } }),
  );
}
