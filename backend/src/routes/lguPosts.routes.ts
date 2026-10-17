// /api/lgu-posts — the signed-in user's subscribed LGU and its latest Facebook posts.
// Shapes are defined in docs/api-contract.md.

import { Router } from "express";
import { z } from "zod";
import type { LguPostsService } from "../services/lguPosts.service";
import type { LguPostRow, LguSource } from "../types";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(2),
});

function presentSource(source: LguSource | null) {
  if (!source) return null;
  return {
    slug: source.slug,
    displayName: source.display_name,
    officialName: source.official_name,
    officialTitle: source.official_title,
    fbPageUrl: source.fb_page_url,
    lastFetchedAt: source.last_fetched_at,
  };
}

function presentPost(post: LguPostRow) {
  return {
    id: post.id,
    fbPostId: post.fb_post_id,
    permalink: post.permalink,
    caption: post.caption,
    postType: post.post_type,
    linkUrl: post.link_url,
    postedAt: post.posted_at,
    firstSeenAt: post.first_seen_at,
    media: (post.media ?? []).map((item) => ({
      type: item.type,
      url: item.url,
      thumbnailUrl: item.thumbnail_url,
      width: item.width,
      height: item.height,
      altText: item.alt_text ?? null,
      durationSeconds: item.duration_seconds ?? null,
    })),
    reactionCount: post.reaction_count,
    commentCount: post.comment_count,
    shareCount: post.share_count,
    viewCount: post.view_count,
    category: post.category,
  };
}

export function createLguPostsRouter(service: LguPostsService): Router {
  const router = Router();

  router.post("/refresh", async (req, res) => {
    const query = querySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: { code: "invalid_request", message: "limit must be 1-10." } });
      return;
    }
    const result = await service.refreshForUser(res.locals.userId as string, query.data.limit);
    res.json({
      status: result.status,
      newPosts: result.newPosts,
      source: presentSource(result.source),
      posts: result.posts.map(presentPost),
    });
  });

  router.get("/latest", async (req, res) => {
    const query = querySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: { code: "invalid_request", message: "limit must be 1-10." } });
      return;
    }
    const result = await service.getLatestForUser(res.locals.userId as string, query.data.limit);
    res.json({ source: presentSource(result.source), posts: result.posts.map(presentPost) });
  });

  return router;
}
