// Leave time, v1 (rule-based, README "Core Logic"): estimated travel time from
// straight-line distance, plus a buffer for each travel-affecting alert near
// the origin or destination around the trip. v2 can use TomTom Routing.

import type { AlertSeverity, AlertType } from "../types";
import { haversineKm, roundKm } from "../utils/geo";
import { addMinutes, manilaDateTime } from "../utils/time";
import { SEVERITY_RANK, isActiveBetween, placesNear, type PlacePoint } from "./matching.service";

// Typical door-to-door speed in Metro Cebu traffic.
export const AVERAGE_SPEED_KMH = 20;
// Roads are longer than a straight line.
export const ROAD_FACTOR = 1.3;
export const MIN_TRAVEL_MINUTES = 10;
export const DELAY_MINUTES: Record<AlertSeverity, number> = { low: 5, medium: 10, high: 20 };
export const MAX_DELAY_MINUTES = 45;
// At most this many traffic-type alerts add delay, so a busy area doesn't
// stack dozens of buffers; weather adds at most one.
const MAX_COUNTED_TRAFFIC_ALERTS = 3;

const AFFECTS_TRAVEL: ReadonlySet<AlertType> = new Set(["traffic", "closure", "flood", "weather"]);

export interface LeaveTimeAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  lat: number | null;
  lng: number | null;
  starts_at: string | null;
  ends_at: string | null;
}

export interface LeaveTimeInput {
  date: string; // YYYY-MM-DD, Asia/Manila
  arriveBy: string; // "HH:MM", Asia/Manila
  origin: PlacePoint;
  destination: PlacePoint;
  alerts: LeaveTimeAlert[];
}

export interface LeaveTimeReason {
  alertId: string;
  title: string;
  severity: AlertSeverity;
  minutes: number;
  nearPlace: string;
}

export interface LeaveTimeResult {
  distanceKm: number;
  baseMinutes: number;
  delayMinutes: number;
  arriveAt: Date;
  leaveAt: Date;
  reasons: LeaveTimeReason[];
}

function roundDownToFiveMinutes(date: Date): Date {
  const fiveMinutes = 5 * 60_000;
  return new Date(Math.floor(date.getTime() / fiveMinutes) * fiveMinutes);
}

export function computeLeaveTime(input: LeaveTimeInput): LeaveTimeResult {
  const arriveAt = manilaDateTime(input.date, input.arriveBy);
  const distanceKm = roundKm(haversineKm(input.origin, input.destination) * ROAD_FACTOR);
  const baseMinutes = Math.max(MIN_TRAVEL_MINUTES, Math.ceil((distanceKm / AVERAGE_SPEED_KMH) * 60));
  // Alerts active in the hour before departure through arrival affect the trip.
  const windowStart = addMinutes(arriveAt, -(baseMinutes + 60));

  const candidates: LeaveTimeReason[] = [];
  for (const alert of input.alerts) {
    if (!AFFECTS_TRAVEL.has(alert.type) || !isActiveBetween(alert, windowStart, arriveAt)) continue;
    const near = [...placesNear(alert, [input.origin]), ...placesNear(alert, [input.destination])].sort(
      (a, b) => a.distanceKm - b.distanceKm,
    )[0];
    if (!near) continue;
    candidates.push({
      alertId: alert.id,
      title: alert.title,
      severity: alert.severity,
      minutes: DELAY_MINUTES[alert.severity],
      nearPlace: near.label,
    });
  }

  const bySeverity = (a: LeaveTimeReason, b: LeaveTimeReason) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  const weatherIds = new Set(input.alerts.filter((alert) => alert.type === "weather").map((alert) => alert.id));
  const reasons = [
    ...candidates.filter((reason) => !weatherIds.has(reason.alertId)).sort(bySeverity).slice(0, MAX_COUNTED_TRAFFIC_ALERTS),
    ...candidates.filter((reason) => weatherIds.has(reason.alertId)).sort(bySeverity).slice(0, 1),
  ].sort((a, b) => b.minutes - a.minutes);

  const delayMinutes = Math.min(
    MAX_DELAY_MINUTES,
    reasons.reduce((total, reason) => total + reason.minutes, 0),
  );
  const leaveAt = roundDownToFiveMinutes(addMinutes(arriveAt, -(baseMinutes + delayMinutes)));
  return { distanceKm, baseMinutes, delayMinutes, arriveAt, leaveAt, reasons };
}
