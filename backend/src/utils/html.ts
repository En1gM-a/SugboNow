// HTML helpers for ingested content. Kept apart from utils/text.ts so that only
// the jobs load cheerio: the API uses the text helpers and never parses HTML.

import { load } from "cheerio";

// Plain text from an HTML snippet, with entities decoded and spaces collapsed.
export function htmlToText(html: string): string {
  return load(html, null, false).root().text().replace(/\s+/g, " ").trim();
}
