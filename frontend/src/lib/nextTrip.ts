// The next scheduled trip after today's are over. GET /api/brief/today only has today's leave times, so the usual leave
// time of a later day's trip is worked out here.

import type { RoadRoute, ScheduleEntry, WeatherHour } from '@/types/api';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
/** Manila is UTC+8 all year. */
const MANILA_OFFSET = 8 * HOUR_MS;

const weekday = new Intl.DateTimeFormat('en-PH', { timeZone: 'UTC', weekday: 'long' });

export interface NextTripDay {
  /** That day's trips, earliest arrival first. */
  trips: ScheduleEntry[];
  /** "Tomorrow", "Monday", or "Next Wednesday" for a trip that's only on today's weekday. */
  label: string;
  /** "2026-10-23", in Manila. */
  date: string;
}

/** The first day after today with a trip, within a week. Null when there are no trips at all. */
export function nextTripDay(
  schedule: ScheduleEntry[],
  now: number = Date.now(),
): NextTripDay | null {
  for (let ahead = 1; ahead <= 7; ahead++) {
    const day = new Date(now + MANILA_OFFSET + ahead * DAY_MS);
    const trips = schedule.filter((entry) => entry.daysOfWeek.includes(day.getUTCDay()));
    if (trips.length === 0) continue;
    const name = weekday.format(day);
    return {
      trips: [...trips].sort((a, b) => a.arriveBy.localeCompare(b.arriveBy)),
      label: ahead === 1 ? 'Tomorrow' : ahead === 7 ? `Next ${name}` : name,
      date: day.toISOString().slice(0, 10),
    };
  }
  return null;
}

/**
 * A trip's usual minutes on its road route, by the rule in docs/api-contract.md (`leaveTimes[].baseMinutes`): the longer
 * of the typical car time and the distance at 20 km/h door to door, and at least 10.
 */
export function usualMinutes(road: Pick<RoadRoute, 'distanceKm' | 'travelMinutes'>): number {
  return Math.max(10, Math.ceil(Math.max((road.distanceKm / 20) * 60, road.travelMinutes)));
}

/** "07:30" and 38 min → "06:50", rounded down to 5 minutes like the API. Null when it falls on the day before. */
export function usualLeaveAt(arriveBy: string, minutes: number): string | null {
  const [h, m] = arriveBy.split(':').map(Number);
  const leave = Math.floor((h * 60 + m - minutes) / 5) * 5;
  if (leave < 0) return null;
  return `${String(Math.floor(leave / 60)).padStart(2, '0')}:${String(leave % 60).padStart(2, '0')}`;
}

/** The rain chance for that Manila time, when the 24-hour forecast reaches it. */
export function rainChanceAt(hourly: WeatherHour[], date: string, clock: string): number | null {
  const at = new Date(`${date}T${clock}:00+08:00`).getTime();
  const hour = hourly.find((h) => {
    const start = new Date(h.time).getTime();
    return start <= at && at < start + HOUR_MS;
  });
  return hour ? hour.chanceOfRain : null;
}
