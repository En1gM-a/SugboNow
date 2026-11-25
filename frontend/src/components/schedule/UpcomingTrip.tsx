import { Link } from 'react-router-dom';
import { RollNumber } from '@/components/RollNumber';
import { Card, timing } from '@/components/today/Card';
import { CardCover, CardHint } from '@/components/today/CardLink';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tag } from '@/components/ui/Tag';
import { useRoutes } from '@/hooks/usePlaces';
import { useProfile } from '@/hooks/useProfile';
import { rainChanceAt, usualLeaveAt, usualMinutes, type NextTripDay } from '@/lib/nextTrip';
import type { BriefTodayResponse } from '@/types/api';
import { vars } from '@/utils/cx';
import { formatClock } from '@/utils/format';

/**
 * The next trip on a later day, once today's are over. Its traffic isn't known yet, so it says "Usually leave by", from
 * the trip's road route, or only when to arrive until that route has been found.
 */
export function UpcomingTrip({
  i,
  day,
  brief,
}: {
  i: number;
  day: NextTripDay;
  brief: BriefTodayResponse;
}) {
  const [trip, ...others] = day.trips;
  const profile = useProfile();
  const routes = useRoutes(trip.originLocationId, trip.destinationLocationId);
  const road =
    (profile.data?.allowCclex !== false ? routes.data?.withCclex : routes.data?.withoutCclex) ??
    null;

  // The API's own figure when the same trip also ran today.
  const today = brief.leaveTimes.find((lt) => lt.scheduleEntryId === trip.id);
  const minutes = today?.baseMinutes ?? (road ? usualMinutes(road) : null);
  const distanceKm = today?.distanceKm ?? road?.distanceKm;
  const leaveAt = minutes === null ? null : usualLeaveAt(trip.arriveBy, minutes);
  const [clock, half] = formatClock(leaveAt ?? trip.arriveBy).split(' ');
  const rain = brief.weather
    ? rainChanceAt(brief.weather.hourly, day.date, leaveAt ?? trip.arriveBy)
    : null;

  const facts = [
    distanceKm !== undefined && `${distanceKm} km`,
    minutes !== null && `usually ${minutes} min`,
    rain !== null && `${rain}% chance of rain`,
  ].filter(Boolean);

  return (
    <Card i={i} span="span-7" tone="night" className="trip" labelledBy="trip-h">
      <div className="card-head">
        <h2 id="trip-h" className="card-title">
          Your next trip
        </h2>
        <Tag tone="quiet" className="e-pop">
          {day.label}
        </Tag>
      </div>
      {minutes === null && routes.isLoading ? (
        <Skeleton className="skel-hero" />
      ) : (
        <p className="big tabular-nums">
          <small>{leaveAt ? 'Usually leave by' : 'Arrive by'}</small>
          <RollNumber value={clock} delay={timing(i).reel} /> {half}
        </p>
      )}
      <div className="card-line">
        <p className="route">
          {trip.title} · {trip.origin.label} → {trip.destination.label}
          {leaveAt && ` · arrive ${formatClock(trip.arriveBy)}`}
        </p>
        <CardHint text="See on map" />
      </div>
      {facts.length > 0 && <p className="usual tabular-nums">{facts.join(' · ')}</p>}
      <p className="muted small">
        {brief.leaveTimes.length > 0 ? 'No more trips today.' : 'No trips today.'} Traffic and
        floods are added on the day of the trip.
      </p>
      {others.length > 0 && (
        <div className="later">
          <h3 className="later-h">
            {day.label === 'Tomorrow'
              ? 'Also tomorrow'
              : `Also on ${day.label.replace('Next ', '')}`}
          </h3>
          <ul>
            {others.map((entry, j) => (
              <li key={entry.id} className="later-row e-row" style={vars({ '--j': j })}>
                <span>{entry.title}</span>
                <b className="tabular-nums">arrive {formatClock(entry.arriveBy)}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link to="/profile?section=trips" className="btn btn-quiet trip-more">
        See your weekly trips
      </Link>
      <CardCover
        to={`/traffic?trip=${encodeURIComponent(trip.id)}`}
        label={`See ${trip.title} on the traffic map`}
      />
    </Card>
  );
}
