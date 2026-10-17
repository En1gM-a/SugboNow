// Shared backend types.

export type LguType = "city" | "municipality" | "province";
export type OfficialTitle = "mayor" | "governor";

// Row shape of public.lgu_sources (columns the backend uses).
export interface LguSource {
  id: string;
  slug: string;
  display_name: string;
  official_name: string | null;
  official_title: OfficialTitle | null;
  lgu_type: LguType;
  fb_page_url: string | null;
  is_active: boolean;
  last_fetched_at: string | null;
}

export type FbPostType = "text" | "photo" | "video" | "album" | "link" | "shared" | "event" | "other";

// One item of lgu_posts.media.
export interface FbMediaItem {
  type: "image" | "video";
  url: string;
  thumbnail_url: string | null;
  storage_path: string | null;
  width: number | null;
  height: number | null;
  alt_text?: string | null;
  duration_seconds?: number | null;
}

// A post as read from a Facebook page, before it is saved.
export interface ScrapedFbPost {
  fbPostId: string;
  permalink: string | null;
  caption: string | null;
  postType: FbPostType;
  linkUrl: string | null;
  postedAt: Date | null;
  media: FbMediaItem[];
  reactionCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  viewCount: number | null;
  contentHash: string;
  // Small, curated summary of the source data. Never comments or commenters.
  raw: Record<string, unknown>;
}

// Row shape of public.lgu_posts returned to the API layer.
export interface LguPostRow {
  id: string;
  fb_post_id: string;
  permalink: string | null;
  caption: string | null;
  post_type: FbPostType;
  link_url: string | null;
  posted_at: string | null;
  first_seen_at: string;
  media: FbMediaItem[];
  reaction_count: number | null;
  comment_count: number | null;
  share_count: number | null;
  view_count: number | null;
  category: string | null;
}
