import { describe, expect, it } from 'vitest';
import { cebuDailyNewsArticles, correctFeedTimes } from '../src/integrations/cebuDailyNews.js';
import { gnewsArticles } from '../src/integrations/gnews.js';
import { parseRss } from '../src/integrations/rss.js';
import { sunstarArticles } from '../src/integrations/sunstar.js';
import { articleToAlert, articlesToAlerts } from '../src/services/newsAlerts.js';
import type { NewsArticle } from '../src/types/index.js';
import { newsFingerprint } from '../src/utils/text.js';

const now = new Date('2026-10-22T12:46:00Z');

function rss(items: string): string {
  return `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>Feed</title>${items}</channel></rss>`;
}

const sunstarFeed = rss(`
  <item>
    <title>Hillside collapse narrows road</title>
    <link>https://www.sunstar.com.ph/cebu/hillside-collapse-narrows-road</link>
    <guid isPermaLink="false">0c79-1</guid>
    <pubDate>Thu, 22 Oct 2026 11:54:49 +0000</pubDate>
    <category>Cebu</category><category>Local News</category>
    <description><![CDATA[ A portion of the road in <b>Barangay Babag</b> is now one lane &amp; slow. ]]></description>
    <media:content medium="image" url="https://cf-images.example/road.jpg" width="750" height="450"/>
  </item>
  <item>
    <title>&apos;Rosal&apos; weakens into typhoon</title>
    <link>https://www.sunstar.com.ph/davao/rosal-weakens</link>
    <pubDate>Thu, 22 Oct 2026 11:00:00 +0000</pubDate>
    <category>Davao</category>
  </item>`);

describe('RSS parsing', () => {
  it('reads title, link, plain-text description, categories and image', () => {
    const [first, second] = parseRss(sunstarFeed);
    expect(first).toEqual({
      title: 'Hillside collapse narrows road',
      link: 'https://www.sunstar.com.ph/cebu/hillside-collapse-narrows-road',
      guid: '0c79-1',
      description: 'A portion of the road in Barangay Babag is now one lane & slow.',
      publishedAt: new Date('2026-10-22T11:54:49Z'),
      categories: ['Cebu', 'Local News'],
      imageUrl: 'https://cf-images.example/road.jpg',
    });
    expect(second.title).toBe("'Rosal' weakens into typhoon");
    expect(second.description).toBeNull();
    expect(second.imageUrl).toBeNull();
  });
});

describe('SunStar', () => {
  it('keeps only Cebu stories from the all-editions feed', () => {
    const articles = sunstarArticles(sunstarFeed);
    expect(articles.map((article) => article.url)).toEqual(['https://www.sunstar.com.ph/cebu/hillside-collapse-narrows-road']);
    expect(articles[0].extra).toEqual({ publisher: 'SunStar', guid: '0c79-1' });
  });
});

describe('Cebu Daily News', () => {
  // The feed labels Manila time as UTC, so new items look up to 8 hours ahead.
  const cdnFeed = rss(`
    <item>
      <title>Mandaue City Police Office to deploy 500 personnel for Kalag-kalag</title>
      <link>https://cebudailynews.inquirer.net/777910/mandaue-police-kalag-kalag</link>
      <pubDate>Thu, 22 Oct 2026 19:58:39 +0000</pubDate>
      <category><![CDATA[Latest News]]></category><category><![CDATA[Mandaue City]]></category>
      <description><![CDATA[MANDAUE CITY, Cebu – The MCPO will deploy around 500 police personnel.]]></description>
    </item>
    <item>
      <title>New Beatles attraction coming to Liverpool</title>
      <link>https://cebudailynews.inquirer.net/777900/beatles-liverpool</link>
      <pubDate>Thu, 22 Oct 2026 17:40:09 +0000</pubDate>
      <category><![CDATA[Latest News]]></category><category><![CDATA[Music]]></category>
    </item>
    <item>
      <title>Cebu drafts unified class suspension rules amid fluctuating air quality</title>
      <link>https://cebudailynews.inquirer.net/777850/cebu-class-suspension-rules</link>
      <pubDate>Thu, 22 Oct 2026 13:30:00 +0000</pubDate>
      <category><![CDATA[Capitol]]></category>
    </item>`);

  it('keeps Cebu stories and corrects the mislabelled times', () => {
    const articles = cebuDailyNewsArticles(cdnFeed, now);
    expect(articles.map((article) => article.title)).toEqual([
      'Mandaue City Police Office to deploy 500 personnel for Kalag-kalag',
      'Cebu drafts unified class suspension rules amid fluctuating air quality',
    ]);
    expect(articles[0].publishedAt?.toISOString()).toBe('2026-10-22T11:58:39.000Z');
    expect(articles[1].publishedAt?.toISOString()).toBe('2026-10-22T05:30:00.000Z');
  });

  it('leaves times alone when the feed is correct', () => {
    const items = parseRss(rss('<item><title>Cebu story</title><link>https://x/1</link><pubDate>Thu, 22 Oct 2026 12:00:00 +0000</pubDate></item>'));
    expect(correctFeedTimes(items, now)).toBe(items);
  });
});

describe('GNews', () => {
  it('keeps only articles that are about Cebu', () => {
    const articles = gnewsArticles({
      totalArticles: 2,
      articles: [
        { title: 'Brownout hits parts of Cebu City', description: 'VECO says…', url: 'https://news.example/a', image: null, publishedAt: '2026-10-22T08:00:00Z', source: { name: 'Example' } },
        { title: 'Manila traffic worsens', description: 'EDSA…', url: 'https://news.example/b', image: null, publishedAt: '2026-10-22T08:00:00Z' },
      ],
    });
    expect(articles.map((article) => article.url)).toEqual(['https://news.example/a']);
    expect(articles[0].extra).toEqual({ publisher: 'Example' });
  });
});

describe('articleToAlert', () => {
  function article(overrides: Partial<NewsArticle> = {}): NewsArticle {
    return {
      title: 'Scheduled power interruption in parts of Mandaue on Sunday',
      url: 'https://www.sunstar.com.ph/cebu/power-interruption-mandaue?utm_source=rss',
      summary: 'Visayan Electric will cut power from 8 a.m. to 5 p.m.',
      publishedAt: new Date('2026-10-22T10:00:00Z'),
      imageUrl: 'https://img.example/p.jpg',
      extra: { publisher: 'SunStar' },
      ...overrides,
    };
  }

  it('classifies, places and fingerprints an article', () => {
    expect(articleToAlert(article(), 'sunstar', now)).toEqual({
      source: 'sunstar',
      type: 'power',
      severity: 'low',
      title: 'Scheduled power interruption in parts of Mandaue on Sunday',
      summary: 'Visayan Electric will cut power from 8 a.m. to 5 p.m.',
      lat: 10.3236,
      lng: 123.9223,
      areaName: 'Mandaue City',
      startsAt: '2026-10-22T10:00:00.000Z',
      endsAt: '2026-10-24T10:00:00.000Z',
      sourceUrl: 'https://www.sunstar.com.ph/cebu/power-interruption-mandaue?utm_source=rss',
      imageUrl: 'https://img.example/p.jpg',
      fingerprint: newsFingerprint('https://www.sunstar.com.ph/cebu/power-interruption-mandaue'),
      raw: { published_at: '2026-10-22T10:00:00.000Z', publisher: 'SunStar' },
    });
  });

  it('keeps plain news as type news with no coordinates when no area is named', () => {
    const alert = articleToAlert(article({ title: 'Routes Asia to return to Cebu in 2028', summary: null }), 'sunstar', now);
    expect(alert).toMatchObject({ type: 'news', severity: 'low', lat: null, lng: null, areaName: 'Cebu' });
  });

  it('drops articles older than 72 hours or from the future', () => {
    expect(articleToAlert(article({ publishedAt: new Date('2026-10-19T12:00:00Z') }), 'sunstar', now)).toBeNull();
    expect(articleToAlert(article({ publishedAt: new Date('2026-10-22T15:00:00Z') }), 'sunstar', now)).toBeNull();
    expect(articleToAlert(article({ publishedAt: null }), 'sunstar', now)).toBeNull();
  });

  it('gives the same article the same fingerprint from any source', () => {
    const [fromFeed, fromGnews] = [
      articlesToAlerts([article()], 'sunstar', now)[0],
      articlesToAlerts([article({ url: 'https://www.sunstar.com.ph/cebu/power-interruption-mandaue/' })], 'gnews', now)[0],
    ];
    expect(fromFeed.fingerprint).toBe(fromGnews.fingerprint);
  });
});
