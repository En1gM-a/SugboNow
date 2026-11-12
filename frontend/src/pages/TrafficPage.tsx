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
import { Switch } from '@/components/ui/Switch';
import { Tag } from '@/components/ui/Tag';
import { useMediaQuery } from '@/hooks/useBrowser';
import { useHeldList } from '@/hooks/useFeedList';
import { useAlerts, useBrief } from '@/hooks/useFeeds';
import { useLocations, useRoutes, useSchedule } from '@/hooks/usePlaces';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { getDisplay } from '@/lib/display';
import type { Alert, AlertType, LeaveTime, RoutesResponse, Severity } from '@/types/api';
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
/** The alert types My commute takes from the road route (GET /api/routes `alerts`) instead of the trip's two places. */
const ROUTE_TYPES: readonly AlertType[] = ['traffic', 'closure', 'flood'];

// The API's order for alerts: severity, then type, then newest.
const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const TYPE_RANK: Record<AlertType, number> = { advisory: 0, flood: 1, closure: 2, weather: 3, traffic: 4, power: 5, water: 6 };
const byImportance = (a: Alert, b: Alert) =>
  SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || TYPE_RANK[a.type] - TYPE_RANK[b.type] || b.createdAt.localeCompare(a.createdAt);

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

/**
 * Selecting from the map scrolls its row into view: inside the phone's sheet, or on the page on desktop.
 *
 * With a mouse there's also a preview: hovering (or focusing) a row rings its dot, and hovering a dot tints its row,
 * without selecting either or scrolling anything. `previewProps` is undefined on touch screens, which have no hover.
 */
function useAlertSelection() {
  const [selected, setSelected] = useState<string | null>(null);
  const [previewed, setPreviewed] = useState<string | null>(null);
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
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
  // Leaving one row (or dot) fires before entering the next, so clearing only our own id never wipes the new preview.
  const previewRow = useCallback((id: string) => (on: boolean) => setPreviewed((current) => (on ? id : current === id ? null : current)), []);
  const previewDot = useCallback((id: string | null) => setPreviewed(id), []);
  return {
    selected,
    select: setSelected,
    toggle,
    rowRef,
    previewed: canHover ? previewed : null,
    previewRow: canHover ? previewRow : undefined,
    previewDot: canHover ? previewDot : undefined,
  };
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

/**
 * The road route under the leave time: its length and car time, and, only when the fastest route crosses CCLEX, a
 * switch to avoid it. The choice is one profile setting for every trip, so the leave time follows it too.
 */
function RouteSummary({ routes, failed, allowCclex, onCclexChange }: { routes: RoutesResponse | undefined; failed: boolean; allowCclex: boolean; onCclexChange: (on: boolean) => void }) {
  const road = routes ? (allowCclex ? routes.withCclex : routes.withoutCclex) : null;
  // Only a route that crosses CCLEX gives a real choice; elsewhere both routes are the same.
  const hasChoice = Boolean(routes?.withCclex?.usesCclex);
  return (
    <div className="route-summary">
      {road ? (
        <p className="route-line small">
          <b>{hasChoice && !allowCclex ? 'Fastest route without CCLEX' : 'Fastest route'}</b>
          <span className="tabular-nums">
            {road.distanceKm} km · about {road.travelMinutes} min by car
          </span>
          {road.usesCclex && <Tag tone="quiet">via CCLEX</Tag>}
        </p>
      ) : (
        <p className="muted small">
          {failed ? "Couldn't load the road route, so traffic on the way can't show yet." : 'Finding the road route. Traffic on the way shows once it’s found.'}
        </p>
      )}
      {hasChoice && (
        <Switch label="Use CCLEX" description="The toll expressway between Cordova and Cebu City" checked={allowCclex} onChange={onCclexChange} />
      )}
    </div>
  );
}

function CommuteView({ wide }: { wide: boolean }) {
  const profile = useProfile();
  const locations = useLocations();
  const schedule = useSchedule();
  const brief = useBrief();
  const relevant = useAlerts({ relevant: true });
  const [params, setParams] = useSearchParams();
  const { selected, toggle, select, rowRef, previewed, previewRow, previewDot } = useAlertSelection();

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
  // The road route, by the profile's CCLEX choice (allowed unless it's turned off). Until the backend has fetched it,
  // the map shows only the two places, with no line.
  const roads = useRoutes(originId, destinationId);
  const updateProfile = useUpdateProfile();
  const allowCclex = profile.data?.allowCclex !== false;
  const road = roads.data ? (allowCclex ? roads.data.withCclex : roads.data.withoutCclex) : null;

  // Traffic, closures and floods come only from the route itself (within 100 m of its line), so nothing off to the side
  // shows and nothing in the middle of a long trip is missed. Other alerts (weather, advisories, power, water) still
  // match the trip's two places.
  const onTheWay = useMemo(() => {
    const others = (relevant.data ?? []).filter(
      (a) => !ROUTE_TYPES.includes(a.type) && (a.lat === null || !route || a.nearPlaces?.some((p) => p.id === originId || p.id === destinationId)),
    );
    return [...(road?.alerts ?? []), ...others].sort(byImportance);
  }, [relevant.data, road, route, originId, destinationId]);
  const { visible, newCount, showNew } = useHeldList(onTheWay, `${originId}-${destinationId}`, relevant.isSuccess && !relevant.isPlaceholderData);

  const detail = (alert: Alert): ReactNode => {
    const reason = leave?.reasons.find((r) => r.alertId === alert.id);
    if (reason) return `Adds about ${reason.minutes} min`;
    if (ROUTE_TYPES.includes(alert.type)) return alert.areaName ? `On your route · ${alert.areaName}` : 'On your route';
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
          label="Map of your commute with the alerts on the way"
          alerts={visible}
          places={route ?? places}
          route={route}
          routeLine={road?.line}
          routeLabel={road ? `${road.travelMinutes} min · ${road.distanceKm} km` : undefined}
          selectedId={selected}
          onSelect={select}
          previewId={previewed}
          onPreview={previewDot}
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
        {route && (
          <RouteSummary
            routes={roads.data}
            failed={roads.isError}
            allowCclex={allowCclex}
            onCclexChange={(on) => updateProfile.mutate({ allowCclex: on })}
          />
        )}
      </Panel>
      <Panel wide={wide} i={3} id="way-h" title="On your way" aside={<span className="muted small tabular-nums">{visible.length} on your way</span>}>
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
              <AlertRow
                key={alert.id}
                ref={rowRef(alert.id)}
                alert={alert}
                j={Math.min(j, 5)}
                detail={detail(alert)}
                selected={alert.id === selected}
                onSelect={() => toggle(alert.id)}
                previewed={alert.id === previewed}
                onPreview={previewRow?.(alert.id)}
              />
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
  const { selected, toggle, select, rowRef, previewed, previewRow, previewDot } = useAlertSelection();
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
      map={
        <LazyAlertsMap
          label="Map of alerts across Metro Cebu, colored by severity"
          alerts={visible}
          selectedId={selected}
          onSelect={select}
          previewId={previewed}
          onPreview={previewDot}
          creditPosition={wide ? 'bottomright' : 'topright'}
        />
      }
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
              <AlertRow
                key={alert.id}
                ref={rowRef(alert.id)}
                alert={alert}
                j={Math.min(j, 5)}
                detail={alert.areaName ?? 'All of Metro Cebu'}
                selected={alert.id === selected}
                onSelect={() => toggle(alert.id)}
                previewed={alert.id === previewed}
                onPreview={previewRow?.(alert.id)}
              />
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
