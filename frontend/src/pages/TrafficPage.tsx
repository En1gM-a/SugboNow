// Traffic (/traffic, handoff <pages> page 8): "What's in my way?" My commute shows a trip's route, its leave time and the
// alerts on the way; All Cebu shows every alert with filters and the busiest areas. On phones the map fills the screen
// and a sheet peeks over it; on desktop the list sits in the side column. Map and list stay in sync both ways.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ALERT_TYPE, AlertRow } from '@/components/alerts/AlertRow';
import { JeepneyArt } from '@/components/EmptyArt';
import { Expander } from '@/components/Expander';
import { Icon } from '@/components/icons/Icon';
import { Page } from '@/components/layout/Page';
import { LazyAlertsMap, type MapPlace } from '@/components/map/LazyMaps';
import { SEVERITY_COLOR } from '@/components/map/mapTokens';
import { RightNow } from '@/components/RightNow';
import { RollNumber } from '@/components/RollNumber';
import { CardError, timing } from '@/components/today/Card';
import { PeekSheet } from '@/components/traffic/PeekSheet';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tag } from '@/components/ui/Tag';
import { useMediaQuery } from '@/hooks/useBrowser';
import { useHeldList } from '@/hooks/useFeedList';
import { useAlerts, useBrief } from '@/hooks/useFeeds';
import { useLocations, useSchedule } from '@/hooks/usePlaces';
import { useProfile } from '@/hooks/useProfile';
import { getDisplay } from '@/lib/display';
import type { Alert, AlertType, LeaveTime, Severity } from '@/types/api';
import { cx, vars } from '@/utils/cx';
import { formatClock, formatDays } from '@/utils/format';

type View = 'commute' | 'all';

const VIEWS: ReadonlyArray<{ value: View; label: string }> = [
  { value: 'commute', label: 'My commute' },
  { value: 'all', label: 'All Cebu' },
];

const TYPES: readonly AlertType[] = ['traffic', 'closure', 'flood', 'weather', 'advisory', 'power', 'water'];
const TYPE_CHIP: Partial<Record<AlertType, string>> = { power: 'Power', water: 'Water' };
const SEVERITIES: readonly Severity[] = ['high', 'medium', 'low'];
const SEVERITY_LABEL: Record<Severity, string> = { high: 'High', medium: 'Medium', low: 'Low' };

/** How much of a phone's map the peeking sheet covers: 35% of the screen, less the tab bar's strip below the map. */
const sheetInset = () => Math.max(0, Math.round(window.innerHeight * 0.35 - 94));

function Legend() {
  return (
    <ul className="map-legend" aria-label="Marker colors">
      {SEVERITIES.map((severity) => (
        <li key={severity}>
          <i style={{ background: SEVERITY_COLOR[severity] }} />
          {SEVERITY_LABEL[severity]}
        </li>
      ))}
      <li className="map-legend-note">The dashed line is an approximate route.</li>
    </ul>
  );
}

/** One block of the list: a glass card in the side column, a plain section in the phone's sheet. */
function Panel({ wide, i, id, title, aside, className, children }: { wide: boolean; i: number; id: string; title: ReactNode; aside?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cx(wide ? 'card glass e-card' : 'sheet-section', className)} style={wide ? vars({ '--i': i }) : undefined} aria-labelledby={id}>
      <div className="card-head">
        <h2 id={id} className="card-title">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Lays out the map and the list. Below 720px the list moves into a sheet that peeks over the map. */
function MapLayout({ wide, map, label, showLegend = false, children }: { wide: boolean; map: ReactNode; label: string; showLegend?: boolean; children: ReactNode }) {
  const mapCard = (
    <section className={cx('card glass e-card map-card', wide && 'span-8')} style={vars({ '--i': 1 })} aria-label="Map">
      <div className="map-box map-main">{map}</div>
      {wide && showLegend && <Legend />}
    </section>
  );
  if (!wide) {
    return (
      <>
        {mapCard}
        <PeekSheet label={label}>{children}</PeekSheet>
      </>
    );
  }
  return (
    <div className="grid12">
      {mapCard}
      <div className="side traffic-side span-4">{children}</div>
    </div>
  );
}

/** Selecting from the map scrolls its row into view: inside the phone's sheet, or on the page on desktop. */
function useAlertSelection() {
  const [selected, setSelected] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    const row = selected ? rows.current.get(selected) : null;
    if (!row) return;
    const behavior = getDisplay().still ? 'auto' : 'smooth';
    const box = row.closest('[data-scroll]');
    if (box) box.scrollTo({ top: row.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 8, behavior });
    else row.scrollIntoView({ block: 'nearest', behavior });
  }, [selected]);

  const rowRef = useCallback(
    (id: string) => (el: HTMLLIElement | null) => {
      if (el) rows.current.set(id, el);
      else rows.current.delete(id);
    },
    [],
  );
  const toggle = useCallback((id: string) => setSelected((current) => (current === id ? null : id)), []);
  return { selected, select: setSelected, toggle, rowRef };
}

function RowsSkeleton() {
  return (
    <div className="rows-skel" aria-hidden="true">
      <Skeleton className="skel-row" />
      <Skeleton className="skel-row" />
      <Skeleton className="skel-row" />
    </div>
  );
}

function NewPill({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <button type="button" className="new-pill list-pill" onClick={onClick}>
      <Icon name="arrow-up" />
      {count === 1 ? '1 new alert' : `${count} new alerts`}
    </button>
  );
}

function LeaveSummary({ leave, i }: { leave: LeaveTime; i: number }) {
  const [open, setOpen] = useState(false);
  const [clock, half] = formatClock(leave.leaveAt).split(' ');
  return (
    <>
      <p className="big big-side tabular-nums">
        <small>Leave by</small>
        <RollNumber value={clock} delay={timing(i).reel} /> {half}
      </p>
      <p className="route">
        {leave.origin.label} → {leave.destination.label} · arrive {formatClock(leave.arriveBy)}
      </p>
      {leave.delayMinutes > 0 ? (
        <>
          <button type="button" className="tag tag-mango delay-chip" aria-expanded={open} aria-controls="leave-reasons" onClick={() => setOpen((o) => !o)}>
            <span>+{leave.delayMinutes} min</span>
            <Icon name="caret-right" className={cx('chev', open && 'is-open')} />
          </button>
          <Expander open={open} id="leave-reasons">
            <ul className="reasons">
              {leave.reasons.map((reason) => (
                <li key={reason.alertId}>
                  <b className="tabular-nums">+{reason.minutes} min</b> {reason.title}, near {reason.nearPlace}
                </li>
              ))}
            </ul>
          </Expander>
        </>
      ) : (
        <Tag tone="quiet">Usual time</Tag>
      )}
    </>
  );
}

function CommuteView({ wide }: { wide: boolean }) {
  const profile = useProfile();
  const locations = useLocations();
  const schedule = useSchedule();
  const brief = useBrief();
  const relevant = useAlerts({ relevant: true });
  const [params, setParams] = useSearchParams();
  const { selected, toggle, select, rowRef } = useAlertSelection();

  const tripId = params.get('trip');
  const trip = schedule.data?.find((s) => s.id === tripId);
  const firstTrip = schedule.data?.[0];
  const originId = trip?.originLocationId ?? profile.data?.commuteOriginLocationId ?? firstTrip?.originLocationId;
  const destinationId = trip?.destinationLocationId ?? profile.data?.commuteDestinationLocationId ?? firstTrip?.destinationLocationId;

  const places = useMemo(() => locations.data ?? [], [locations.data]);
  const origin = places.find((p) => p.id === originId);
  const destination = places.find((p) => p.id === destinationId);
  const route: [MapPlace, MapPlace] | null = origin && destination ? [origin, destination] : null;
  const leave = brief.data?.leaveTimes.find((lt) => (trip ? lt.scheduleEntryId === trip.id : lt.origin.id === originId && lt.destination.id === destinationId));

  const onTheWay = useMemo(
    () => (relevant.data ?? []).filter((a) => a.lat === null || !route || a.nearPlaces?.some((p) => p.id === originId || p.id === destinationId)),
    [relevant.data, route, originId, destinationId],
  );
  const { visible, newCount, showNew } = useHeldList(onTheWay, `${originId}-${destinationId}`, relevant.isSuccess && !relevant.isPlaceholderData);

  const detail = (alert: Alert): ReactNode => {
    const reason = leave?.reasons.find((r) => r.alertId === alert.id);
    if (reason) return `Adds about ${reason.minutes} min`;
    const near = alert.nearPlaces?.[0];
    return near ? `${near.distanceKm} km from ${near.label}` : (alert.areaName ?? 'All of Metro Cebu');
  };

  if (locations.isPending || profile.isPending) {
    return (
      <MapLayout wide={wide} label="Your commute" map={<Skeleton className="map-skel" />}>
        <Panel wide={wide} i={2} id="commute-h" title="Your commute">
          <RowsSkeleton />
        </Panel>
      </MapLayout>
    );
  }
  if (locations.isError) {
    return (
      <section className="card glass e-card" style={vars({ '--i': 1 })} aria-labelledby="commute-h">
        <h2 id="commute-h" className="card-title">
          Your commute
        </h2>
        <CardError what="your saved places" onRetry={() => void locations.refetch()} />
      </section>
    );
  }
  if (places.length < 2) {
    return (
      <section className="card glass e-card empty" style={vars({ '--i': 1 })} aria-labelledby="commute-h">
        <JeepneyArt />
        <h2 id="commute-h" className="empty-text">
          Save two places to see your commute
        </h2>
        <p className="muted small">Then we&apos;ll map your trip and the alerts along it.</p>
        <Link to="/profile?section=places" className="btn btn-secondary">
          Add your places
        </Link>
      </section>
    );
  }

  return (
    <MapLayout
      wide={wide}
      label="Your commute"
      showLegend
      map={
        <LazyAlertsMap
          label="Map of your commute with the alerts near it"
          alerts={visible}
          places={route ?? places}
          route={route}
          selectedId={selected}
          onSelect={select}
          bottomInset={wide ? 0 : sheetInset()}
          creditPosition={wide ? 'bottomright' : 'topright'}
        />
      }
    >
      <Panel
        wide={wide}
        i={2}
        id="commute-h"
        title="Your commute"
        className="leave-panel"
        aside={
          schedule.data && schedule.data.length > 0 ? (
            <span className="select-chip">
              <select
                aria-label="Trip"
                value={trip?.id ?? 'usual'}
                onChange={(e) => {
                  select(null);
                  const next = new URLSearchParams(params);
                  if (e.target.value === 'usual') next.delete('trip');
                  else next.set('trip', e.target.value);
                  setParams(next, { replace: true, preventScrollReset: true });
                }}
              >
                <option value="usual">My usual commute</option>
                {schedule.data.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title} ({formatDays(entry.daysOfWeek)})
                  </option>
                ))}
              </select>
              <Icon name="caret-down" />
            </span>
          ) : undefined
        }
      >
        {brief.isPending ? (
          <Skeleton className="skel-row" />
        ) : leave ? (
          <LeaveSummary leave={leave} i={2} />
        ) : (
          <p className="muted small">No trip on this route today. Pick another trip to see its leave time.</p>
        )}
      </Panel>
      <Panel wide={wide} i={3} id="way-h" title="On your way" aside={<span className="muted small tabular-nums">{visible.length} near these places</span>}>
        <NewPill count={newCount} onClick={showNew} />
        {relevant.isPending ? (
          <RowsSkeleton />
        ) : relevant.isError ? (
          <CardError what="the alerts" onRetry={() => void relevant.refetch()} />
        ) : visible.length === 0 ? (
          <p className="muted small">Clear on your way. Ingat sa dalan!</p>
        ) : (
          <ul className="rows">
            {visible.map((alert, j) => (
              <AlertRow key={alert.id} ref={rowRef(alert.id)} alert={alert} j={Math.min(j, 5)} detail={detail(alert)} selected={alert.id === selected} onSelect={() => toggle(alert.id)} />
            ))}
          </ul>
        )}
      </Panel>
      {!wide && <Legend />}
      <RightNow i={4} flat={!wide} className={wide ? undefined : 'sheet-section'} />
    </MapLayout>
  );
}

function FilterChips({ types, severities, onToggleType, onToggleSeverity }: { types: AlertType[]; severities: Severity[]; onToggleType: (type: AlertType) => void; onToggleSeverity: (severity: Severity) => void }) {
  return (
    <div className="filter-groups">
      <div role="group" aria-label="Alert type" className="chip-wrap">
        {TYPES.map((type) => (
          <button key={type} type="button" className="chip" aria-pressed={types.includes(type)} onClick={() => onToggleType(type)}>
            {TYPE_CHIP[type] ?? ALERT_TYPE[type]}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Severity" className="chip-wrap">
        {SEVERITIES.map((severity) => (
          <button key={severity} type="button" className="chip" aria-pressed={severities.includes(severity)} onClick={() => onToggleSeverity(severity)}>
            <i className="sev-dot" style={{ background: SEVERITY_COLOR[severity] }} aria-hidden="true" />
            {SEVERITY_LABEL[severity]}
          </button>
        ))}
      </div>
    </div>
  );
}

function BusiestAreas({ wide, i, alerts }: { wide: boolean; i: number; alerts: Alert[] }) {
  const [open, setOpen] = useState(wide);
  const busiest = useMemo(() => {
    const counts = new Map<string, number>();
    for (const alert of alerts) if (alert.areaName) counts.set(alert.areaName, (counts.get(alert.areaName) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [alerts]);
  const most = busiest[0]?.[1] ?? 1;

  return (
    <section className={cx(wide ? 'card glass e-card' : 'sheet-section', 'busy')} style={wide ? vars({ '--i': i }) : undefined} aria-labelledby="busy-h">
      <h2 id="busy-h" className="card-title">
        <button type="button" className="busy-toggle" aria-expanded={open} aria-controls="busy-list" onClick={() => setOpen((o) => !o)}>
          Busiest areas
          <Icon name="caret-right" className={cx('chev', open && 'is-open')} />
        </button>
      </h2>
      <Expander open={open} id="busy-list">
        {busiest.length === 0 ? (
          <p className="muted small">No alerts to rank.</p>
        ) : (
          <ul className="busy-list">
            {busiest.map(([area, count]) => (
              <li key={area}>
                <span>{area}</span>
                <b className="tabular-nums">
                  {count}
                  <span className="sr-only"> {count === 1 ? 'alert' : 'alerts'}</span>
                </b>
                <span className="busy-bar" aria-hidden="true">
                  <i style={{ transform: `scaleX(${count / most})` }} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Expander>
    </section>
  );
}

function AllCebuView({ wide }: { wide: boolean }) {
  // Filters live in the URL (/traffic?view=all&type=flood,closure&severity=high).
  const [params, setParams] = useSearchParams();
  const types = (params.get('type')?.split(',') ?? []).filter((t): t is AlertType => (TYPES as readonly string[]).includes(t));
  const severities = (params.get('severity')?.split(',') ?? []).filter((s): s is Severity => (SEVERITIES as readonly string[]).includes(s));
  const alerts = useAlerts({ type: types.length ? types : undefined, severity: severities.length ? severities : undefined, limit: 200 });
  const { selected, toggle, select, rowRef } = useAlertSelection();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { visible, newCount, showNew } = useHeldList(alerts.data, `${params.get('type') ?? ''}|${params.get('severity') ?? ''}`, alerts.isSuccess && !alerts.isPlaceholderData);
  const filterCount = types.length + severities.length;

  function setFilter(key: 'type' | 'severity', values: string[]) {
    const next = new URLSearchParams(params);
    if (values.length) next.set(key, values.join(','));
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
    select(null);
  }
  const toggleIn = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const clearFilters = () => {
    const next = new URLSearchParams(params);
    next.delete('type');
    next.delete('severity');
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const chips = <FilterChips types={types} severities={severities} onToggleType={(type) => setFilter('type', toggleIn(types, type))} onToggleSeverity={(severity) => setFilter('severity', toggleIn(severities, severity))} />;

  return (
    <MapLayout
      wide={wide}
      label="Alerts across Cebu"
      showLegend
      map={<LazyAlertsMap label="Map of alerts across Metro Cebu, colored by severity" alerts={visible} selectedId={selected} onSelect={select} creditPosition={wide ? 'bottomright' : 'topright'} />}
    >
      {wide && (
        <Panel wide={wide} i={2} id="filters-h" title="Filters" aside={filterCount > 0 ? <button type="button" className="btn btn-quiet" onClick={clearFilters}>Clear</button> : undefined}>
          {chips}
        </Panel>
      )}
      <Panel
        wide={wide}
        i={3}
        id="list-h"
        title={alerts.data ? `${visible.length} ${visible.length === 1 ? 'alert' : 'alerts'}` : 'Alerts'}
        aside={
          wide ? undefined : (
            <button type="button" className="chip" aria-haspopup="dialog" onClick={() => setFiltersOpen(true)}>
              <Icon name="funnel-simple" />
              Filters{filterCount > 0 && ` (${filterCount})`}
            </button>
          )
        }
      >
        <NewPill count={newCount} onClick={showNew} />
        {alerts.isPending ? (
          <RowsSkeleton />
        ) : alerts.isError ? (
          <CardError what="the alerts" onRetry={() => void alerts.refetch()} />
        ) : visible.length === 0 ? (
          <div className="empty">
            <p className="empty-text">Nothing matches these filters.</p>
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <ul className={cx('rows', alerts.isPlaceholderData && 'is-stale')}>
            {visible.map((alert, j) => (
              <AlertRow key={alert.id} ref={rowRef(alert.id)} alert={alert} j={Math.min(j, 5)} detail={alert.areaName ?? 'All of Metro Cebu'} selected={alert.id === selected} onSelect={() => toggle(alert.id)} />
            ))}
          </ul>
        )}
      </Panel>
      {!wide && <Legend />}
      <BusiestAreas wide={wide} i={4} alerts={visible} />
      <RightNow i={5} flat={!wide} className={wide ? undefined : 'sheet-section'} />
      {!wide && (
        <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter alerts">
          {chips}
          <div className="form-actions sheet-actions">
            {filterCount > 0 && (
              <Button variant="secondary" onClick={clearFilters}>
                Clear
              </Button>
            )}
            <Button className="ml-auto" onClick={() => setFiltersOpen(false)}>
              Show {visible.length} {visible.length === 1 ? 'alert' : 'alerts'}
            </Button>
          </div>
        </Sheet>
      )}
    </MapLayout>
  );
}

export default function TrafficPage() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'all' ? 'all' : 'commute';
  const wide = useMediaQuery('(min-width: 720px)');

  return (
    <Page name="/traffic" className="traffic">
      <div className="card glass e-card traffic-bar" style={vars({ '--i': 0 })}>
        <Segmented label="Map view" options={VIEWS} value={view} onChange={(next) => setParams(next === 'all' ? { view: 'all' } : {}, { replace: true, preventScrollReset: true })} />
      </div>
      {view === 'commute' ? <CommuteView wide={wide} /> : <AllCebuView wide={wide} />}
    </Page>
  );
}
