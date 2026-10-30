import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertItem } from '@/components/alerts/AlertItem';
import { LeaveTimeSummary } from '@/components/brief/LeaveTimeSummary';
import { LazyAlertsMap, SEVERITY_HEX, type MapPlace } from '@/components/map/LazyMaps';
import { ButtonLink } from '@/components/ui/Button';
import { ALERT_TYPE, Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Chip, Segmented, SelectField } from '@/components/ui/Controls';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, ErrorState, LoadingLabel, Skeleton, SkeletonLines, UpdatedAgo } from '@/components/ui/States';
import { useNow } from '@/hooks/useBrowser';
import { useAlerts, useBrief } from '@/hooks/useFeeds';
import { useLocations, useSchedule } from '@/hooks/usePlaces';
import { useProfile } from '@/hooks/useProfile';
import type { AlertType, Severity } from '@/types/api';
import { cx } from '@/utils/cx';
import { formatDays } from '@/utils/format';

type View = 'commute' | 'all';

export default function TrafficPage() {
  // The view lives in the URL (?view=all), so it can be shared and survives Back.
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'all' ? 'all' : 'commute';
  const setView = (v: View) => setParams(v === 'all' ? { view: 'all' } : {}, { replace: true });
  return (
    <div>
      <PageHeader
        title="Traffic Map"
        subtitle="Traffic, road closures and floods across Metro Cebu."
        action={
          <Segmented
            label="Map view"
            value={view}
            onChange={setView}
            options={[
              { value: 'commute', label: 'My commute' },
              { value: 'all', label: 'All Cebu' },
            ]}
          />
        }
      />
      {view === 'commute' ? <CommuteView /> : <AllCebuView />}
    </div>
  );
}

function CommuteView() {
  const now = useNow();
  const profile = useProfile();
  const locations = useLocations();
  const schedule = useSchedule();
  const brief = useBrief();
  const relevant = useAlerts({ relevant: true });
  const [tripId, setTripId] = useState<string>('profile');
  const [selected, setSelected] = useState<string | null>(null);

  const places = useMemo(() => locations.data ?? [], [locations.data]);
  const trip = schedule.data?.find((s) => s.id === tripId);
  const originId = trip?.originLocationId ?? profile.data?.commuteOriginLocationId ?? schedule.data?.[0]?.originLocationId;
  const destId = trip?.destinationLocationId ?? profile.data?.commuteDestinationLocationId ?? schedule.data?.[0]?.destinationLocationId;
  const origin = places.find((p) => p.id === originId);
  const dest = places.find((p) => p.id === destId);
  const route: [MapPlace, MapPlace] | null = origin && dest ? [origin, dest] : null;
  const lt = brief.data?.leaveTimes.find((l) => (trip ? l.scheduleEntryId === trip.id : l.origin.id === originId && l.destination.id === destId));
  const near = (relevant.data ?? []).filter((a) => !route || a.nearPlaces?.some((p) => p.id === originId || p.id === destId) || a.lat === null);

  if (locations.isPending || profile.isPending) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <LoadingLabel />
        <Skeleton className="h-[480px] rounded-2xl" />
        <Skeleton className="h-[480px] rounded-2xl" />
      </div>
    );
  }
  if (places.length < 2) {
    return (
      <Card>
        <EmptyState title="Set up your commute" action={<ButtonLink to="/profile#places" icon="plus">Add your places</ButtonLink>}>
          Save at least two places, like Home and School, and we’ll map your trip and the alerts along it.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Card padded={false} className="overflow-hidden lg:self-start">
        <div className="flex flex-wrap items-end justify-between gap-3 p-4 sm:p-5">
          <SelectField label="Trip" value={tripId} onChange={(e) => setTripId(e.target.value)} className="w-full sm:w-72">
            <option value="profile">My usual commute</option>
            {(schedule.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({formatDays(s.daysOfWeek)})
              </option>
            ))}
          </SelectField>
          {route && (
            <p className="flex items-center gap-2 text-sm text-ink">
              <Icon name="route" size={18} className="text-mactan-sea" />
              <strong>{route[0].label}</strong> <Icon name="arrowRight" size={14} label="to" className="mx-0.5 inline align-[-2px]" /> <strong>{route[1].label}</strong>
              <span className="text-muted">· dashed line is an approximate route</span>
            </p>
          )}
        </div>
        <LazyAlertsMap
          label="Map of your commute with nearby alerts"
          places={route ?? places}
          alerts={near}
          route={route}
          selectedId={selected}
          onSelect={setSelected}
          className="h-[420px] border-t border-line lg:h-[520px]"
        />
      </Card>

      <div className="space-y-4">
        <Card aria-labelledby="lt-h">
          <CardHeader id="lt-h" title="Leave time" icon="clock" />
          {brief.isPending ? (
            <Skeleton className="h-28 rounded-xl" />
          ) : lt ? (
            <LeaveTimeSummary lt={lt} now={now} />
          ) : (
            <p className="text-sm text-muted">No trip on this route today. Pick a trip above to see its leave time on days you make it.</p>
          )}
        </Card>
        <Card aria-labelledby="near-h">
          <CardHeader id="near-h" title="Alerts on your way" icon="bell" subtitle={`${near.length} near ${route ? 'these places' : 'your places'}`} />
          {relevant.isPending ? (
            <SkeletonLines lines={5} />
          ) : relevant.isError ? (
            <ErrorState compact onRetry={() => void relevant.refetch()} />
          ) : near.length === 0 ? (
            <EmptyState compact title="Clear on your route">No alerts near these places right now.</EmptyState>
          ) : (
            <ul aria-live="polite" className="-mx-3 max-h-[440px] space-y-1 overflow-y-auto">
              {near.map((a) => (
                <li key={a.id}>
                  <AlertItem alert={a} now={now} compact selected={a.id === selected} onSelect={() => setSelected(a.id)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

const TYPES: AlertType[] = ['traffic', 'closure', 'flood'];
const SEVERITIES: Severity[] = ['high', 'medium', 'low'];

function AllCebuView() {
  const now = useNow();
  const [types, setTypes] = useState<AlertType[]>(TYPES);
  const [sev, setSev] = useState<Severity[]>(SEVERITIES);
  const [selected, setSelected] = useState<string | null>(null);
  const alerts = useAlerts({ type: types.length ? types : TYPES, severity: sev.length === 3 ? undefined : sev });
  const list = alerts.data ?? [];

  const busiest = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of list) if (a.areaName) counts.set(a.areaName, (counts.get(a.areaName) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [list]);
  const max = busiest[0]?.[1] ?? 1;

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? (arr.length > 1 ? arr.filter((x) => x !== v) : arr) : [...arr, v]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Alert types" className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Chip key={t} icon={ALERT_TYPE[t].icon} active={types.includes(t)} onClick={() => setTypes((x) => toggle(x, t))}>
              {ALERT_TYPE[t].label}
            </Chip>
          ))}
        </div>
        <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
        <div role="group" aria-label="Severity" className="flex flex-wrap gap-2">
          {SEVERITIES.map((s) => (
            <Chip key={s} active={sev.includes(s)} onClick={() => setSev((x) => toggle(x, s))}>
              <span className="size-2.5 rounded-full" style={{ background: SEVERITY_HEX[s] }} aria-hidden="true" />
              <span className="capitalize">{s}</span>
            </Chip>
          ))}
        </div>
        {alerts.data && <UpdatedAgo at={alerts.dataUpdatedAt} refreshing={alerts.isFetching} className="ml-auto" />}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card padded={false} className="overflow-hidden lg:self-start">
          <LazyAlertsMap label="Map of traffic, closure and flood alerts in Metro Cebu" alerts={list} selectedId={selected} onSelect={setSelected} className="h-[420px] lg:h-[560px]" />
          <ul className="flex flex-wrap gap-4 border-t border-line px-4 py-3 text-xs text-muted" aria-label="Map legend">
            {SEVERITIES.map((s) => (
              <li key={s} className="inline-flex items-center gap-1.5 capitalize">
                <span className="size-3 rounded-full ring-2 ring-white" style={{ background: SEVERITY_HEX[s] }} />
                {s} severity
              </li>
            ))}
            <li className="ml-auto">Map © OpenStreetMap contributors · Traffic data © TomTom</li>
          </ul>
        </Card>

        <div className="space-y-4">
          <Card aria-labelledby="busy-h">
            <CardHeader id="busy-h" title="Busiest areas" icon="trophy" subtitle="Alerts per area right now" />
            {alerts.isPending ? (
              <SkeletonLines lines={4} />
            ) : busiest.length === 0 ? (
              <p className="text-sm text-muted">No alerts to rank.</p>
            ) : (
              <ol className="space-y-2">
                {busiest.map(([area, n], i) => (
                  <li key={area} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 text-sm">
                    <span className="font-heading font-bold text-muted tabular-nums">{i + 1}</span>
                    <div>
                      <p className="font-semibold">{area}</p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full origin-left rounded-full bg-mactan-sea" style={{ transform: `scaleX(${n / max})` }} />
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums">{n}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card aria-labelledby="list-h">
            <CardHeader id="list-h" title={`${list.length} alerts`} icon="bell" />
            {alerts.isPending ? (
              <SkeletonLines lines={6} />
            ) : alerts.isError ? (
              <ErrorState compact onRetry={() => void alerts.refetch()} />
            ) : list.length === 0 ? (
              <EmptyState compact title="Nothing matches these filters" />
            ) : (
              <ul aria-live="polite" className={cx('-mx-3 max-h-[420px] space-y-1 overflow-y-auto transition-opacity duration-150', alerts.isPlaceholderData && 'opacity-60')}>
                {list.map((a) => (
                  <li key={a.id}>
                    <AlertItem alert={a} now={now} compact selected={a.id === selected} onSelect={() => setSelected(a.id)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
