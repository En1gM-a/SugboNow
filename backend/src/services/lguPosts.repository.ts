// Supabase access for LGU sources and their saved Facebook posts.
// Uses the service-role client: lgu_posts has no client write policies.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LguPostRow, LguSource, ScrapedFbPost } from "../types";
import type { LguPostsRepository } from "./lguPosts.service";

const SOURCE_COLUMNS =
  "id, slug, display_name, official_name, official_title, lgu_type, fb_page_url, is_active, last_fetched_at";
const POST_COLUMNS =
  "id, fb_post_id, permalink, caption, post_type, link_url, posted_at, first_seen_at, media, reaction_count, comment_count, share_count, view_count, category";

export function createLguPostsRepository(db: SupabaseClient): LguPostsRepository {
  return {
    async getSubscribedSlug(userId) {
      const { data, error } = await db.from("profiles").select("subscribed_mayor").eq("id", userId).maybeSingle();
      if (error) throw error;
      return (data?.subscribed_mayor as string | null | undefined) ?? null;
    },

    async getSourceBySlug(slug) {
      const { data, error } = await db.from("lgu_sources").select(SOURCE_COLUMNS).eq("slug", slug).maybeSingle();
      if (error) throw error;
      return (data as LguSource | null) ?? null;
    },

    async insertNewPosts(sourceId, posts) {
      if (posts.length === 0) return 0;
      const rows = posts.map((post) => ({
        source_id: sourceId,
        fb_post_id: post.fbPostId,
        permalink: post.permalink,
        caption: post.caption,
        post_type: post.postType,
        link_url: post.linkUrl,
        posted_at: post.postedAt?.toISOString() ?? null,
        media: post.media,
        reaction_count: post.reactionCount,
        comment_count: post.commentCount,
        share_count: post.shareCount,
        view_count: post.viewCount,
        content_hash: post.contentHash,
        category: post.category ?? null,
        raw: post.raw,
      }));
      // Already-saved posts are skipped, so only new rows come back.
      const { data, error } = await db
        .from("lgu_posts")
        .upsert(rows, { onConflict: "source_id,fb_post_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },

    async markFetched(sourceId, at) {
      const { error } = await db
        .from("lgu_sources")
        .update({ last_fetched_at: at.toISOString(), last_fetch_error: null })
        .eq("id", sourceId);
      if (error) throw error;
    },

    async markFetchError(sourceId, message) {
      const { error } = await db
        .from("lgu_sources")
        .update({ last_fetch_error: message.slice(0, 1000) })
        .eq("id", sourceId);
      if (error) throw error;
    },

    async getLatestPosts(sourceId, limit) {
      const { data, error } = await db
        .from("lgu_posts")
        .select(POST_COLUMNS)
        .eq("source_id", sourceId)
        .is("deleted_at", null)
        .order("posted_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as LguPostRow[];
    },
  };
}
