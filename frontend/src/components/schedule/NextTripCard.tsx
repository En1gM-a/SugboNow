import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CountUp } from '@/components/CountUp';
import { JeepneyArt } from '@/components/EmptyArt';
import { Expander } from '@/components/Expander';
import { Icon } from '@/components/icons/Icon';
import { RollNumber } from '@/components/RollNumber';
import { Card, CardError, timing } from '@/components/today/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tag } from '@/components/ui/Tag';
import { TRIP_TIMES } from '@/lib/mockOnly';
import { USE_MOCKS } from '@/lib/supabaseClient';
import type { AlertType, BriefTodayResponse } from '@/types/api';
import { cx, vars } from '@/utils/cx';
import { formatClock } from '@/utils/format';

const REASON_WORD: Record<AlertType, string> = {
  traffic: 'traffic',
  flood: 'flood',
  closure: 'road works',
  weather: 'rain',
  advisory: 'advisory',
  power: 'brownout',
  water: 'water',
};

/** Today's travel time against the usual time across the morning, in plain SVG. Mock for now: the API has no series. */
function TripChart() {
  const { usual, today, labels } = TRIP_TIMES;
  const W = 600;
  const H = 140;
  const top = 26;
  const bottom = 132;
  const min = 18;
  const max = 48;
  const x = (k: number) => 6 + (k * (W - 12)) / (today.length - 1);
  const y = (v: number) => bottom - ((v - min) * (bottom - top)) / (max - min);
  const line = (data: number[]) => data.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const peak = today.indexOf(Math.max(...today));
  const area = `${line(today)} L${x(today.length - 1)} ${bottom} L${x(0)} ${bottom} Z`;

  return (
    <figure className="trip-chart">
      <div className="trip-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Travel time this morning: today's trip takes up to ${today[peak]} minutes, usually ${usual[peak]}.`}>
          <defs>
            <linearGradient id="trip-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFC233" stopOpacity="0.45" />
              <stop offset="1" stopColor="#FFC233" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="e-fade" d={area} fill="url(#trip-fill)" />
          <path d={line(usual)} fill="none" stroke="rgba(200,213,230,.6)" strokeWidth="2" strokeDasharray="4 4" />
          <path className="e-draw" pathLength={1} strokeDasharray="1" d={line(today)} fill="none" stroke="#FFC233" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle className="e-dot" cx={x(peak)} cy={y(today[peak])} r="6" fill="#FFC233" stroke="#0E1726" strokeWidth="2" />
        </svg>
        <span className="peak e-dot tabular-nums" aria-hidden="true" style={{ left: `${(x(peak) / W) * 100}%`, top: `${(y(today[peak]) / H) * 100}%` }}>
          {today[peak]} min
        </span>
      </div>
      <div className="trip-axis" aria-hidden="true">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <figcaption className="legend">
        <span>
          <i className="key key-today" />
          Today
        </span>
        <span>
          <i className="key key-usual" />
          Usual
        </span>
      </figcaption>
    </figure>
  );
}

function TripSkeleton() {
  return (
    <div className="trip-skel" aria-hidden="true">
      <Skeleton className="skel-line w-32" />
      <Skeleton className="skel-hero" />
      <Skeleton className="skel-line w-64" />
      {USE_MOCKS ? <Skeleton className="skel-chart" /> : <Skeleton className="skel-line w-48" />}
    </div>
  );
}

/**
 * The next trip (Today, item 3): the page's primary element, a dark glass card. A mango delay chip that opens the
 * reasons, "Leave by 6:55 AM" as number reels at the hero size, the route, the trip chart, then "Later today".
 */
export function NextTripCard({ i, brief }: { i: number; brief: UseQueryResult<BriefTodayResponse> }) {
  const [open, setOpen] = useState(false);
  const t = timing(i);
  const head = (
    <h2 id="trip-h" className="card-title">
      Your next trip
    </h2>
  );

  if (brief.isPending) {
    return (
      <Card i={i} span="span-7" tone="night" className="trip">
        <TripSkeleton />
      </Card>
    );
  }
  if (brief.isError) {
    return (
      <Card i={i} span="span-7" tone="night" className="trip" labelledBy="trip-h">
        {head}
        <CardError what="your leave times" onRetry={() => void brief.refetch()} />
      </Card>
    );
  }

  const { leaveTimes, alerts } = brief.data;
  if (leaveTimes.length === 0) {
    return (
      <Card i={i} span="span-7" tone="night" className="trip" labelledBy="trip-h">
        {head}
        <div className="empty">
          <JeepneyArt />
          <p className="empty-text">Add your weekly trips to get a leave time</p>
          <Link to="/profile?section=trips" className="btn btn-secondary">
            Add a trip
          </Link>
        </div>
      </Card>
    );
  }

  const now = Date.now();
  const upcoming = leaveTimes.filter((lt) => new Date(lt.leaveAtIso).getTime() > now - 10 * 60_000);
  const next = upcoming[0];
  if (!next) {
    return (
      <Card i={i} span="span-7" tone="night" className="trip" labelledBy="trip-h">
        {head}
        <p className="done-today">No more trips today.</p>
        <p className="route">Tomorrow&apos;s leave times are ready by 5:30 AM.</p>
      </Card>
    );
  }

  const later = upcoming.slice(1);
  const [clock, half] = formatClock(next.leaveAt).split(' ');
  const firstReason = next.reasons[0];
  const reasonAlert = firstReason ? alerts.find((a) => a.id === firstReason.alertId) : undefined;
  const word = reasonAlert ? REASON_WORD[reasonAlert.type] : 'delays';

  return (
    <Card i={i} span="span-7" tone="night" className="trip" labelledBy="trip-h">
      <div className="card-head">
        {head}
        {next.delayMinutes > 0 ? (
          <button type="button" className="tag tag-mango delay-chip e-pop" aria-expanded={open} aria-controls="trip-reasons" onClick={() => setOpen((o) => !o)}>
            <span>
              +<CountUp value={next.delayMinutes} delay={t.count} /> min · {word}
            </span>
            <Icon name="caret-right" className={cx('chev', open && 'is-open')} />
          </button>
        ) : (
          <Tag tone="quiet" className="e-pop">
            Usual time
          </Tag>
        )}
      </div>
      <Expander open={open} id="trip-reasons">
        <ul className="reasons">
          {next.reasons.map((r) => (
            <li key={r.alertId}>
              <b className="tabular-nums">+{r.minutes} min</b> {r.title}, near {r.nearPlace}
            </li>
          ))}
        </ul>
      </Expander>
      <p className="big tabular-nums">
        <small>Leave by</small>
        <RollNumber value={clock} delay={t.reel} /> {half}
      </p>
      <p className="route">
        {next.title} · {next.origin.label} → {next.destination.label} · arrive {formatClock(next.arriveBy)}
      </p>
      {USE_MOCKS ? (
        <TripChart />
      ) : (
        <p className="usual tabular-nums">
          Usually {next.baseMinutes} min · today {next.baseMinutes + next.delayMinutes} min
        </p>
      )}
      {later.length > 0 && (
        <div className="later">
          <h3 className="later-h">Later today</h3>
          <ul>
            {later.map((lt, j) => (
              <li key={lt.scheduleEntryId} className="later-row e-row" style={vars({ '--j': j })}>
                <span>{lt.title}</span>
                <b className="tabular-nums">{formatClock(lt.leaveAt)}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
