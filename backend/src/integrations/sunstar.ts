// SunStar (sunstar.com.ph). Public RSS, no key. The Cebu-only collection feed
// is currently empty, so the local-news feed (all SunStar editions) is read
// and filtered to Cebu stories by URL path or category.

import type { NewsArticle } from "../types";
import { fetchText } from "./http";
import { parseRss, type RssItem } from "./rss";

export const SUNSTAR_SOURCE = "sunstar";

export function isCebuSunstarItem(item: RssItem): boolean {
  return /sunstar\.com\.ph\/cebu\//i.test(item.link) || item.categories.some((category) => /^cebu$/i.test(category));
}

export function sunstarArticles(xml: string): NewsArticle[] {
  return parseRss(xml)
    .filter(isCebuSunstarItem)
    .map((item) => ({
      title: item.title,
      url: item.link,
      summary: item.description,
      publishedAt: item.publishedAt,
      imageUrl: item.imageUrl,
      extra: { publisher: "SunStar", guid: item.guid },
    }));
}

export async function fetchSunstarArticles(feedUrl: string): Promise<NewsArticle[]> {
  return sunstarArticles(await fetchText("SunStar", feedUrl, { headers: { Accept: "application/rss+xml, application/xml" } }));
}
