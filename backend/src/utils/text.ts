// Text helpers for ingested content.

import { createHash } from "node:crypto";
import { load } from "cheerio";

// Plain text from an HTML snippet, with entities decoded and spaces collapsed.
export function htmlToText(html: string): string {
  return load(html, null, false).root().text().replace(/\s+/g, " ").trim();
}

// Shortens text to `max` characters at a word boundary when possible.
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function sha1(text: string): string {
  return createHash("sha1").update(text).digest("hex");
}

// The URL without query string, fragment, or trailing slash, so the same
// article linked from two sources compares equal.
export function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

// One fingerprint per article URL, shared by every news source, so an
// article seen in SunStar's feed and in GNews is stored once.
export function newsFingerprint(url: string): string {
  return `news:${sha1(canonicalUrl(url))}`;
}
