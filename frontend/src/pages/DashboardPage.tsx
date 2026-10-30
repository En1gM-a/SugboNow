// Dashboard: a bento grid summarizing every section. Each tile runs its own query in parallel,
// with its own skeleton and error state, so one slow endpoint never holds back the others.

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertItem } from '@/components/alerts/AlertItem';
import { LeaveTimeSummary } from '@/components/brief/LeaveTimeSummary';
import { LazyAlertsMap } from '@/components/map/LazyMaps';
import { ArrowLink, ButtonLink } from '@/components/ui/Button';
import { Badge, Card, CardHeader, KlaseChip } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Img } from '@/components/ui/Img';
import { LiveValue } from '@/components/ui/LiveValue';
import { EmptyState, ErrorState, LoadingLabel, Skeleton, SkeletonLines, UpdatedAgo } from '@/components/ui/States';
import { useAuth } from '@/context/AuthContext';
import { useNow } from '@/hooks/useBrowser';
import { useBrief, useNews, useWeatherAll } from '@/hooks/useFeeds';
import { useLguPosts } from '@/hooks/useLguPosts';
import { useLocations } from '@/hooks/usePlaces';
import { useProfile } from '@/hooks/useProfile';
import { formatAgo, formatHour, formatLongDate, formatTemp, greeting } from '@/utils/format';
import { cx } from '@/utils/cx';
import { conditionIcon, rainColor } from '@/utils/weather';
import { NEWS_SOURCE } from './NewsPage.shared';

// The first-load stagger runs once per session, never on later visits to the Dashboard.
let staggered = false;

function Tile({ index, className, children, stagger }: { index: number; className?: string; children: ReactNode; stagger: boolean }) {
  const style: CSSProperties | undefined = stagger ? { animationDelay: `${Math.min(index, 5) * 30}ms` } : undefined;
  return (
    <div className={`${stagger ? 'animate-fade-up motion-reduce:animate-fade-in' : ''} ${className ?? ''}`} style={style}>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [stagger] = useState(() => {
    const s = !staggered;
    staggered = true;
    return s;
  });
  const now = useNow();
  const profile = useProfile();
  const needsSetup = profile.data && (!profile.data.city || !profile.data.subscribedMayor);

  return (
    <div>
      <header className="mb-5 flex flex-col items-start gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 tabIndex={-1} data-page-heading className="text-2xl font-bold tracking-tight text-ink outline-none sm:text-3xl">
            {greeting(new Date(now))}
            {profile.data?.firstName ? `, ${profile.data.firstName}!` : '!'}
          </h1>
          <p className="mt-1 text-muted">{formatLongDate(new Date(now))}</p>
        </div>
        <WeatherChip />
      </header>

      {needsSetup && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-marigold bg-marigold-soft p-4">
          <p className="flex items-start gap-2 text-ink">
            <Icon name="sparkles" size={20} className="mt-0.5 text-status-medium-ink" />
            <span>
              <strong>Finish setting up.</strong> Pick your city and mayor so your brief, weather and class advisories fit you.
            </span>
          </p>
          <ButtonLink to="/welcome" size="sm">
            Set up now
          </ButtonLink>
        </div>
      )}

      <AlertStatusStrip />

      {/* 1 column on phones, 2 on tablets (dense packing fills gaps), 3 on desktop. */}
      <div className="grid grid-cols-1 gap-4 md:grid-flow-row-dense md:grid-cols-2 lg:grid-cols-3">
        <Tile index={0} stagger={stagger} className="md:col-span-2 lg:row-span-2">
          <BriefTile />
        </Tile>
        <Tile index={1} stagger={stagger}>
          <LeaveTimesTile now={now} />
        </Tile>
        <Tile index={2} stagger={stagger}>
          <WeatherTile />
        </Tile>
        <Tile index={3} stagger={stagger} className="md:col-span-2">
          <AlertsTile now={now} />
        </Tile>
        <Tile index={4} stagger={stagger}>
          <MiniMapTile />
        </Tile>
        <Tile index={5} stagger={stagger} className="md:col-span-2">
          <NewsTile now={now} />
        </Tile>
        <Tile index={5} stagger={stagger}>
          <MayorTile now={now} />
        </Tile>
      </div>
    </div>
  );
}

function useMyWeather() {
  const profile = useProfile();
  const weather = useWeatherAll();
  const mine = weather.data?.find((w) => w.area.slug === (profile.data?.city ?? 'cebu_city')) ?? weather.data?.[0];
  return { ...weather, mine };
}

function WeatherChip() {
  const { mine, isPending } = useMyWeather();
  if (isPending) return <Skeleton className="h-11 w-40 rounded-full" />;
  if (!mine) return null;
  return (
    <Link
      to="/weather"
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:border-mactan-sea/50"
    >
      <Icon name={conditionIcon(mine.current.condition, mine.current.isDay)} size={18} className="text-mactan-sea" />
      <LiveValue value={formatTemp(mine.current.tempC)} />
      <span className="font-normal text-muted">{mine.area.name}</span>
    </Link>
  );
}

/**
 * Critical alerts stay prominent: high-severity alerts near the user's places, above the grid.
 * The slot always has the same height (placeholder, alerts, all clear or unavailable), so the grid below never jumps.
 */
function AlertStatusStrip() {
  const { data, isPending, isError } = useBrief();
  const shell = 'mb-4 flex h-16 w-full items-center gap-3 rounded-2xl px-4 text-left';

  if (isPending) return <Skeleton className="mb-4 h-16 rounded-2xl" />;
  if (isError || !data)
    return (
      <div className={cx(shell, 'bg-stone-100 text-sm text-muted')}>
        <Icon name="info" size={22} />
        Alert status is unavailable right now.
      </div>
    );

  const high = data.alerts.filter((a) => a.severity === 'high');
  if (high.length === 0)
    return (
      <div className={cx(shell, 'bg-status-ok-soft')}>
        <Icon name="checkCircle" size={22} className="text-status-ok" />
        <span className="min-w-0 text-sm text-ink">
          <strong className="block font-semibold text-status-ok">All clear near your places</strong>
          <span className="block truncate">No high-severity alerts right now.</span>
        </span>
      </div>
    );

  const top = high[0];
  function jump() {
    const target = document.getElementById('alerts');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    target?.focus({ preventScroll: true });
  }
  return (
    <button
      type="button"
      onClick={jump}
      className={cx(shell, 'candle-glow border border-transparent bg-status-high-soft transition-colors duration-150 hover:border-status-high/30')}
    >
      <Icon name="alert" size={22} className="text-status-high" />
      <span className="min-w-0 flex-1 text-sm text-ink">
        <strong className="block truncate font-semibold text-status-high">
          {high.length} high-severity {high.length === 1 ? 'alert' : 'alerts'} near you
        </strong>
        <span className="block truncate">{top.title}</span>
      </span>
      {top.type === 'advisory' && (
        <span className="hidden sm:inline-flex">
          <KlaseChip />
        </span>
      )}
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-status-high">
        <span className="hidden sm:inline">See alerts</span>
        <Icon name="chevronDown" size={18} />
      </span>
    </button>
  );
}

function BriefTile() {
  const { data, isPending, isError, refetch, dataUpdatedAt, isFetching } = useBrief();
  return (
    <Card featured className="h-full" aria-labelledby="brief-h">
      <CardHeader
        id="brief-h"
        title="Cebu Daily Brief"
        icon="sparkles"
        action={
          <Badge tone="sea" icon="sparkles">
            AI summary
          </Badge>
        }
        subtitle={data ? <UpdatedAgo at={dataUpdatedAt} refreshing={isFetching} /> : undefined}
      />
      {isPending ? (
        <div className="min-h-[28rem] lg:min-h-0">
          <LoadingLabel>Loading your brief…</LoadingLabel>
          <SkeletonLines lines={3} />
          <SkeletonLines lines={5} className="mt-6" />
          <SkeletonLines lines={4} className="mt-6" />
        </div>
      ) : isError ? (
        <ErrorState message="We couldn’t load today’s brief." onRetry={() => void refetch()} />
      ) : (
        <div className="flex min-h-[28rem] flex-1 flex-col animate-fade-in lg:min-h-0">
          <p className="max-w-[70ch] text-[17px] leading-relaxed whitespace-pre-line text-ink">{data.brief.content}</p>
          <div className="mt-auto pt-4">
            <p className="flex items-start gap-1.5 border-t border-line pt-3 text-xs text-muted">
              <Icon name="info" size={14} className="mt-0.5" />
              Written automatically from today’s alerts, weather and your trips. Check the source before acting on it.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function LeaveTimesTile({ now }: { now: number }) {
  const { data, isPending, isError, refetch } = useBrief();
  return (
    <Card aria-labelledby="leave-h">
      <CardHeader id="leave-h" title="When to leave" icon="clock" action={<ArrowLink to="/traffic">Commute</ArrowLink>} />
      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <SkeletonLines lines={2} />
        </div>
      ) : isError ? (
        <ErrorState compact onRetry={() => void refetch()} />
      ) : data.leaveTimes.length === 0 ? (
        <EmptyState compact title="No trips today" action={<ButtonLink to="/profile#trips" size="sm" icon="plus">Add a weekly trip</ButtonLink>}>
          Add the trips you make each week and we’ll tell you when to leave.
        </EmptyState>
      ) : (
        <div className="animate-fade-in">
          <ul className="divide-y divide-line">
            {data.leaveTimes.slice(0, 2).map((lt) => (
              <li key={lt.scheduleEntryId} className="py-3 first:pt-0 last:pb-0">
                <LeaveTimeSummary lt={lt} now={now} />
              </li>
            ))}
          </ul>
          {data.leaveTimes.length > 2 && <p className="mt-2 text-sm text-muted">+{data.leaveTimes.length - 2} more trips today</p>}
        </div>
      )}
    </Card>
  );
}

function WeatherTile() {
  const { mine, isPending, isError, refetch, dataUpdatedAt } = useMyWeather();
  return (
    <Card aria-labelledby="wx-h">
      <CardHeader id="wx-h" title="Weather" icon="cloudRain" action={<ArrowLink to="/weather">Details</ArrowLink>} />
      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-11 w-36" />
          <Skeleton className="h-20" />
        </div>
      ) : isError ? (
        <ErrorState compact onRetry={() => void refetch()} />
      ) : !mine ? (
        <EmptyState compact title="No weather yet">The first forecast arrives within the hour.</EmptyState>
      ) : (
        <div className="animate-fade-in">
          <div className="flex items-center gap-3">
            <Icon name={conditionIcon(mine.current.condition, mine.current.isDay)} size={40} className="text-mactan-sea" />
            <div>
              <p className="font-heading text-4xl font-bold tracking-tight tabular-nums">
                <LiveValue value={formatTemp(mine.current.tempC)} />
              </p>
              <p className="text-sm text-muted">
                {mine.current.condition} · feels {formatTemp(mine.current.feelsLikeC)}
              </p>
            </div>
          </div>
          <p className="mt-4 mb-1.5 text-xs font-semibold text-muted">Rain chance, next 6 hours</p>
          <ol className="grid grid-cols-6 gap-1.5" aria-label="Rain chance for the next 6 hours">
            {mine.hourly.slice(1, 7).map((h) => (
              <li key={h.time} className="flex flex-col items-center gap-1">
                <div className="flex h-14 w-full items-end overflow-hidden rounded-md bg-stone-100">
                  <div className="w-full rounded-md" style={{ height: `${Math.max(8, h.chanceOfRain)}%`, background: rainColor(h.chanceOfRain) }} />
                </div>
                <span className="text-xs font-semibold tabular-nums">{h.chanceOfRain}%</span>
                <span className="text-xs text-muted">{formatHour(h.time)}</span>
              </li>
            ))}
          </ol>
          <UpdatedAgo at={dataUpdatedAt} className="mt-3" />
        </div>
      )}
    </Card>
  );
}

function AlertsTile({ now }: { now: number }) {
  const { data, isPending, isError, refetch } = useBrief();
  const top = data?.alerts.slice(0, 5) ?? [];
  return (
    <Card id="alerts" tabIndex={-1} aria-labelledby="alerts-h" className="scroll-mt-24">
      <CardHeader
        id="alerts-h"
        title="Alerts near you"
        icon="bell"
        subtitle="Within 3 km of your saved places"
        action={<ArrowLink to="/traffic">All alerts</ArrowLink>}
      />
      {isPending ? (
        <div className="space-y-5 py-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-40 rounded-full" />
              <SkeletonLines lines={2} />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState compact onRetry={() => void refetch()} />
      ) : top.length === 0 ? (
        <EmptyState compact title="All clear near your places">No traffic, floods or advisories close to you right now. Ingat sa dalan!</EmptyState>
      ) : (
        <ul aria-live="polite" className="-mx-3 divide-y divide-line animate-fade-in">
          {top.map((a) => (
            <li key={a.id}>
              <AlertItem alert={a} now={now} compact />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function MiniMapTile() {
  const locations = useLocations();
  const brief = useBrief();
  const places = locations.data ?? [];
  return (
    <Card aria-labelledby="map-h" padded={false} className="flex flex-col">
      <div className="p-4 pb-3 sm:p-5 sm:pb-3">
        <CardHeader id="map-h" title="Your map" icon="map" action={<ArrowLink to="/traffic">Open</ArrowLink>} />
        {!locations.isPending && places.length === 0 && (
          <EmptyState compact title="No saved places" action={<ButtonLink to="/profile#places" size="sm" icon="plus">Add a place</ButtonLink>} />
        )}
      </div>
      {places.length > 0 && (
        <LazyAlertsMap
          whenVisible
          interactive={false}
          label="Map of your saved places and nearby alerts"
          places={places}
          alerts={brief.data?.alerts ?? []}
          className="h-64 border-t border-line lg:h-72"
        />
      )}
    </Card>
  );
}

function MayorTile({ now }: { now: number }) {
  const { user } = useAuth();
  // Runs once per sign-in: the backend checks the mayor's page; the browser never contacts Facebook.
  const { data, isPending, isError, refetch } = useLguPosts(user?.id ?? null);
  return (
    <Card aria-labelledby="mayor-h">
      <CardHeader
        id="mayor-h"
        title="From your mayor"
        icon="megaphone"
        subtitle={data?.source ? data.source.displayName : undefined}
        action={<ArrowLink to="/mayor">More</ArrowLink>}
      />
      {isPending ? (
        <SkeletonLines lines={5} />
      ) : isError ? (
        <ErrorState compact onRetry={() => void refetch()} />
      ) : !data.source ? (
        <EmptyState compact title="Follow your mayor" action={<ButtonLink to="/profile" size="sm">Choose a mayor</ButtonLink>}>
          Get class suspensions and advisories straight from your LGU.
        </EmptyState>
      ) : data.posts.length === 0 ? (
        <EmptyState compact title="No posts yet">We’ll show new posts here as soon as they’re up.</EmptyState>
      ) : (
        <ul className="divide-y divide-line animate-fade-in">
          {data.posts.slice(0, 2).map((p) => (
            <li key={p.id} className="py-3 first:pt-0 last:pb-0">
              <p className="line-clamp-3 text-sm text-ink">{p.caption}</p>
              <p className="mt-1 text-xs text-muted tabular-nums">{p.postedAt ? formatAgo(p.postedAt, now) : ''}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function NewsTile({ now }: { now: number }) {
  const { data, isPending, isError, refetch } = useNews(3);
  const items = data ?? [];
  return (
    <Card aria-labelledby="news-h">
      <CardHeader id="news-h" title="Top Cebu news" icon="news" action={<ArrowLink to="/news">All news</ArrowLink>} />
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="aspect-video rounded-xl" />
              <SkeletonLines lines={2} className="mt-2" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState compact onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState compact title="No news in the last 3 days" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-3 animate-fade-in">
          {items.map((n) => (
            <li key={n.id}>
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="group block rounded-xl">
                <Img src={n.imageUrl} alt="" className="rounded-xl" />
                <p className="mt-2 line-clamp-3 text-[15px] leading-snug font-semibold text-ink transition-colors duration-150 group-hover:text-mactan-sea-dark">
                  {n.title}
                </p>
                <p className="mt-1 text-xs text-muted tabular-nums">
                  {NEWS_SOURCE[n.source]} · {formatAgo(n.publishedAt, now)}
                  <span className="sr-only"> (opens in a new tab)</span>
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
