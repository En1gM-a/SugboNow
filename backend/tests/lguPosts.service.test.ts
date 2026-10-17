import { describe, expect, it, vi } from 'vitest';
import { createLguPostsService, type LguPostsRepository } from '../src/services/lguPosts.service.js';
import type { LguPostRow, LguSource, ScrapedFbPost } from '../src/types/index.js';

const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const TEN_MINUTES = 10 * 60_000;

function source(overrides: Partial<LguSource> = {}): LguSource {
  return {
    id: 'src-cebu',
    slug: 'cebu_city',
    display_name: 'Cebu City',
    official_name: 'Nestor Archival',
    official_title: 'mayor',
    lgu_type: 'city',
    fb_page_url: 'https://www.facebook.com/EngrNestorArchival',
    is_active: true,
    last_fetched_at: null,
    ...overrides,
  };
}

function scraped(fbPostId: string, postedAt: string): ScrapedFbPost {
  return {
    fbPostId,
    permalink: `https://www.facebook.com/EngrNestorArchival/posts/${fbPostId}`,
    caption: `Post ${fbPostId}`,
    postType: 'text',
    linkUrl: null,
    postedAt: new Date(postedAt),
    media: [],
    reactionCount: 1,
    commentCount: 0,
    shareCount: 0,
    viewCount: null,
    contentHash: `hash-${fbPostId}`,
    raw: {},
  };
}

// In-memory repository that behaves like the unique (source_id, fb_post_id) constraint.
function fakeRepo(options: { slug?: string | null; source?: LguSource | null } = {}) {
  const saved = new Map<string, LguPostRow>();
  const state = { source: options.source === undefined ? source() : options.source };
  const repo: LguPostsRepository & { saved: typeof saved; state: typeof state } = {
    saved,
    state,
    getSubscribedSlug: vi.fn(async () => (options.slug === undefined ? 'cebu_city' : options.slug)),
    getSourceBySlug: vi.fn(async () => state.source),
    insertNewPosts: vi.fn(async (sourceId: string, posts: ScrapedFbPost[]) => {
      let inserted = 0;
      for (const post of posts) {
        const key = `${sourceId}:${post.fbPostId}`;
        if (saved.has(key)) continue;
        saved.set(key, {
          id: key,
          fb_post_id: post.fbPostId,
          permalink: post.permalink,
          caption: post.caption,
          post_type: post.postType,
          link_url: post.linkUrl,
          posted_at: post.postedAt?.toISOString() ?? null,
          first_seen_at: new Date().toISOString(),
          media: post.media,
          reaction_count: post.reactionCount,
          comment_count: post.commentCount,
          share_count: post.shareCount,
          view_count: post.viewCount,
          category: null,
        });
        inserted++;
      }
      return inserted;
    }),
    markFetched: vi.fn(async (_id: string, at: Date) => {
      if (state.source) state.source = { ...state.source, last_fetched_at: at.toISOString() };
    }),
    markFetchError: vi.fn(async () => undefined),
    getLatestPosts: vi.fn(async (_id: string, limit: number) =>
      [...saved.values()].sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? '')).slice(0, limit),
    ),
  };
  return repo;
}

function makeService(repo: ReturnType<typeof fakeRepo>, scrape: (url: string, limit: number) => Promise<ScrapedFbPost[]>, clock = { t: Date.parse('2026-10-16T08:00:00Z') }, scrapeEnabled = true) {
  return createLguPostsService({
    repo,
    scrape,
    logger: silentLogger,
    scrapeEnabled,
    refreshIntervalMs: TEN_MINUTES,
    now: () => new Date(clock.t),
  });
}

describe('lguPosts service', () => {
  it('saves new posts from the subscribed page and returns the latest two', async () => {
    const repo = fakeRepo();
    const scrape = vi.fn(async () => [scraped('2', '2026-10-16T07:00:00Z'), scraped('1', '2026-10-15T07:00:00Z')]);
    const result = await makeService(repo, scrape).refreshForUser('user-1');

    expect(scrape).toHaveBeenCalledWith('https://www.facebook.com/EngrNestorArchival', 2);
    expect(result.status).toBe('refreshed');
    expect(result.newPosts).toBe(2);
    expect(result.posts.map((post) => post.fb_post_id)).toEqual(['2', '1']);
    expect(repo.markFetched).toHaveBeenCalled();
  });

  it('ignores posts that are already saved and only adds the new one', async () => {
    const repo = fakeRepo();
    const clock = { t: Date.parse('2026-10-16T08:00:00Z') };
    const scrape = vi
      .fn()
      .mockResolvedValueOnce([scraped('2', '2026-10-16T07:00:00Z'), scraped('1', '2026-10-15T07:00:00Z')])
      .mockResolvedValueOnce([scraped('3', '2026-10-16T09:00:00Z'), scraped('2', '2026-10-16T07:00:00Z')])
      .mockResolvedValueOnce([scraped('3', '2026-10-16T09:00:00Z'), scraped('2', '2026-10-16T07:00:00Z')]);
    const service = makeService(repo, scrape, clock);

    await service.refreshForUser('user-1');
    clock.t += TEN_MINUTES + 1;
    const second = await service.refreshForUser('user-1');
    clock.t += TEN_MINUTES + 1;
    const third = await service.refreshForUser('user-1');

    expect(second.newPosts).toBe(1);
    expect(third.status).toBe('refreshed');
    expect(third.newPosts).toBe(0);
    expect(repo.saved.size).toBe(3);
  });

  it('does not check Facebook again within the refresh interval', async () => {
    const repo = fakeRepo();
    const clock = { t: Date.parse('2026-10-16T08:00:00Z') };
    const scrape = vi.fn(async () => [scraped('1', '2026-10-16T07:00:00Z')]);
    const service = makeService(repo, scrape, clock);

    await service.refreshForUser('user-1');
    clock.t += TEN_MINUTES - 1;
    const result = await service.refreshForUser('user-2');

    expect(scrape).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('fresh');
    expect(result.posts).toHaveLength(1);
  });

  it('honours last_fetched_at saved by an earlier run', async () => {
    const repo = fakeRepo({ source: source({ last_fetched_at: '2026-10-16T07:55:00Z' }) });
    const scrape = vi.fn(async () => []);
    const result = await makeService(repo, scrape).refreshForUser('user-1');
    expect(scrape).not.toHaveBeenCalled();
    expect(result.status).toBe('fresh');
  });

  it('runs one check when many users sign in at once', async () => {
    const repo = fakeRepo();
    let release: (posts: ScrapedFbPost[]) => void = () => undefined;
    const scrape = vi.fn(() => new Promise<ScrapedFbPost[]>((resolve) => { release = resolve; }));
    const service = makeService(repo, scrape);

    const pending = Promise.all([service.refreshForUser('a'), service.refreshForUser('b'), service.refreshForUser('c')]);
    await vi.waitFor(() => expect(scrape).toHaveBeenCalledTimes(1));
    release([scraped('1', '2026-10-16T07:00:00Z')]);
    const results = await pending;

    expect(scrape).toHaveBeenCalledTimes(1);
    expect(results.map((result) => result.status)).toEqual(['refreshed', 'refreshed', 'refreshed']);
    expect(results.every((result) => result.posts.length === 1)).toBe(true);
  });

  it('records a failed check, still returns saved posts, and does not retry immediately', async () => {
    const repo = fakeRepo();
    const clock = { t: Date.parse('2026-10-16T08:00:00Z') };
    const scrape = vi
      .fn()
      .mockResolvedValueOnce([scraped('1', '2026-10-15T07:00:00Z')])
      .mockRejectedValueOnce(new Error('login wall'));
    const service = makeService(repo, scrape, clock);

    await service.refreshForUser('user-1');
    clock.t += TEN_MINUTES + 1;
    const failed = await service.refreshForUser('user-1');
    const again = await service.refreshForUser('user-1');

    expect(failed.status).toBe('failed');
    expect(failed.posts).toHaveLength(1);
    expect(repo.markFetchError).toHaveBeenCalledWith('src-cebu', 'login wall');
    expect(again.status).toBe('fresh');
    expect(scrape).toHaveBeenCalledTimes(2);
  });

  it('handles users without a subscription, unknown pages, and the kill switch', async () => {
    const scrape = vi.fn(async () => []);
    expect((await makeService(fakeRepo({ slug: null }), scrape).refreshForUser('u')).status).toBe('no_subscription');
    expect((await makeService(fakeRepo({ source: null }), scrape).refreshForUser('u')).status).toBe('unknown_source');
    expect((await makeService(fakeRepo({ source: source({ fb_page_url: null }) }), scrape).refreshForUser('u')).status).toBe('unknown_source');
    expect((await makeService(fakeRepo(), scrape, undefined, false).refreshForUser('u')).status).toBe('disabled');
    expect(scrape).not.toHaveBeenCalled();
  });
});
