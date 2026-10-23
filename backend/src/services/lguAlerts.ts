// Turns official LGU Facebook posts into alerts when they announce something
// that disrupts daily life (class suspensions, floods, road closures,
// brownouts, …). Ordinary posts (events, greetings, projects) stay posts only.

import { getArea } from "../config/areas";
import type { LguSource, NewAlert, ScrapedFbPost } from "../types";
import { addHours } from "../utils/time";
import { truncate } from "../utils/text";
import { classifyAdvisory, isAlert, lguPostCategory, plainText } from "./alertClassifier";

export const FACEBOOK_SOURCE = "facebook";

// lgu_posts.category for a post.
export function categorizeLguPost(post: ScrapedFbPost): string {
  return lguPostCategory(classifyAdvisory(post.caption ?? ""));
}

export function lguPostToAlert(post: ScrapedFbPost, source: LguSource, now: Date): NewAlert | null {
  const caption = post.caption ? plainText(post.caption).trim() : "";
  if (!caption) return null;
  const classification = classifyAdvisory(caption);
  if (!isAlert(classification)) return null;

  const firstLine = caption.split("\n").find((line) => line.trim())?.trim() ?? caption;
  // City pages map to their area; the province page has no single point.
  const area = getArea(source.slug);
  const postedAt = post.postedAt ?? now;
  const image = post.media.find((item) => item.type === "image");

  return {
    source: FACEBOOK_SOURCE,
    type: classification.type,
    severity: classification.severity,
    title: truncate(`${source.display_name}: ${firstLine}`, 160),
    summary: truncate(caption.replace(/\s+/g, " "), 300),
    lat: area?.lat ?? null,
    lng: area?.lng ?? null,
    areaName: area?.name ?? source.display_name,
    startsAt: postedAt.toISOString(),
    endsAt: addHours(postedAt, classification.ttlHours).toISOString(),
    sourceUrl: post.permalink,
    imageUrl: image?.url ?? null,
    fingerprint: `facebook:${source.slug}:${post.fbPostId}`,
    raw: { lgu: source.slug, fb_post_id: post.fbPostId, official: source.official_name },
  };
}
