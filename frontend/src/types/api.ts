// Frontend API types mirror docs/api-contract.md.

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export type LguPostType = 'text' | 'photo' | 'video' | 'album' | 'link' | 'shared' | 'event' | 'other';

export interface LguSourceSummary {
  slug: string;
  displayName: string;
  officialName: string | null;
  officialTitle: 'mayor' | 'governor' | null;
  fbPageUrl: string | null;
  lastFetchedAt: string | null;
}

export interface LguPostMedia {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  altText: string | null;
  durationSeconds: number | null;
}

export interface LguPost {
  id: string;
  fbPostId: string;
  permalink: string | null;
  caption: string | null;
  postType: LguPostType;
  linkUrl: string | null;
  postedAt: string | null;
  firstSeenAt: string;
  media: LguPostMedia[];
  reactionCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  viewCount: number | null;
  category: string | null;
}

export interface LguPostsLatestResponse {
  source: LguSourceSummary | null;
  posts: LguPost[];
}

export type LguPostsRefreshStatus = 'refreshed' | 'fresh' | 'failed' | 'disabled' | 'no_subscription' | 'unknown_source';

export interface LguPostsRefreshResponse extends LguPostsLatestResponse {
  status: LguPostsRefreshStatus;
  newPosts: number;
}
