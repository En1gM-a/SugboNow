import { Link } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { LiveIcon } from '@/components/LiveIcon';
import type { LiveKind } from '@/components/liveIconArt';
import { Skeleton } from '@/components/ui/Skeleton';
import { useNow } from '@/hooks/useBrowser';
import { useAlerts, useBrief, useWeather } from '@/hooks/useFeeds';
import { useProfile } from '@/hooks/useProfile';
import { weatherKind } from '@/lib/weatherKind';
import { cx, vars } from '@/utils/cx';
import { formatClock } from '@/utils/format';

function GlanceRow({ to, kind, title, note }: { to: string; kind: LiveKind; title: string; note: string }) {
  return (
    <li>
      <Link to={to} className="glance-row">
        <span className="glance-ico">
          <LiveIcon kind={kind} still />
        </span>
        <span className="glance-text">
          <b className="tabular-nums">{title}</b>
          <span className="muted small">{note}</span>
        </span>
        <Icon name="caret-right" className="glance-caret" />
      </Link>
    </li>
  );
}

const SkeletonRow = () => (
  <li aria-hidden="true">
    <Skeleton className="skel-row" />
  </li>
);

interface RightNowProps {
  /** Its place in the page's entrance. */
  i?: number;
  /** "strip" lays the three items side by side, for pages without a side column. */
  layout?: 'stack' | 'strip';
  /** Without its own glass, for use inside another panel like the phone's bottom sheet. */
  flat?: boolean;
  className?: string;
}

/**
 * The "Right now" glance (handoff <layout>): the next leave time, the weather with its rain chance, and the number of
 * high alerts near the user's places, each linking to its page. It's on every page except Today, which is this content.
 */
export function RightNow({ i = 1, layout = 'stack', flat = false, className }: RightNowProps) {
  const brief = useBrief();
  const profile = useProfile();
  const weather = useWeather(profile.data?.city);
  const alerts = useAlerts({ relevant: true });
  const now = useNow(60_000);

  const next = brief.data?.leaveTimes.find((lt) => new Date(lt.leaveAtIso).getTime() > now - 10 * 60_000);
  const hasTrips = (brief.data?.leaveTimes.length ?? 0) > 0;
  const current = weather.data ?? brief.data?.weather ?? null;
  const high = alerts.data?.filter((a) => a.severity === 'high').length;

  return (
    <section className={cx(!flat && 'card glass e-card', 'glance', layout === 'strip' && 'glance-strip', className)} style={flat ? undefined : vars({ '--i': i })} aria-labelledby="glance-h">
      <h2 id="glance-h" className="card-title">
        Right now
      </h2>
      <ul className="glance-rows">
        {brief.isPending ? (
          <SkeletonRow />
        ) : next ? (
          <GlanceRow to="/" kind="clock" title={`Leave by ${formatClock(next.leaveAt)}`} note={next.title} />
        ) : (
          <GlanceRow to={hasTrips ? '/' : '/profile?section=trips'} kind="clock" title={hasTrips ? 'No more trips today' : 'No trips yet'} note={hasTrips ? 'Next leave time tomorrow' : 'Add a weekly trip'} />
        )}
        {current ? (
          <GlanceRow to="/weather" kind={weatherKind(current.current.iconUrl, current.current.chanceOfRain)} title={`${Math.round(current.current.tempC)}° ${current.current.condition}`} note={`${current.current.chanceOfRain}% chance of rain`} />
        ) : weather.isPending && brief.isPending ? (
          <SkeletonRow />
        ) : null}
        {high === undefined ? (
          <SkeletonRow />
        ) : (
          <GlanceRow to="/traffic" kind="traffic" title={high === 0 ? 'No high alerts' : `${high} high ${high === 1 ? 'alert' : 'alerts'}`} note="Near your places" />
        )}
      </ul>
    </section>
  );
}
