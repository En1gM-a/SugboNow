// News (/news, handoff <pages> page 5): "What's happening in Cebu?" A sticky filter card, a single column of story
// cards, and the "Right now" glance beside them. It fetches 50 stories once and shows 10 at a time, so scrolling never
// waits on the network.

import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { Page } from '@/components/layout/Page';
import { ALERT_CHIP, PLACEHOLDER, SOURCE, SOURCE_MARK } from '@/components/news/storyArt';
import { RightNow } from '@/components/RightNow';
import { CardError } from '@/components/today/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tag } from '@/components/ui/Tag';
import { useNow } from '@/hooks/useBrowser';
import { useHeldList, useRevealOnScroll } from '@/hooks/useFeedList';
import { useNews } from '@/hooks/useFeeds';
import { useAreas } from '@/hooks/useProfile';
import { getDisplay } from '@/lib/display';
import { USE_MOCKS } from '@/lib/supabaseClient';
import type { NewsArticle } from '@/types/api';
import { cx, vars } from '@/utils/cx';
import { ago, updatedAgo } from '@/utils/format';

const PAGE_SIZE = 10;

function StoryMedia({ article, eager }: { article: NewsArticle; eager: boolean }) {
  const [failed, setFailed] = useState(false);
  if (article.imageUrl && !failed) {
    return (
      <div className="story-media">
        <img src={article.imageUrl} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
      </div>
    );
  }
  const placeholder = PLACEHOLDER[article.type];
  return (
    <div className={cx('story-media is-art', placeholder.tone)} aria-hidden="true">
      <Icon name={placeholder.icon} />
    </div>
  );
}

function StoryCard({ article, i, now }: { article: NewsArticle; i: number; now: number }) {
  const source = SOURCE[article.source];
  return (
    <article className={cx('card glass e-card linked story', i >= 3 && 'below-fold')} style={vars({ '--i': Math.min(i + 1, 5) })}>
      <div className="post-head">
        <span className={cx('lgu', `src-${article.source}`)} aria-hidden="true">
          {SOURCE_MARK[article.source]}
        </span>
        <p className="min-w-0 small muted">
          <b className="story-source">{source}</b> · {ago(article.publishedAt, now)}
          {article.areaName && ` · ${article.areaName}`}
        </p>
      </div>
      <h2 className="story-title">
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="stretch">
          {article.title}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </h2>
      {article.summary && <p className="story-summary muted">{article.summary}</p>}
      <StoryMedia article={article} eager={i < 2} />
      <div className="story-foot">
        {article.isAlert && article.type !== 'news' && <Tag>{ALERT_CHIP[article.type]}</Tag>}
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="out-link">
          Read on {source}
          <Icon name="arrow-up-right" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </article>
  );
}

function StorySkeleton() {
  return (
    <div className="card glass post-skel" aria-hidden="true">
      <Skeleton className="skel-line w-48" />
      <Skeleton className="skel-line w-full" />
      <Skeleton className="skel-line w-64" />
      <Skeleton className="skel-media" />
    </div>
  );
}

export default function NewsPage() {
  const now = useNow();
  // Filters live in the URL (/news?area=cebu_city&alerts=1), so they survive a refresh and can be shared.
  const [params, setParams] = useSearchParams();
  const areas = useAreas();
  const slug = params.get('area');
  const alertsOnly = params.get('alerts') === '1';
  const area = areas.data?.find((a) => a.slug === slug);
  // Wait for the area list before filtering by one, so a shared link doesn't fetch everything first.
  const news = useNews(50, area?.name, !slug || areas.isFetched);
  const [shown, setShown] = useState(PAGE_SIZE);
  const filters = useRef<HTMLDivElement>(null);

  const { visible, newCount, showNew } = useHeldList(news.data, area?.slug ?? 'all', !news.isPlaceholderData && news.isSuccess);
  const stories = alertsOnly ? visible.filter((a) => a.isAlert) : visible;
  const onScreen = stories.slice(0, shown);
  const hasMore = stories.length > shown;
  const reveal = useRevealOnScroll(() => setShown((s) => s + PAGE_SIZE), hasMore, shown);

  function setFilters(next: { area: string | null; alerts: boolean }) {
    const query: Record<string, string> = {};
    if (next.area) query.area = next.area;
    if (next.alerts) query.alerts = '1';
    setParams(query, { replace: true, preventScrollReset: true });
    setShown(PAGE_SIZE);
    // Start the new list from its top, with the filters still in view. The card is sticky, so measure the page around it.
    const page = filters.current?.parentElement;
    if (page) {
      const top = page.getBoundingClientRect().top + window.scrollY - 8;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'auto' });
    }
  }

  function revealNew() {
    showNew();
    setShown(PAGE_SIZE);
    window.scrollTo({ top: 0, behavior: getDisplay().still ? 'auto' : 'smooth' });
  }

  const options = [{ value: 'all', label: 'All Cebu' }, ...(areas.data ?? []).map((a) => ({ value: a.slug, label: a.name }))];

  return (
    <Page name="/news" className="news-page">
      <div className="card glass e-card filter-card" ref={filters} style={vars({ '--i': 0 })}>
        <button type="button" className="chip" aria-pressed={alertsOnly} onClick={() => setFilters({ area: area?.slug ?? null, alerts: !alertsOnly })}>
          Alerts only
        </button>
        <Segmented label="Filter stories by area" value={area?.slug ?? 'all'} options={options} onChange={(value) => setFilters({ area: value === 'all' ? null : value, alerts: alertsOnly })} />
      </div>

      <div className="grid12">
        <section className="feed span-8" aria-label="Stories">
          {newCount > 0 && (
            <button type="button" className="new-pill" onClick={revealNew}>
              <Icon name="arrow-up" />
              {newCount === 1 ? '1 new story' : `${newCount} new stories`}
            </button>
          )}
          {news.isPending ? (
            <>
              <StorySkeleton />
              <StorySkeleton />
            </>
          ) : news.isError ? (
            <div className="card glass">
              <h2 className="card-title">Top stories</h2>
              <CardError what="the news" onRetry={() => void news.refetch()} />
            </div>
          ) : stories.length === 0 ? (
            <div className="card glass empty">
              <p className="empty-text">{alertsOnly ? 'No alert stories here right now.' : 'No stories for this area in the last 3 days.'}</p>
              <Button variant="secondary" onClick={() => setFilters({ area: null, alerts: false })}>
                Show all Cebu news
              </Button>
            </div>
          ) : (
            <>
              <p className="feed-meta muted small tabular-nums">
                {updatedAgo(news.dataUpdatedAt, now)}
                {USE_MOCKS && ' · Sample headlines'}
              </p>
              <div className={cx('feed-list', news.isPlaceholderData && 'is-stale')}>
                {onScreen.map((article, i) => (
                  <StoryCard key={article.id} article={article} i={i} now={now} />
                ))}
              </div>
              {hasMore ? (
                <div className="feed-end" ref={reveal}>
                  <Button variant="secondary" onClick={() => setShown((s) => s + PAGE_SIZE)}>
                    Show more
                  </Button>
                </div>
              ) : (
                <p className="feed-end muted small">You&apos;re all caught up · stories from the last 3 days</p>
              )}
            </>
          )}
        </section>
        <div className="side span-4">
          <RightNow i={1} />
        </div>
      </div>
    </Page>
  );
}
