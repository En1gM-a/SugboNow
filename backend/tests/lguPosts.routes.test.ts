import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, type AppServices } from '../src/app.js';
import type { LguPostsService } from '../src/services/lguPosts.service.js';
import type { LguPostRow, LguSource } from '../src/types/index.js';

const source: LguSource = {
  id: 'src-mandaue',
  slug: 'mandaue_city',
  display_name: 'Mandaue City',
  official_name: 'Thadeo "Jonkie" Ouano',
  official_title: 'mayor',
  lgu_type: 'city',
  fb_page_url: 'https://www.facebook.com/JonkieOuanoPH',
  is_active: true,
  last_fetched_at: '2026-10-16T08:00:00.000Z',
};

const post: LguPostRow = {
  id: 'post-1',
  fb_post_id: '1647114683872212',
  permalink: 'https://www.facebook.com/JonkieOuanoPH/posts/pfbid02',
  caption: 'CLASS ADVISORY | OCT 16',
  post_type: 'album',
  link_url: null,
  posted_at: '2026-10-15T09:55:39.000Z',
  first_seen_at: '2026-10-16T08:00:00.000Z',
  media: [{ type: 'image', url: 'https://scontent.example/a.jpg', thumbnail_url: null, storage_path: null, width: 1080, height: 1080, alt_text: null }],
  reaction_count: 4754,
  comment_count: 1872,
  share_count: 686,
  view_count: null,
  category: null,
};

let server: Server | undefined;

async function start(service: Partial<LguPostsService>) {
  const app = createApp({
    frontendOrigin: 'http://localhost:5173',
    verifyToken: async (token) => (token === 'good-token' ? 'user-1' : null),
    services: { lguPosts: service as LguPostsService } as AppServices,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  server = app.listen(0);
  await new Promise((resolve) => server?.once('listening', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
  await new Promise((resolve) => (server ? server.close(resolve) : resolve(undefined)));
  server = undefined;
});

describe('/api/lgu-posts', () => {
  it('rejects requests without a valid Supabase token', async () => {
    const base = await start({});
    const missing = await fetch(`${base}/api/lgu-posts/refresh`, { method: 'POST' });
    const wrong = await fetch(`${base}/api/lgu-posts/latest`, { headers: { Authorization: 'Bearer nope' } });
    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(await missing.json()).toEqual({ error: { code: 'unauthorized', message: 'Sign in required.' } });
  });

  it('refreshes for the signed-in user and returns the contract shape', async () => {
    const refreshForUser = vi.fn(async () => ({ status: 'refreshed' as const, newPosts: 1, source, posts: [post] }));
    const base = await start({ refreshForUser });
    const response = await fetch(`${base}/api/lgu-posts/refresh`, { method: 'POST', headers: { Authorization: 'Bearer good-token' } });

    expect(response.status).toBe(200);
    expect(refreshForUser).toHaveBeenCalledWith('user-1', 2);
    expect(await response.json()).toEqual({
      status: 'refreshed',
      newPosts: 1,
      source: {
        slug: 'mandaue_city',
        displayName: 'Mandaue City',
        officialName: 'Thadeo "Jonkie" Ouano',
        officialTitle: 'mayor',
        fbPageUrl: 'https://www.facebook.com/JonkieOuanoPH',
        lastFetchedAt: '2026-10-16T08:00:00.000Z',
      },
      posts: [
        {
          id: 'post-1',
          fbPostId: '1647114683872212',
          permalink: 'https://www.facebook.com/JonkieOuanoPH/posts/pfbid02',
          caption: 'CLASS ADVISORY | OCT 16',
          postType: 'album',
          linkUrl: null,
          postedAt: '2026-10-15T09:55:39.000Z',
          firstSeenAt: '2026-10-16T08:00:00.000Z',
          media: [{ type: 'image', url: 'https://scontent.example/a.jpg', thumbnailUrl: null, width: 1080, height: 1080, altText: null, durationSeconds: null }],
          reactionCount: 4754,
          commentCount: 1872,
          shareCount: 686,
          viewCount: null,
          category: null,
        },
      ],
    });
  });

  it('serves saved posts from /latest without checking Facebook', async () => {
    const getLatestForUser = vi.fn(async () => ({ source, posts: [post] }));
    const refreshForUser = vi.fn();
    const base = await start({ getLatestForUser, refreshForUser });
    const response = await fetch(`${base}/api/lgu-posts/latest?limit=1`, { headers: { Authorization: 'Bearer good-token' } });

    expect(response.status).toBe(200);
    expect(getLatestForUser).toHaveBeenCalledWith('user-1', 1);
    expect(refreshForUser).not.toHaveBeenCalled();
  });

  it('validates the limit parameter', async () => {
    const base = await start({ getLatestForUser: vi.fn() });
    const response = await fetch(`${base}/api/lgu-posts/latest?limit=50`, { headers: { Authorization: 'Bearer good-token' } });
    expect(response.status).toBe(400);
  });
});
