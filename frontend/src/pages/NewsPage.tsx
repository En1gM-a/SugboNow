import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ALERT_TYPE, Badge, Card, PageHeader } from '@/components/ui/Card';
import { Chip, Switch } from '@/components/ui/Controls';
import { Icon } from '@/components/ui/Icon';
import { Img } from '@/components/ui/Img';
import { EmptyState, ErrorState, LoadingLabel, Skeleton, SkeletonLines, UpdatedAgo } from '@/components/ui/States';
import { useNow } from '@/hooks/useBrowser';
import { useNews } from '@/hooks/useFeeds';
import { useAreas } from '@/hooks/useProfile';
import type { NewsArticle } from '@/types/api';
import { cx } from '@/utils/cx';
import { formatAgo } from '@/utils/format';
import { NEWS_SOURCE } from './NewsPage.shared';

const PAGE = 20;

export default function NewsPage() {
  const now = useNow();
  // Filters live in the URL (?area=Mandaue%20City&alerts=1), so a filtered view can be shared.
  const [params, setParams] = useSearchParams();
  const area = params.get('area') ?? undefined;
  const alertsOnly = params.get('alerts') === '1';
  const [shown, setShown] = useState(PAGE);
  const setFilters = (next: { area?: string; alerts?: boolean }) => {
    const p: Record<string, string> = {};
    if (next.area) p.area = next.area;
    if (next.alerts) p.alerts = '1';
    setParams(p, { replace: true });
    setShown(PAGE);
  };
  const setAlertsOnly = (on: boolean) => setFilters({ area, alerts: on });
  const areas = useAreas();
  const news = useNews(50, area);
  const list = (news.data ?? []).filter((n) => !alertsOnly || n.isAlert);

  const pickArea = (a?: string) => setFilters({ area: a, alerts: alertsOnly });

  return (
    <div>
      <PageHeader
        title="Cebu News"
        subtitle="Headlines from SunStar, Cebu Daily News and GNews in the last 3 days."
        action={news.data ? <UpdatedAgo at={news.dataUpdatedAt} refreshing={news.isFetching} /> : undefined}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter by area" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={!area} onClick={() => pickArea(undefined)}>
            All Cebu
          </Chip>
          {(areas.data ?? []).map((a) => (
            <Chip key={a.slug} active={area === a.name} onClick={() => pickArea(a.name)}>
              {a.name}
            </Chip>
          ))}
        </div>
        <div className="shrink-0">
          <Switch checked={alertsOnly} onChange={setAlertsOnly} label="Alerts only" />
        </div>
      </div>

      {news.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <LoadingLabel>Loading news…</LoadingLabel>
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i} padded={false}>
              <Skeleton className="aspect-video rounded-none" />
              <div className="p-4">
                <SkeletonLines lines={3} />
              </div>
            </Card>
          ))}
        </div>
      ) : news.isError ? (
        <Card>
          <ErrorState message="We couldn’t load the news right now." onRetry={() => void news.refetch()} />
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            title={alertsOnly ? 'No alert stories here' : 'No stories for this area yet'}
            action={
              <Button variant="secondary" onClick={() => setFilters({})}>
                Show all Cebu news
              </Button>
            }
          >
            Try another area, or turn off “Alerts only”.
          </EmptyState>
        </Card>
      ) : (
        <>
          <ul className={cx('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-150', news.isPlaceholderData && 'opacity-60')}>
            {list.slice(0, shown).map((n, i) => (
              <li key={n.id} className={i >= 6 ? 'cv-auto' : undefined}>
                <ArticleCard article={n} now={now} eager={i < 3} />
              </li>
            ))}
          </ul>
          {list.length > shown && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" onClick={() => setShown((s) => s + PAGE)}>
                Show more ({list.length - shown})
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ArticleCard({ article: n, now, eager }: { article: NewsArticle; now: number; eager?: boolean }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <Img src={n.imageUrl} alt="" eager={eager} />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="navy">{NEWS_SOURCE[n.source]}</Badge>
          {n.isAlert && n.type !== 'news' && (
            <Badge tone="marigold" icon={ALERT_TYPE[n.type].icon}>
              {ALERT_TYPE[n.type].label} alert
            </Badge>
          )}
        </div>
        <h2 className="mt-2 text-[17px] leading-snug font-semibold text-ink">{n.title}</h2>
        {n.summary && <p className="mt-1.5 line-clamp-3 text-sm text-muted">{n.summary}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <p className="flex items-center gap-2 text-xs text-muted tabular-nums">
            {n.areaName && (
              <span className="inline-flex items-center gap-1">
                <Icon name="pin" size={12} />
                {n.areaName}
              </span>
            )}
            <span>{formatAgo(n.publishedAt, now)}</span>
          </p>
          <a
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-semibold text-mactan-sea transition-colors duration-150 hover:text-mactan-sea-dark hover:underline"
          >
            Read on {NEWS_SOURCE[n.source]}
            <Icon name="external" size={14} />
            <span className="sr-only">: {n.title} (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </article>
  );
}
