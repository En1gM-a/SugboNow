// Minimal RSS 2.0 reader for news feeds (SunStar, Cebu Daily News).

import { load } from "cheerio";
import { htmlToText } from "../utils/text";

export interface RssItem {
  title: string;
  link: string;
  guid: string | null;
  description: string | null; // plain text
  publishedAt: Date | null;
  categories: string[];
  imageUrl: string | null;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseRss(xml: string): RssItem[] {
  const $ = load(xml, { xml: true });
  return $("item")
    .toArray()
    .map((element) => {
      const item = $(element);
      const text = (selector: string) => item.children(selector).first().text().trim();
      const description = htmlToText(text("description"));
      return {
        title: htmlToText(text("title")),
        link: text("link"),
        guid: text("guid") || null,
        description: description || null,
        publishedAt: parseDate(text("pubDate")),
        categories: item
          .children("category")
          .toArray()
          .map((category) => $(category).text().trim())
          .filter(Boolean),
        imageUrl:
          item.find("media\\:content[medium='image']").first().attr("url") ??
          item.find("media\\:content").first().attr("url") ??
          item.children("enclosure[type^='image']").first().attr("url") ??
          null,
      };
    })
    .filter((item) => item.title && item.link);
}
