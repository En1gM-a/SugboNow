import { describe, expect, it, vi } from 'vitest';
import { categorizeLguPost, lguPostToAlert } from '../src/services/lguAlerts.js';
import { createLguPostsService, type LguPostsRepository } from '../src/services/lguPosts.service.js';
import type { LguPostRow, LguSource, ScrapedFbPost } from '../src/types/index.js';

const now = new Date('2026-10-15T12:00:00Z');

const mandaue: LguSource = {
  id: 'src-mandaue',
  slug: 'mandaue_city',
  display_name: 'Mandaue City',
  official_name: 'Thadeo "Jonkie" Ouano',
  official_title: 'mayor',
  lgu_type: 'city',
  fb_page_url: 'https://www.facebook.com/JonkieOuanoPH',
  is_active: true,
  last_fetched_at: null,
};

const province: LguSource = { ...mandaue, id: 'src-province', slug: 'cebu_province', display_name: 'Province of Cebu', lgu_type: 'province' };

function post(caption: string | null, overrides: Partial<ScrapedFbPost> = {}): ScrapedFbPost {
  return {
    fbPostId: '1647114683872212',
    permalink: 'https://www.facebook.com/JonkieOuanoPH/posts/pfbid02',
    caption,
    postType: 'album',
    linkUrl: null,
    postedAt: new Date('2026-10-15T09:55:39Z'),
    media: [
      { type: 'video', url: 'https://www.facebook.com/reel/1/', thumbnail_url: null, storage_path: null, width: 1080, height: 1920 },
      { type: 'image', url: 'https://scontent.example/a.jpg', thumbnail_url: null, storage_path: null, width: 1080, height: 1080 },
    ],
    reactionCount: 4754,
    commentCount: 1872,
    shareCount: 686,
    viewCount: null,
    contentHash: 'hash',
    raw: {},
    ...overrides,
  };
}

const classAdvisory = '𝗖𝗟𝗔𝗦𝗦 𝗔𝗗𝗩𝗜𝗦𝗢𝗥𝗬 | 𝗢𝗖𝗧 𝟭𝟲\n\nFace-to-face classes in all levels shall continue as scheduled tomorrow.';
const meeting = 'COORDINATION MEETING FOR OPLAN KALAGKALAG 2026\n\nPriorities are public safety, traffic management and crowd control.';

describe('lguPostToAlert', () => {
  it('turns a class advisory post into an alert at the city', () => {
    expect(lguPostToAlert(post(classAdvisory), mandaue, now)).toEqual({
      source: 'facebook',
      type: 'advisory',
      severity: 'medium',
      title: 'Mandaue City: CLASS ADVISORY | OCT 16',
      summary: 'CLASS ADVISORY | OCT 16 Face-to-face classes in all levels shall continue as scheduled tomorrow.',
      lat: 10.3236,
      lng: 123.9223,
      areaName: 'Mandaue City',
      startsAt: '2026-10-15T09:55:39.000Z',
      endsAt: '2026-10-16T09:55:39.000Z',
      sourceUrl: 'https://www.facebook.com/JonkieOuanoPH/posts/pfbid02',
      imageUrl: 'https://scontent.example/a.jpg',
      fingerprint: 'facebook:mandaue_city:1647114683872212',
      raw: { lgu: 'mandaue_city', fb_post_id: '1647114683872212', official: 'Thadeo "Jonkie" Ouano' },
    });
  });

  it('leaves ordinary posts as posts only', () => {
    expect(lguPostToAlert(post(meeting), mandaue, now)).toBeNull();
    expect(lguPostToAlert(post(null), mandaue, now)).toBeNull();
  });

  it('marks province-wide posts with no single point', () => {
    expect(lguPostToAlert(post('WALAY KLASE ugma sa tanang lebel'), province, now)).toMatchObject({
      severity: 'high',
      lat: null,
      lng: null,
      areaName: 'Province of Cebu',
    });
  });

  it('categorizes posts for lgu_posts.category', () => {
    expect(categorizeLguPost(post(classAdvisory))).toBe('class_suspension');
    expect(categorizeLguPost(post(meeting))).toBe('general');
  });
});

describe('LGU refresh saves alerts', () => {
  function repo(): LguPostsRepository & { inserted: ScrapedFbPost[] } {
    const inserted: ScrapedFbPost[] = [];
    return {
      inserted,
      getSubscribedSlug: vi.fn(async () => 'mandaue_city'),
      getSourceBySlug: vi.fn(async () => mandaue),
      insertNewPosts: vi.fn(async (_id: string, posts: ScrapedFbPost[]) => {
        inserted.push(...posts);
        return posts.length;
      }),
      markFetched: vi.fn(async () => undefined),
      markFetchError: vi.fn(async () => undefined),
      getLatestPosts: vi.fn(async (): Promise<LguPostRow[]> => []),
    };
  }

  function service(saveAlerts: (alerts: unknown[]) => Promise<unknown>, repository = repo()) {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const svc = createLguPostsService({
      repo: repository,
      scrape: async () => [post(classAdvisory), post(meeting, { fbPostId: '2' })],
      saveAlerts,
      logger,
      scrapeEnabled: true,
      refreshIntervalMs: 600_000,
      now: () => now,
    });
    return { svc, logger, repository };
  }

  it('saves posts with a category and alerts for the disruptive ones', async () => {
    const saveAlerts = vi.fn(async (_alerts: unknown[]) => 1);
    const { svc, repository } = service(saveAlerts);
    const result = await svc.refreshForUser('user-1');

    expect(result.status).toBe('refreshed');
    expect(repository.inserted.map((p) => p.category)).toEqual(['class_suspension', 'general']);
    expect(saveAlerts).toHaveBeenCalledTimes(1);
    expect(saveAlerts.mock.calls[0][0]).toHaveLength(1);
  });

  it('still refreshes when saving alerts fails', async () => {
    const { svc, logger } = service(async () => {
      throw new Error('db down');
    });
    const result = await svc.refreshForUser('user-1');
    expect(result.status).toBe('refreshed');
    expect(logger.warn).toHaveBeenCalledWith('Could not save alerts from LGU posts', { slug: 'mandaue_city', error: 'db down' });
  });
});
