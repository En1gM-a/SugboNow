import { useDeferredValue, useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertItem } from '@/components/alerts/AlertItem';
import { LazyWeatherMap } from '@/components/map/LazyMaps';
import { Badge, Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { SelectField } from '@/components/ui/Controls';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LiveValue } from '@/components/ui/LiveValue';
import { EmptyState, ErrorState, LoadingLabel, Skeleton, SkeletonLines, UpdatedAgo } from '@/components/ui/States';
import { TableDisclosure, tableClass } from '@/components/ui/TableDisclosure';
import { useNow } from '@/hooks/useBrowser';
import { useAlerts, useWeatherAll } from '@/hooks/useFeeds';
import { useProfile } from '@/hooks/useProfile';
import type { Weather, WeatherHour } from '@/types/api';
import { formatHour, formatTemp, formatTime } from '@/utils/format';
import { conditionIcon, RAIN_LEGEND, rainColor } from '@/utils/weather';

export default function WeatherPage() {
  const now = useNow();
  const profile = useProfile();
  const weather = useWeatherAll();
  // The area being viewed lives in the URL (?area=talisay_city); no param means your city.
  const [params, setParams] = useSearchParams();
  const setPicked = (slug: string) => setParams(slug === profile.data?.city ? {} : { area: slug }, { replace: true });
  const [hour, setHour] = useState(0);
  const deferredHour = useDeferredValue(hour);
  const slug = params.get('area') ?? profile.data?.city ?? 'cebu_city';
  const mine = weather.data?.find((w) => w.area.slug === slug) ?? weather.data?.[0];
  const hourTime = mine?.hourly[hour]?.time;

  return (
    <div>
      <PageHeader
        title="Weather"
        subtitle="Current conditions and the next 24 hours for every Metro Cebu area."
        action={weather.data ? <UpdatedAgo at={mine?.fetchedAt ?? weather.dataUpdatedAt} refreshing={weather.isFetching} /> : undefined}
      />

      {weather.isError ? (
        <Card>
          <ErrorState message="We couldn’t load the weather." onRetry={() => void weather.refetch()} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card featured className="lg:col-span-2" aria-labelledby="your-area">
            {!mine ? (
              <>
                <LoadingLabel>Loading weather…</LoadingLabel>
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="mt-4 h-48 rounded-xl" />
              </>
            ) : (
              <div className="animate-fade-in">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 id="your-area" className="sr-only">
                    Your area
                  </h2>
                  <SelectField label="Area" value={mine.area.slug} onChange={(e) => setPicked(e.target.value)} className="w-full sm:w-56">
                    {weather.data!.map((w) => (
                      <option key={w.area.slug} value={w.area.slug}>
                        {w.area.name}
                        {w.area.slug === profile.data?.city ? ' (your city)' : ''}
                      </option>
                    ))}
                  </SelectField>
                  <p className="text-xs text-muted">Observed {formatTime(mine.observedAt)}</p>
                </div>
                <CurrentConditions w={mine} />
                <h3 className="mt-7 mb-2 text-base font-semibold">Next 24 hours</h3>
                <HourlyChart hours={mine.hourly} />
              </div>
            )}
          </Card>

          <Card aria-labelledby="wx-alerts">
            <CardHeader id="wx-alerts" title="Weather & flood alerts" icon="bell" />
            <WeatherAlerts now={now} />
          </Card>

          <Card className="lg:col-span-2" padded={false} aria-labelledby="wx-map">
            <div className="p-4 sm:p-5">
              <CardHeader id="wx-map" title="When will it rain where?" icon="map" subtitle="Drag the slider to see each area’s rain chance by hour." />
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="hour" className="sr-only">
                  Forecast hour
                </label>
                <output htmlFor="hour" className="w-20 text-sm font-semibold tabular-nums">
                  {hour === 0 ? 'Now' : hourTime ? formatTime(hourTime) : ''}
                </output>
                <input
                  id="hour"
                  type="range"
                  min={0}
                  max={24}
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  aria-valuetext={hour === 0 ? 'Now' : `${hourTime ? formatTime(hourTime) : ''}, in ${hour} hours`}
                  className="h-11 min-w-0 flex-1 accent-mactan-sea"
                />
                <span className="text-sm text-muted tabular-nums">+{hour} h</span>
              </div>
              <ul className="mt-1 flex flex-wrap gap-3 text-xs text-muted" aria-label="Rain chance legend">
                {RAIN_LEGEND.map((l) => (
                  <li key={l.label} className="inline-flex items-center gap-1.5">
                    <span className="size-3 rounded-full" style={{ background: l.color }} />
                    {l.label}
                  </li>
                ))}
              </ul>
            </div>
            {weather.data ? (
              <>
                <LazyWeatherMap areas={weather.data} hour={deferredHour} selected={mine?.area.slug} onSelect={setPicked} className="h-[420px] border-t border-line" />
                <div className="px-4 pb-3 sm:px-5">
                  <TableDisclosure summary="Show the map as a table">
                    <table className={tableClass}>
                      <caption className="sr-only">Temperature and rain chance by area, {hour === 0 ? 'now' : `at ${hourTime ? formatTime(hourTime) : ''}`}</caption>
                      <thead>
                        <tr>
                          <th scope="col">Area</th>
                          <th scope="col">Temperature</th>
                          <th scope="col">Rain chance</th>
                          <th scope="col">Conditions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weather.data.map((w) => {
                          const h = w.hourly[hour] ?? w.hourly[0];
                          return (
                            <tr key={w.area.slug}>
                              <th scope="row" className="!text-sm !font-semibold !text-ink">
                                {w.area.name}
                              </th>
                              <td>{formatTemp(h?.tempC ?? w.current.tempC)}</td>
                              <td>{h?.chanceOfRain ?? w.current.chanceOfRain}%</td>
                              <td className="text-muted">{h?.condition ?? w.current.condition}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </TableDisclosure>
                </div>
              </>
            ) : (
              <Skeleton className="h-[420px] rounded-none" />
            )}
          </Card>

          <PagasaPanel />
        </div>
      )}
    </div>
  );
}

function CurrentConditions({ w }: { w: Weather }) {
  const c = w.current;
  const stats: Array<{ icon: IconName; label: string; value: string }> = [
    { icon: 'thermometer', label: 'Feels like', value: formatTemp(c.feelsLikeC) },
    { icon: 'cloudRain', label: 'Rain chance', value: `${c.chanceOfRain}%` },
    { icon: 'droplet', label: 'Humidity', value: `${c.humidity}%` },
    { icon: 'wind', label: 'Wind', value: `${Math.round(c.windKph)} km/h` },
  ];
  return (
    <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
      <div className="flex items-center gap-4">
        <Icon name={conditionIcon(c.condition, c.isDay)} size={64} className="text-mactan-sea" />
        <div>
          <p className="font-heading text-6xl leading-none font-bold tracking-tight">
            <LiveValue value={formatTemp(c.tempC)} />
          </p>
          <p className="mt-1 font-semibold text-ink">{c.condition}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="flex items-center gap-1 text-xs text-muted">
              <Icon name={s.icon} size={14} />
              {s.label}
            </dt>
            <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Plain SVG chart: temperature line over rain-chance bars. Scrolls sideways on phones. */
function HourlyChart({ hours }: { hours: WeatherHour[] }) {
  const titleId = useId();
  const W = 760;
  const H = 200;
  const pad = { t: 26, b: 36, l: 8, r: 8 };
  const step = (W - pad.l - pad.r) / hours.length;
  const temps = hours.map((h) => h.tempC);
  const tMin = Math.min(...temps) - 1;
  const tMax = Math.max(...temps) + 1;
  const plotH = H - pad.t - pad.b;
  const x = (i: number) => pad.l + step * i + step / 2;
  const yT = (t: number) => pad.t + (1 - (t - tMin) / (tMax - tMin)) * plotH * 0.55;
  const path = hours.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${yT(h.tempC).toFixed(1)}`).join(' ');

  return (
    <figure>
      <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-[760px] max-w-none sm:w-full" role="img" aria-labelledby={titleId}>
          <title id={titleId}>
            {`Temperature from ${formatTemp(Math.min(...temps))} to ${formatTemp(Math.max(...temps))}; rain chance peaks at ${Math.max(...hours.map((h) => h.chanceOfRain))}%.`}
          </title>
          {hours.map((h, i) => {
            const bh = (h.chanceOfRain / 100) * plotH * 0.42;
            return (
              <g key={h.time}>
                <rect x={x(i) - step * 0.32} y={H - pad.b - bh} width={step * 0.64} height={bh} rx={3} style={{ fill: rainColor(h.chanceOfRain) }} opacity={0.85} />
                {i % 3 === 0 && (
                  <>
                    <text x={x(i)} y={H - pad.b + 15} textAnchor="middle" fontSize="12" className="fill-muted">
                      {i === 0 ? 'Now' : formatHour(h.time)}
                    </text>
                    <text x={x(i)} y={H - pad.b + 30} textAnchor="middle" fontSize="12" fontWeight="600" className="fill-mactan-sea-dark" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {h.chanceOfRain}%
                    </text>
                  </>
                )}
              </g>
            );
          })}
          <path d={path} fill="none" className="stroke-chart-temp" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {hours.map((h, i) =>
            i % 3 === 0 ? (
              <g key={`t${h.time}`}>
                <circle cx={x(i)} cy={yT(h.tempC)} r={3.5} className="fill-surface stroke-chart-temp" strokeWidth={2} />
                <text x={x(i)} y={yT(h.tempC) - 9} textAnchor="middle" fontSize="12" fontWeight="700" className="fill-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatTemp(h.tempC)}
                </text>
              </g>
            ) : null,
          )}
        </svg>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-chart-temp" /> Temperature
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-mactan-sea" /> Chance of rain
        </span>
      </figcaption>
      <TableDisclosure summary="Show hourly forecast as a table">
        <table className={tableClass}>
          <caption className="sr-only">Hourly forecast for the next 24 hours</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Temperature</th>
              <th scope="col">Rain chance</th>
              <th scope="col">Conditions</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((h, i) => (
              <tr key={h.time}>
                <th scope="row" className="!text-sm !font-semibold !text-ink">
                  {i === 0 ? 'Now' : formatTime(h.time)}
                </th>
                <td>{formatTemp(h.tempC)}</td>
                <td>{h.chanceOfRain}%</td>
                <td className="text-muted">{h.condition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableDisclosure>
    </figure>
  );
}

function WeatherAlerts({ now }: { now: number }) {
  const { data, isPending, isError, refetch } = useAlerts({ type: ['weather', 'flood'] });
  if (isPending) return <SkeletonLines lines={5} />;
  if (isError) return <ErrorState compact onRetry={() => void refetch()} />;
  if (data.length === 0) return <EmptyState compact title="No weather or flood alerts">Clear for now. We check every hour.</EmptyState>;
  return (
    <ul aria-live="polite" className="-mx-3 divide-y divide-line">
      {data.slice(0, 6).map((a) => (
        <li key={a.id}>
          <AlertItem alert={a} now={now} compact />
        </li>
      ))}
    </ul>
  );
}

/** Not offered by the API yet: mock content, clearly labeled. */
function PagasaPanel() {
  const outlook = [
    { day: 'Sat', icon: 'storm' as const, hi: 31, lo: 25, rain: 80 },
    { day: 'Sun', icon: 'cloudRain' as const, hi: 30, lo: 25, rain: 65 },
    { day: 'Mon', icon: 'cloud' as const, hi: 31, lo: 26, rain: 40 },
    { day: 'Tue', icon: 'sun' as const, hi: 32, lo: 26, rain: 20 },
    { day: 'Wed', icon: 'cloud' as const, hi: 31, lo: 25, rain: 35 },
  ];
  return (
    <Card aria-labelledby="pagasa-h">
      <CardHeader id="pagasa-h" title="Forecast & advisories" icon="calendar" action={<Badge tone="marigold">Preview</Badge>} />
      <div className="divide-y divide-line text-sm">
        <section className="pb-4">
          <h3 className="text-sm font-semibold">Tonight and tomorrow</h3>
          <p className="mt-1 text-muted">Cloudy skies with scattered rain showers and thunderstorms over Metro Cebu. Light to moderate winds from the northeast.</p>
        </section>
        <section className="flex items-start gap-2 py-4">
          <Icon name="storm" size={18} className="mt-0.5 text-status-medium" />
          <div>
            <h3 className="text-sm font-semibold text-status-medium">Thunderstorm advisory</h3>
            <p className="mt-0.5 text-ink">Possible in Talisay, Minglanilla and Naga in the next 2 hours.</p>
          </div>
        </section>
        <section className="py-4">
          <h3 className="mb-2 text-sm font-semibold">5-day outlook</h3>
          <ol className="grid grid-cols-5 gap-1 text-center">
            {outlook.map((d) => (
              <li key={d.day}>
                <p className="text-xs font-semibold text-muted">{d.day}</p>
                <Icon name={d.icon} size={22} className="mx-auto my-1 text-mactan-sea" />
                <p className="text-xs font-semibold tabular-nums">
                  {d.hi}°<span className="font-normal text-muted">/{d.lo}°</span>
                </p>
                <p className="text-xs text-mactan-sea-dark tabular-nums">{d.rain}%</p>
              </li>
            ))}
          </ol>
        </section>
        <p className="pt-4 text-xs text-muted">Sample content. Official PAGASA forecasts will appear here once the backend supports them.</p>
      </div>
    </Card>
  );
}
