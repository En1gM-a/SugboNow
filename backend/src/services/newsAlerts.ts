// Turns news articles from any source (SunStar, Cebu Daily News, GNews) into
// alerts: classified by keyword, placed on the map when a Metro Cebu area is
// named, and fingerprinted by URL so one article is stored once.
//
// Scraping etiquette (README): store only the headline, a short snippet and
// the link, and always link back to the source.

import { findAreaInText } from "../config/areas";
import type { NewAlert, NewsArticle } from "../types";
import { addHours } from "../utils/time";
import { newsFingerprint, truncate } from "../utils/text";
import { classifyAdvisory } from "./alertClassifier";

// Older articles are not ingested.
export const MAX_ARTICLE_AGE_HOURS = 72;

export function articleToAlert(article: NewsArticle, source: string, now: Date): NewAlert | null {
  const title = article.title.trim();
  if (!title || !article.url || !article.publishedAt) return null;
  const ageHours = (now.getTime() - article.publishedAt.getTime()) / 3_600_000;
  if (ageHours > MAX_ARTICLE_AGE_HOURS || ageHours < -1) return null;

  const summary = article.summary ? truncate(article.summary, 300) : null;
  const text = `${title}. ${summary ?? ""}`;
  const classification = classifyAdvisory(text);
  const area = findAreaInText(text);

  return {
    source,
    type: classification.type,
    severity: classification.severity,
    title: truncate(title, 200),
    summary,
    lat: area?.lat ?? null,
    lng: area?.lng ?? null,
    areaName: area?.name ?? "Cebu",
    startsAt: article.publishedAt.toISOString(),
    endsAt: addHours(article.publishedAt, classification.ttlHours).toISOString(),
    sourceUrl: article.url,
    imageUrl: article.imageUrl,
    fingerprint: newsFingerprint(article.url),
    raw: { published_at: article.publishedAt.toISOString(), ...article.extra },
  };
}

export function articlesToAlerts(articles: NewsArticle[], source: string, now: Date): NewAlert[] {
  return articles
    .map((article) => articleToAlert(article, source, now))
    .filter((alert): alert is NewAlert => alert !== null);
}
