import type { UseQueryResult } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CountUp } from '@/components/CountUp';
import { AllClearArt } from '@/components/EmptyArt';
import { Card, CardError, timing } from '@/components/today/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import type { BriefTodayResponse } from '@/types/api';
import { AlertRow } from './AlertRow';

/** Near your places (Today, item 6): the top 3 alerts as compact rows, then the way to the traffic map. */
export function NearPlacesCard({ i, brief }: { i: number; brief: UseQueryResult<BriefTodayResponse> }) {
  const t = timing(i);
  const title = (
    <h2 id="near-h" className="card-title">
      Near your places
    </h2>
  );

  if (brief.isPending) {
    return (
      <Card i={i} span="span-5" id="near-places" className="near">
        <div className="rows-skel" aria-hidden="true">
          <Skeleton className="skel-line w-36" />
          {[0, 1, 2].map((k) => (
            <Skeleton key={k} className="skel-row" />
          ))}
        </div>
      </Card>
    );
  }
  if (brief.isError) {
    return (
      <Card i={i} span="span-5" id="near-places" className="near" labelledBy="near-h">
        {title}
        <CardError what="alerts near your places" onRetry={() => void brief.refetch()} />
      </Card>
    );
  }

  const { alerts } = brief.data;
  const top = alerts.slice(0, 3);

  return (
    <Card i={i} span="span-5" id="near-places" className="near" labelledBy="near-h">
      <div className="card-head">
        {title}
        <span className="muted small tabular-nums">
          {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}
        </span>
      </div>
      {top.length === 0 ? (
        <div className="empty">
          <AllClearArt />
          <p className="empty-text">All clear near your places. Ingat sa dalan!</p>
        </div>
      ) : (
        <ul className="rows">
          {top.map((alert, j) => {
            const near = alert.nearPlaces?.[0];
            return (
              <AlertRow
                key={alert.id}
                alert={alert}
                j={j}
                detail={
                  near ? (
                    <>
                      <CountUp value={near.distanceKm} decimals={1} delay={t.count} /> km from {near.label}
                    </>
                  ) : (
                    (alert.areaName ?? 'All of Metro Cebu')
                  )
                }
              />
            );
          })}
        </ul>
      )}
      <Link to="/traffic" className="btn btn-quiet see-all">
        See all on the traffic map
      </Link>
    </Card>
  );
}
