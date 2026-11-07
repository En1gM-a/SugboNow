// Weather (/weather, handoff <pages> page 7): "Will it rain where I'm going?" One view at a time: now and the next hours
// for the chosen area, then a card with tabs for the 24-hour chart, the rain map and the advisories. Leaflet loads when
// the map tab first opens.

import { useDeferredValue, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertDetails, AlertRow } from '@/components/alerts/AlertRow';
import { CountUp } from '@/components/CountUp';
import { Icon } from '@/components/icons/Icon';
import { Page } from '@/components/layout/Page';
import { LiveIcon } from '@/components/LiveIcon';
import { LazyWeatherMap } from '@/components/map/LazyMaps';
import { RAIN_STEPS, rainStep } from '@/components/map/mapTokens';
import { RightNow } from '@/components/RightNow';
import { RollNumber } from '@/components/RollNumber';
import { CardError, timing } from '@/components/today/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tag } from '@/components/ui/Tag';
import { TableDisclosure } from '@/components/weather/TableDisclosure';
import { WeatherChart } from '@/components/weather/WeatherChart';
import { useMediaQuery, useNow } from '@/hooks/useBrowser';
import { useAlerts, useWeatherAll } from '@/hooks/useFeeds';
import { useProfile } from '@/hooks/useProfile';
import { PAGASA_SAMPLE } from '@/lib/mockOnly';
import { USE_MOCKS } from '@/lib/supabaseClient';
import { rainAdvice, weatherKind } from '@/lib/weatherKind';
import type { Weather, WeatherHour } from '@/types/api';
import { cx, vars } from '@/utils/cx';
import { ago, formatHour, formatTime } from '@/utils/format';

type Tab = 'chart' | 'map' | 'advisories';

const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'chart', label: '24-hour chart' },
  { value: 'map', label: 'Rain map' },
  { value: 'advisories', label: 'Advisories' },
];

const PANEL = 'wx-panel';
const hourLabel = (hour: WeatherHour, k: number) => (k === 0 ? 'Now' : formatHour(hour.time));

/** The area picker: a compact select on desktop, a bottom sheet on phones. */
function AreaPicker({ areas, value, mine, wide, onChange }: { areas: Weather[]; value: string; mine: string | null | undefined; wide: boolean; onChange: (slug: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = areas.find((w) => w.area.slug === value);

  if (wide) {
    return (
      <span className="select-chip">
        <select aria-label="Area" value={value} onChange={(e) => onChange(e.target.value)}>
          {areas.map((w) => (
            <option key={w.area.slug} value={w.area.slug}>
              {w.area.name}
              {w.area.slug === mine ? ' (your city)' : ''}
            </option>
          ))}
        </select>
        <Icon name="caret-down" />
      </span>
    );
  }
  return (
    <>
      <button type="button" className="select-chip" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="sr-only">Area: </span>
        {current?.area.name}
        <Icon name="caret-down" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Choose an area">
        <ul className="pick-list">
          {areas.map((w) => (
            <li key={w.area.slug}>
              <button
                type="button"
                className="pick-row"
                aria-pressed={w.area.slug === value}
                onClick={() => {
                  onChange(w.area.slug);
                  setOpen(false);
                }}
              >
                <span className="wxi-sm">
                  <LiveIcon kind={weatherKind(w.current.iconUrl)} still />
                </span>
                <span className="min-w-0">
                  {w.area.name}
                  {w.area.slug === mine && <span className="muted small"> · your city</span>}
                </span>
                <b className="tabular-nums">{Math.round(w.current.tempC)}°</b>
                {w.area.slug === value && <Icon name="check" />}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

/** "Now": the looping icon at 92px, the temperature on reels, one line of advice, and rain, humidity and wind. */
function NowCard({ weather, areas, mine, wide, onPick, now }: { weather: Weather; areas: Weather[]; mine: string | null | undefined; wide: boolean; onPick: (slug: string) => void; now: number }) {
  const t = timing(0);
  const c = weather.current;
  return (
    <article className="card glass e-card span-5 wx-card" style={vars({ '--i': 0 })} aria-labelledby="now-h">
      <div className="card-head">
        <h2 id="now-h" className="card-title">
          Now
        </h2>
        <AreaPicker areas={areas} value={weather.area.slug} mine={mine} wide={wide} onChange={onPick} />
      </div>
      <div className="wx-now">
        <span className="wxi wxi-lg">
          <LiveIcon kind={weatherKind(c.iconUrl)} />
        </span>
        <div>
          <p className="temp temp-lg tabular-nums">
            <RollNumber value={String(Math.round(c.tempC))} delay={t.reel} />°
          </p>
          <p className="wx-label">{c.condition}</p>
          <p className="muted small tabular-nums">Feels like {Math.round(c.feelsLikeC)}°</p>
        </div>
      </div>
      <p className="advice muted small">{rainAdvice(weather.hourly)}</p>
      <ul className="wx-stats">
        <li>
          <b>
            <CountUp value={c.chanceOfRain} suffix="%" delay={t.count} />
          </b>
          <span className="muted">Rain</span>
        </li>
        <li>
          <b>
            <CountUp value={c.humidity} suffix="%" delay={t.count} />
          </b>
          <span className="muted">Humidity</span>
        </li>
        <li>
          <b>
            <CountUp value={Math.round(c.windKph)} suffix=" km/h" delay={t.count} />
          </b>
          <span className="muted">Wind</span>
        </li>
      </ul>
      <p className="muted small">Observed {ago(weather.observedAt, now)}</p>
    </article>
  );
}

/** The hour strip: a still live icon, the temperature and the rain chance, in a row that scrolls sideways. */
function HourStrip({ hours }: { hours: WeatherHour[] }) {
  return (
    <article className="card glass e-card span-7 hours-card" style={vars({ '--i': 1 })} aria-labelledby="hours-h">
      <h2 id="hours-h" className="card-title">
        Next 24 hours
      </h2>
      <ol className="hours" tabIndex={0} aria-labelledby="hours-h">
        {hours.map((h, k) => (
          <li key={h.time} className="hour e-row" style={vars({ '--j': Math.min(k, 8) })}>
            <span className="muted">{hourLabel(h, k)}</span>
            <LiveIcon kind={weatherKind(h.iconUrl)} still label={h.condition} />
            <b className="tabular-nums">{Math.round(h.tempC)}°</b>
            <span className="tabular-nums hour-rain">{h.chanceOfRain}%</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

function HourTable({ hours }: { hours: WeatherHour[] }) {
  return (
    <table className="data-table">
      <caption className="sr-only">Forecast for the next 24 hours</caption>
      <thead>
        <tr>
          <th scope="col">Time</th>
          <th scope="col">Temperature</th>
          <th scope="col">Rain chance</th>
          <th scope="col">Conditions</th>
        </tr>
      </thead>
      <tbody>
        {hours.map((h, k) => (
          <tr key={h.time}>
            <th scope="row">{k === 0 ? 'Now' : formatTime(h.time)}</th>
            <td className="tabular-nums">{Math.round(h.tempC)}°</td>
            <td className="tabular-nums">{h.chanceOfRain}%</td>
            <td className="muted">{h.condition}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RainTable({ areas, hour, selected, onPick }: { areas: Weather[]; hour: number; selected: string; onPick: (slug: string) => void }) {
  return (
    <table className="data-table rain-table">
      <caption className="sr-only">Temperature and rain chance for each area</caption>
      <thead>
        <tr>
          <th scope="col">Area</th>
          <th scope="col">Temp</th>
          <th scope="col">Rain</th>
        </tr>
      </thead>
      <tbody>
        {areas.map((w) => {
          const h = w.hourly[hour] ?? w.hourly[0];
          const chance = h?.chanceOfRain ?? w.current.chanceOfRain;
          const step = rainStep(chance);
          return (
            <tr key={w.area.slug} className={cx(w.area.slug === selected && 'is-on')}>
              <th scope="row">
                <button type="button" className="table-pick" aria-pressed={w.area.slug === selected} onClick={() => onPick(w.area.slug)}>
                  {w.area.name}
                </button>
              </th>
              <td className="tabular-nums">{Math.round(h?.tempC ?? w.current.tempC)}°</td>
              <td className="tabular-nums">
                <span className="rain-chip" style={{ background: step.background, color: step.color }}>
                  {chance}%
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** The rain map with its hour slider. The slider's value is deferred, so dragging stays smooth. */
function RainMap({ areas, selected, wide, onPick }: { areas: Weather[]; selected: string; wide: boolean; onPick: (slug: string) => void }) {
  const [hour, setHour] = useState(0);
  const shownHour = useDeferredValue(hour);
  const time = areas[0]?.hourly[hour]?.time;
  const label = hour === 0 || !time ? 'Now' : formatTime(time);
  // A phone's map can't show all of Metro Cebu at a readable zoom, so it starts at the chosen area.
  const chosen = areas.find((w) => w.area.slug === selected);
  const [center] = useState<[number, number] | undefined>(() => (wide || !chosen ? undefined : [chosen.area.lat, chosen.area.lng]));

  return (
    <div className="rain-layout">
      <div className="rain-main">
        <div className="slider-row">
          <label htmlFor="rain-hour" className="field-legend">
            Forecast hour
          </label>
          <input id="rain-hour" type="range" min={0} max={24} step={1} value={hour} aria-valuetext={label} onChange={(e) => setHour(Number(e.target.value))} />
          <output htmlFor="rain-hour" className="slider-value tabular-nums">
            {label}
          </output>
        </div>
        <div className="map-box rain-map">
          <LazyWeatherMap areas={areas} hour={shownHour} selected={selected} onSelect={onPick} center={center} />
        </div>
        <ul className="rain-legend" aria-label="Rain chance colors">
          {[...RAIN_STEPS].reverse().map((step) => (
            <li key={step.label}>
              <i style={{ background: step.background }} />
              {step.label}
            </li>
          ))}
        </ul>
      </div>
      {wide ? (
        <div className="rain-side">
          <RainTable areas={areas} hour={shownHour} selected={selected} onPick={onPick} />
        </div>
      ) : (
        <TableDisclosure>
          <RainTable areas={areas} hour={shownHour} selected={selected} onPick={onPick} />
        </TableDisclosure>
      )}
    </div>
  );
}

const dayName = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'short' });

/** The next five days' names, starting tomorrow, for the sample outlook. */
const nextDay = (k: number) => dayName.format(new Date(Date.now() + (k + 1) * 86_400_000));

function Advisories({ wide, now }: { wide: boolean; now: number }) {
  const alerts = useAlerts({ type: ['weather', 'flood'] });
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = alerts.data?.find((a) => a.id === selected);
  const pagasa = PAGASA_SAMPLE;

  return (
    <div className="advisories">
      <section aria-labelledby="wx-alerts-h">
        <h3 id="wx-alerts-h" className="sub-title">
          Weather and flood alerts
        </h3>
        {alerts.isPending ? (
          <div className="rows-skel" aria-hidden="true">
            <Skeleton className="skel-row" />
            <Skeleton className="skel-row" />
          </div>
        ) : alerts.isError ? (
          <CardError what="the alerts" onRetry={() => void alerts.refetch()} />
        ) : alerts.data.length === 0 ? (
          <p className="muted small">No weather or flood alerts right now.</p>
        ) : (
          <ul className="rows">
            {alerts.data.slice(0, 5).map((alert, j) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                j={j}
                detail={alert.areaName ?? 'All of Metro Cebu'}
                selected={alert.id === selected}
                expands={wide}
                onSelect={() => setSelected((id) => (id === alert.id ? null : alert.id))}
              />
            ))}
          </ul>
        )}
        {!wide && (
          <Sheet open={Boolean(chosen)} onClose={() => setSelected(null)} title={chosen?.title ?? ''}>
            {chosen && <AlertDetails alert={chosen} now={now} />}
          </Sheet>
        )}
      </section>
      {/* Made-up content, so real users never see it: a fake storm warning could be acted on. */}
      {USE_MOCKS && (
        <section className="pagasa" aria-labelledby="pagasa-h">
          <div className="card-head">
            <h3 id="pagasa-h" className="sub-title">
              PAGASA forecast and advisories
            </h3>
            <Tag tone="quiet">Sample</Tag>
          </div>
          <p className="small">
            <b>Tonight and tomorrow.</b> {pagasa.tonight}
          </p>
          <p className="small">
            <b>{pagasa.advisory.title}.</b> {pagasa.advisory.text}
          </p>
          <ol className="outlook" aria-label="5-day outlook">
            {pagasa.outlook.map((day, k) => (
              <li key={k}>
                <span className="muted small">{nextDay(k)}</span>
                <LiveIcon kind={day.kind} still label={day.label} />
                <b className="tabular-nums small">
                  {day.high}° <span className="muted">{day.low}°</span>
                </b>
                <span className="tabular-nums small hour-rain">{day.rain}%</span>
              </li>
            ))}
          </ol>
          <p className="muted small">Sample content. Official PAGASA forecasts appear here once the backend provides them.</p>
        </section>
      )}
    </div>
  );
}

export default function WeatherPage() {
  const now = useNow();
  const wide = useMediaQuery('(min-width: 720px)');
  const profile = useProfile();
  const weather = useWeatherAll();
  // The area and the tab live in the URL (/weather?area=talisay_city&tab=map); no area means the user's city.
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = tabParam === 'map' || tabParam === 'advisories' ? tabParam : 'chart';
  const [opened, setOpened] = useState<ReadonlySet<Tab>>(() => new Set([tab]));
  if (!opened.has(tab)) setOpened(new Set([...opened, tab])); // A tab's content mounts when it first opens.

  const areas = weather.data ?? [];
  const slug = params.get('area') ?? profile.data?.city ?? 'cebu_city';
  const current = areas.find((w) => w.area.slug === slug) ?? areas[0];

  function update(next: { area?: string; tab?: Tab }) {
    const query = new URLSearchParams(params);
    if (next.area) {
      if (next.area === profile.data?.city) query.delete('area');
      else query.set('area', next.area);
    }
    if (next.tab) {
      if (next.tab === 'chart') query.delete('tab');
      else query.set('tab', next.tab);
    }
    setParams(query, { replace: true, preventScrollReset: true });
  }

  const pickArea = (area: string) => update({ area });

  if (weather.isError) {
    return (
      <Page name="/weather">
        <article className="card glass e-card" style={vars({ '--i': 0 })} aria-labelledby="wx-err">
          <h2 id="wx-err" className="card-title">
            Weather
          </h2>
          <CardError what="the weather" onRetry={() => void weather.refetch()} />
        </article>
        <RightNow i={1} layout="strip" />
      </Page>
    );
  }

  return (
    <Page name="/weather">
      <div className="grid12">
        {!current ? (
          weather.isPending ? (
            <>
              <div className="card glass span-5 wx-skel" aria-hidden="true">
                <Skeleton className="skel-line w-28" />
                <Skeleton className="skel-temp" />
                <Skeleton className="skel-line w-48" />
                <Skeleton className="skel-row" />
              </div>
              <div className="card glass span-7 wx-skel" aria-hidden="true">
                <Skeleton className="skel-line w-36" />
                <Skeleton className="skel-bars" />
              </div>
            </>
          ) : (
            <article className="card glass e-card span-12" style={vars({ '--i': 0 })}>
              <h2 className="card-title">Weather</h2>
              <p className="muted small">The weather isn&apos;t available yet. It updates every hour.</p>
            </article>
          )
        ) : (
          <>
            <NowCard weather={current} areas={areas} mine={profile.data?.city} wide={wide} onPick={pickArea} now={now} />
            <HourStrip hours={current.hourly} />
            <article className="card glass e-card span-12 wx-tabs" style={vars({ '--i': 2 })} aria-label="More about the weather">
              <Segmented kind="tab" label="More about the weather" panelId={PANEL} options={TABS} value={tab} onChange={(value) => update({ tab: value })} className="tabs-fit" />
              <div id={`${PANEL}-chart`} role="tabpanel" aria-labelledby={`${PANEL}-tab-chart`} hidden={tab !== 'chart'} className="tab-panel">
                {opened.has('chart') && (
                  <>
                    <WeatherChart hours={current.hourly} />
                    <TableDisclosure>
                      <HourTable hours={current.hourly} />
                    </TableDisclosure>
                  </>
                )}
              </div>
              <div id={`${PANEL}-map`} role="tabpanel" aria-labelledby={`${PANEL}-tab-map`} hidden={tab !== 'map'} className="tab-panel">
                {opened.has('map') && <RainMap areas={areas} selected={current.area.slug} wide={wide} onPick={pickArea} />}
              </div>
              <div id={`${PANEL}-advisories`} role="tabpanel" aria-labelledby={`${PANEL}-tab-advisories`} hidden={tab !== 'advisories'} className="tab-panel">
                {opened.has('advisories') && <Advisories wide={wide} now={now} />}
              </div>
            </article>
          </>
        )}
        <RightNow i={3} layout="strip" className="span-12" />
      </div>
    </Page>
  );
}
