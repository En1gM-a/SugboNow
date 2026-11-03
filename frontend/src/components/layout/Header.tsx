import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useMatches } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { LiveIcon } from '@/components/LiveIcon';
import { RiseWords } from '@/components/RiseWords';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { useBrief, useWeather } from '@/hooks/useFeeds';
import { useManilaTime } from '@/hooks/useManilaTime';
import { useProfile } from '@/hooks/useProfile';
import { getDisplay, useDisplay } from '@/lib/display';
import { useGateHeld } from '@/lib/entrance';
import { greeting, shortDate } from '@/lib/time';
import { oneWord, weatherKind } from '@/lib/weatherKind';
import { initials } from '@/utils/format';
import { Bell } from './Bell';

export interface RouteHandle {
  /** The page title, or "greeting" for Today's "Maayong udto, Thea". */
  title: string;
}

function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}

function updatedAgo(at: number, now: number): string {
  const min = Math.max(0, Math.round((now - at) / 60_000));
  if (min < 1) return 'Updated just now';
  if (min < 60) return `Updated ${min} min ago`;
  return `Updated ${Math.round(min / 60)} h ago`;
}

/** "Updated 2 min ago", after the live dot. The dot sends out one ring when new data arrives; it never pulses on its own. */
function LiveStamp() {
  const brief = useBrief();
  const now = useNow(30_000);
  const ring = useRef<HTMLSpanElement>(null);
  const last = useRef(0);
  const at = brief.dataUpdatedAt;

  useEffect(() => {
    if (last.current && at > last.current && !getDisplay().still) {
      ring.current?.animate([{ transform: 'scale(1)', opacity: 0.7 }, { transform: 'scale(2.8)', opacity: 0 }], { duration: 400, easing: 'ease-out' });
    }
    last.current = at;
  }, [at]);

  if (!at) return null;
  return (
    <span className="stamp">
      <span className="live-dot" aria-hidden="true">
        <span className="live-ring" ref={ring} />
      </span>
      {updatedAgo(at, now)}
    </span>
  );
}

/** Still live icon, temperature and a one-word condition; it opens the Weather page. */
function WeatherChip({ city }: { city: string | null | undefined }) {
  const weather = useWeather(city);
  if (!weather.data) return city ? <Skeleton className="wx-chip-skel" /> : null;
  const kind = weatherKind(weather.data.current.iconUrl);
  const temp = Math.round(weather.data.current.tempC);
  return (
    <Link to="/weather" className="wx-chip" aria-label={`Weather: ${temp}°, ${weather.data.current.condition}`}>
      <LiveIcon kind={kind} still />
      <span className="tabular-nums">{temp}°</span>
      <span className="wx-chip-word">{oneWord(kind)}</span>
    </Link>
  );
}

/**
 * The header (handoff <layout>): a glass panel at the top of the content column. Left, the page title with the
 * location, the date and "Updated 2 min ago" under it; right, the weather chip, the bell, the theme switch and the
 * avatar. It scrolls away with the page.
 */
export function Header() {
  const matches = useMatches();
  const location = useLocation();
  const { user } = useAuth();
  const profile = useProfile();
  const time = useManilaTime();
  // Under the log-in smoke the title waits, and rises as the smoke clears.
  const held = useGateHeld();
  const { still } = useDisplay();
  const h1 = useRef<HTMLHeadingElement>(null);
  const firstRoute = useRef(true);

  const handle = matches[matches.length - 1]?.handle as RouteHandle | undefined;
  const isGreeting = handle?.title === 'greeting';
  const title = isGreeting ? greeting(time, profile.data?.firstName) : (handle?.title ?? '');
  const waiting = isGreeting && !profile.data;
  const place = profile.data?.addressText ?? null;
  const name = profile.data?.firstName ?? user?.email ?? '';

  // Move focus to the page's title on every route change, including arriving from sign-in, but not on a fresh page load.
  useEffect(() => {
    const fresh = firstRoute.current && location.key === 'default';
    firstRoute.current = false;
    if (!fresh) h1.current?.focus({ preventScroll: true });
  }, [location.pathname, location.key]);

  return (
    <header className="top glass">
      <div className="top-title">
        {/* One h1 for every page, so focus stays on it while the greeting loads. */}
        <h1 ref={h1} tabIndex={-1} className="top-h1">
          {waiting ? (
            <>
              <span className="sr-only">Today</span>
              <Skeleton className="title-skel" />
            </>
          ) : (
            <RiseWords key={`${title}-${held}`} text={title} play={!held && !still} />
          )}
        </h1>
        <div className="meta-row">
          {place && (
            <span className="loc">
              <Icon name="map-pin" />
              {place}
            </span>
          )}
          <span>{shortDate()}</span>
          <LiveStamp />
        </div>
      </div>
      <div className="top-actions">
        <WeatherChip city={profile.data?.city} />
        <Bell />
        <ThemeSwitch />
        <Link to="/profile" className="avatar" aria-label="Profile">
          {initials(name)}
        </Link>
      </div>
    </header>
  );
}
