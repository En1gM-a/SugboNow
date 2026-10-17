// Facebook integration: reads the newest posts of a public page, logged out.
//
// Facebook embeds each post as a GraphQL "Story" object, both in the page's
// <script type="application/json"> blocks and in the /api/graphql responses it
// loads while scrolling. We read those objects instead of the visible layout,
// which changes far more often. The Story objects also contain top comments
// and commenter profiles: we only ever extract the page's own post fields and
// never keep the raw objects.

import { createHash } from "node:crypto";
import { chromium, type Browser } from "playwright";
import type { FbMediaItem, FbPostType, ScrapedFbPost } from "../types";

type Json = Record<string, unknown>;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function get(value: unknown, ...keys: Array<string | number>): unknown {
  let current: unknown = value;
  for (const key of keys) {
    if (Array.isArray(current) && typeof key === "number") current = current[key];
    else if (isObject(current) && typeof key === "string") current = current[key];
    else return undefined;
  }
  return current;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// Depth-first search with an explicit stack; returns the first match.
function findFirst<T>(root: unknown, match: (node: Json) => T | undefined): T | undefined {
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) stack.push(node[i]);
    } else if (isObject(node)) {
      const found = match(node);
      if (found !== undefined) return found;
      const values = Object.values(node);
      for (let i = values.length - 1; i >= 0; i--) stack.push(values[i]);
    }
  }
  return undefined;
}

function isPostStory(node: Json): boolean {
  return node.__typename === "Story" && typeof node.post_id === "string" && typeof node.creation_time === "number";
}

// Adds every post Story found in `payload` to `into`, keyed by post_id. Does
// not descend into a Story once found: the same post is nested inside itself
// under comet_sections, and a shared post's original lives in attached_story.
export function collectStories(payload: unknown, into: Map<string, Json>): void {
  const stack: unknown[] = [payload];
  while (stack.length > 0) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      for (const item of node) stack.push(item);
    } else if (isObject(node)) {
      if (isPostStory(node)) {
        const id = node.post_id as string;
        if (!into.has(id)) into.set(id, node);
        continue;
      }
      for (const value of Object.values(node)) stack.push(value);
    }
  }
}

// Facebook wraps outbound links as l.facebook.com/l.php?u=<target>.
function unwrapLink(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "l.facebook.com" && parsed.searchParams.get("u")) {
      return parsed.searchParams.get("u") as string;
    }
  } catch {
    // Not a valid URL; keep as is.
  }
  return url;
}

function isFacebookUrl(url: string): boolean {
  try {
    return /(^|\.)facebook\.com$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function stripQuery(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function mediaItem(media: unknown): { item: FbMediaItem; id: string | null } | null {
  if (!isObject(media)) return null;
  const id = str(media.id);
  if (media.__typename === "Photo") {
    const full = isObject(media.viewer_image) ? media.viewer_image : media.image;
    const url = str(get(full, "uri"));
    if (!url) return null;
    return {
      id,
      item: {
        type: "image",
        url,
        thumbnail_url: str(get(media, "image", "uri")),
        storage_path: null,
        width: num(get(full, "width")),
        height: num(get(full, "height")),
        alt_text: str(media.accessibility_caption),
      },
    };
  }
  if (media.__typename === "Video") {
    // The playable stream URL is short-lived and session-bound, so store the
    // video's page URL plus its thumbnail.
    const url = str(media.permalink_url) ?? str(media.url);
    if (!url) return null;
    const durationMs = num(media.playable_duration_in_ms);
    return {
      id,
      item: {
        type: "video",
        url: stripQuery(url) ?? url,
        thumbnail_url:
          str(get(media, "preferred_thumbnail", "image", "uri")) ??
          str(get(media, "thumbnailImage", "uri")) ??
          str(get(media, "image", "uri")),
        storage_path: null,
        width: num(media.original_width) ?? num(media.width),
        height: num(media.original_height) ?? num(media.height),
        duration_seconds: durationMs === null ? null : Math.round(durationMs / 100) / 10,
      },
    };
  }
  return null;
}

// Turns one Story object into the fields we store. Returns null if it is not
// a usable post.
export function normalizeStory(story: Json): ScrapedFbPost | null {
  if (!isPostStory(story)) return null;
  const fbPostId = story.post_id as string;
  const creationTime = story.creation_time as number;

  const caption =
    str(get(story, "comet_sections", "content", "story", "message", "text")) ?? str(get(story, "message", "text"));

  const attachments = Array.isArray(story.attachments) ? story.attachments : [];
  const media: FbMediaItem[] = [];
  const mediaIds: string[] = [];
  const attachmentStyles: string[] = [];
  let linkUrl: string | null = null;

  for (const attachment of attachments) {
    const style = str(get(attachment, "styles", "__typename"));
    if (style) attachmentStyles.push(style);
    const details = get(attachment, "styles", "attachment");
    const nodes = get(details, "all_subattachments", "nodes");
    const candidates = Array.isArray(nodes) ? nodes.map((node) => get(node, "media")) : [get(details, "media")];
    for (const candidate of candidates) {
      const result = mediaItem(candidate);
      if (result) {
        media.push(result.item);
        if (result.id) mediaIds.push(result.id);
      }
    }
    const attachmentUrl = str(get(details, "url"));
    if (!linkUrl && attachmentUrl) {
      const target = unwrapLink(attachmentUrl);
      if (!isFacebookUrl(target)) linkUrl = target;
    }
  }

  const hasAttachedStory = isObject(story.attached_story);
  const videoCount = media.filter((item) => item.type === "video").length;
  let postType: FbPostType;
  if (hasAttachedStory) postType = "shared";
  else if (videoCount > 0) postType = "video";
  else if (media.length > 1) postType = "album";
  else if (media.length === 1) postType = "photo";
  else if (linkUrl) postType = "link";
  else if (caption) postType = "text";
  else postType = "other";

  // Engagement counts live on the post's own feedback summary.
  const ufi = findFirst(story.comet_sections, (node) =>
    isObject(node.comet_ufi_summary_and_actions_renderer)
      ? get(node.comet_ufi_summary_and_actions_renderer, "feedback")
      : undefined,
  );
  const commentCount =
    num(get(ufi, "comments_count_summary_renderer", "feedback", "comment_rendering_instance", "comments", "total_count")) ??
    num(get(ufi, "comment_rendering_instance", "comments", "total_count"));

  const contentHash = createHash("sha256")
    .update(JSON.stringify({ caption, mediaIds, linkUrl, hasAttachedStory }))
    .digest("hex");

  return {
    fbPostId,
    permalink: stripQuery(str(story.permalink_url)),
    caption,
    postType,
    linkUrl,
    postedAt: new Date(creationTime * 1000),
    media,
    reactionCount: num(get(ufi, "reaction_count", "count")),
    commentCount,
    shareCount: num(get(ufi, "share_count", "count")),
    viewCount: num(get(ufi, "video_view_count")),
    contentHash,
    raw: {
      source: "facebook_page_logged_out",
      post_id: fbPostId,
      creation_time: creationTime,
      attachment_styles: attachmentStyles,
      media_ids: mediaIds,
      has_attached_story: hasAttachedStory,
    },
  };
}

// Newest first, by Facebook's creation time rather than page order, so a
// pinned older post never outranks newer ones.
export function pickLatestPosts(stories: Map<string, Json>, limit: number): ScrapedFbPost[] {
  return [...stories.values()]
    .map(normalizeStory)
    .filter((post): post is ScrapedFbPost => post !== null)
    .sort((a, b) => (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0))
    .slice(0, limit);
}

export interface ScrapeOptions {
  limit?: number;
  timeoutMs?: number;
  maxScrolls?: number;
}

export class FacebookScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FacebookScrapeError";
  }
}

async function collectFromPage(browser: Browser, pageUrl: string, limit: number, maxScrolls: number) {
  const context = await browser.newContext({
    locale: "en-US",
    timezoneId: "Asia/Manila",
    viewport: { width: 1280, height: 900 },
    userAgent: USER_AGENT,
  });
  const page = await context.newPage();
  // Images and video are not needed: their URLs are in the post data.
  await page.route("**/*", (route) => {
    const type = route.request().resourceType();
    return type === "image" || type === "media" || type === "font" ? route.abort() : route.continue();
  });

  const stories = new Map<string, Json>();
  page.on("response", async (response) => {
    if (!response.url().includes("/api/graphql")) return;
    try {
      const body = await response.text();
      // GraphQL responses are newline-delimited JSON documents.
      for (const line of body.split("\n")) {
        if (!line.trim()) continue;
        try {
          collectStories(JSON.parse(line), stories);
        } catch {
          // Not JSON; ignore.
        }
      }
    } catch {
      // Response body unavailable (e.g. page closed); ignore.
    }
  });

  await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2_500);
  const scripts = await page.$$eval('script[type="application/json"]', (elements) =>
    elements.map((element) => element.textContent ?? ""),
  );
  for (const script of scripts) {
    try {
      collectStories(JSON.parse(script), stories);
    } catch {
      // Not JSON; ignore.
    }
  }

  // Keep one extra in case the page has a pinned older post.
  for (let i = 0; i < maxScrolls && stories.size < limit + 1; i++) {
    await page.keyboard.press("Escape").catch(() => undefined); // dismiss the login prompt
    await page.mouse.wheel(0, 2_500);
    await page.waitForTimeout(2_000);
  }
  await context.close();
  return stories;
}

// Opens the page in headless Chromium and returns its newest posts.
export async function scrapeLatestPagePosts(pageUrl: string, options: ScrapeOptions = {}): Promise<ScrapedFbPost[]> {
  const limit = options.limit ?? 2;
  const timeoutMs = options.timeoutMs ?? 60_000;
  const maxScrolls = options.maxScrolls ?? 4;

  const browser = await chromium.launch({ headless: true });
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new FacebookScrapeError(`Timed out after ${timeoutMs} ms`)), timeoutMs);
    });
    const stories = await Promise.race([collectFromPage(browser, pageUrl, limit, maxScrolls), timeout]);
    const posts = pickLatestPosts(stories, limit);
    if (posts.length === 0) {
      throw new FacebookScrapeError("No posts found on the page (login wall or a Facebook layout change)");
    }
    return posts;
  } finally {
    if (timer) clearTimeout(timer);
    await browser.close().catch(() => undefined);
  }
}
