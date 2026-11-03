import { LiveIcon } from '@/components/LiveIcon';
import { RollNumber } from '@/components/RollNumber';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWeather } from '@/hooks/useFeeds';
import { rainAdvice, weatherKind } from '@/lib/weatherKind';
import type { Weather } from '@/types/api';
import { vars } from '@/utils/cx';
import { Card, CardError, timing } from './Card';

const HOUR_LABELS = ['Now', '+1h', '+2h', '+3h', '+4h', '+5h'];

const inHours = (j: number) => (j === 0 ? 'now' : `in ${j} ${j === 1 ? 'hour' : 'hours'}`);

/**
 * Weather now (Today, item 4): the looping live icon, the temperature as a number reel, the condition, one line of
 * advice from the hourly rain chance, and rain bars for the next 6 hours. It reads the user's home city from
 * GET /api/weather/:area, or the brief's weather when the profile has no city.
 */
export function WeatherNowCard({ i, city, fallback }: { i: number; city: string | null | undefined; fallback: Weather | null | undefined }) {
  const query = useWeather(city);
  const t = timing(i);
  const weather = query.data ?? fallback ?? null;

  if (!weather) {
    if (query.isError || (fallback === null && !city)) {
      return (
        <Card i={i} span="span-5" labelledBy="wx-h">
          <h2 id="wx-h" className="card-title">
            Weather now
          </h2>
          {query.isError ? <CardError what="the weather" onRetry={() => void query.refetch()} /> : <p className="muted small">The weather isn&apos;t available yet.</p>}
        </Card>
      );
    }
    return (
      <Card i={i} span="span-5">
        <div className="wx-skel" aria-hidden="true">
          <Skeleton className="skel-line w-28" />
          <Skeleton className="skel-temp" />
          <Skeleton className="skel-line w-48" />
          <Skeleton className="skel-bars" />
        </div>
      </Card>
    );
  }

  const kind = weatherKind(weather.current.iconUrl);
  const hours = weather.hourly.slice(0, 6);

  return (
    <Card i={i} span="span-5" className="weather-now" labelledBy="wx-h">
      <div className="card-head">
        <h2 id="wx-h" className="card-title">
          Weather now
        </h2>
        <span className="muted small">{weather.area.name}</span>
      </div>
      <div className="wx-now">
        <span className="wxi">
          <LiveIcon kind={kind} />
        </span>
        <div>
          <p className="temp tabular-nums">
            <RollNumber value={String(Math.round(weather.current.tempC))} delay={t.reel} />°
          </p>
          <p className="wx-label">{weather.current.condition}</p>
        </div>
      </div>
      <p className="advice muted small">{rainAdvice(weather.hourly)}</p>
      <div className="bars" role="img" aria-label={`Rain chance: ${hours.map((h, j) => `${inHours(j)} ${h.chanceOfRain}%`).join(', ')}`}>
        {hours.map((h, j) => (
          <div key={h.time} className="bar">
            <i className="e-bar" style={{ ...vars({ '--j': j }), height: `${Math.max(6, h.chanceOfRain * 0.6)}px` }} />
            <span>{HOUR_LABELS[j]}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
