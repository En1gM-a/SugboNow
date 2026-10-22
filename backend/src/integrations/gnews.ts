// GNews (gnews.io) search API. Free tier: 100 requests/day. The news job runs
// every 3 hours with the 3 queries below, so 24 requests/day.

import { mentionsCebu } from "../config/areas";
import type { NewsArticle } from "../types";
import { fetchJson } from "./http";

export const GNEWS_SOURCE = "gnews";

// Searches aimed at alert topics; each stays under GNews's 200-character
// limit. Results that turn out to be plain news are kept as news.
export const GNEWS_QUERIES = [
  'Cebu AND (brownout OR "power interruption" OR "water interruption" OR "no water")',
  'Cebu AND (flood OR flooding OR landslide OR "road closure" OR rerouting)',
  'Cebu AND ("class suspension" OR "classes suspended" OR "no classes" OR typhoon OR "storm signal")',
] as const;

interface GnewsResponse {
  totalArticles: number;
  articles: Array<{
    title: string;
    description: string | null;
    url: string;
    image: string | null;
    publishedAt: string;
    source?: { name?: string };
  }>;
}

export function gnewsArticles(response: GnewsResponse): NewsArticle[] {
  return response.articles
    .filter((article) => mentionsCebu(`${article.title} ${article.description ?? ""}`))
    .map((article) => ({
      title: article.title,
      url: article.url,
      summary: article.description || null,
      publishedAt: new Date(article.publishedAt),
      imageUrl: article.image || null,
      extra: { publisher: article.source?.name ?? null },
    }));
}

export async function searchGnews(apiKey: string, query: string, since: Date): Promise<NewsArticle[]> {
  const params = new URLSearchParams({
    q: query,
    lang: "en",
    country: "ph",
    max: "10",
    sortby: "publishedAt",
    from: since.toISOString().replace(/\.\d{3}Z$/, "Z"),
    apikey: apiKey,
  });
  return gnewsArticles(await fetchJson<GnewsResponse>("GNews", `https://gnews.io/api/v4/search?${params}`));
}
