// Matching: which alerts matter to a user. v1 rule (README "Core Logic"): an
// alert is relevant when it is active in the time window and within a radius
// of one of the user's saved places. Route-corridor matching comes later.

import type { AlertSeverity, AlertType } from "../types";
import { haversineKm, roundKm } from "../utils/geo";

// How far an alert can be from a saved place and still count as near it.
// Weather and area-level news cover a wider area than a traffic incident.
export const MATCH_RADIUS_KM: Record<AlertType, number> = {
  traffic: 3,
  closure: 3,
  flood: 3,
  weather: 10,
  power: 5,
  water: 5,
  advisory: 8,
  news: 5,
};

export const SEVERITY_RANK: Record<AlertSeverity, number> = { low: 1, medium: 2, high: 3 };

// Tiebreaker between alerts of the same severity: class advisories first,
// utilities (power, water) last.
export const TYPE_PRIORITY: Record<AlertType, number> = {
  advisory: 8,
  flood: 7,
  closure: 6,
  weather: 5,
  traffic: 4,
  power: 3,
  water: 2,
  news: 1,
};

export interface PlacePoint {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export interface NearbyPlace {
  id: string;
  label: string;
  distanceKm: number;
}

export interface MatchableAlert {
  type: AlertType;
  lat: number | null;
  lng: number | null;
}

// Saved places within the alert's radius, nearest first.
export function placesNear(alert: MatchableAlert, places: PlacePoint[], radiusKm = MATCH_RADIUS_KM[alert.type]): NearbyPlace[] {
  const { lat, lng } = alert;
  if (lat === null || lng === null) return [];
  return places
    .map((place) => ({ id: place.id, label: place.label, distanceKm: roundKm(haversineKm({ lat, lng }, place)) }))
    .filter((place) => place.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// Alerts near at least one place, each with the places it is near.
export function matchAlertsToPlaces<A extends MatchableAlert>(
  alerts: A[],
  places: PlacePoint[],
): Array<{ alert: A; places: NearbyPlace[] }> {
  return alerts
    .map((alert) => ({ alert, places: placesNear(alert, places) }))
    .filter((match) => match.places.length > 0);
}

// True when the alert's time range overlaps [start, end]. Missing bounds are open.
export function isActiveBetween(alert: { starts_at: string | null; ends_at: string | null }, start: Date, end: Date): boolean {
  const startsAt = alert.starts_at ? Date.parse(alert.starts_at) : Number.NEGATIVE_INFINITY;
  const endsAt = alert.ends_at ? Date.parse(alert.ends_at) : Number.POSITIVE_INFINITY;
  return startsAt <= end.getTime() && endsAt >= start.getTime();
}

interface RankableAlert {
  type: AlertType;
  severity: AlertSeverity;
  starts_at: string | null;
}

// Most severe first, then by type priority, then most recent.
export function compareAlerts(a: RankableAlert, b: RankableAlert): number {
  const bySeverity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  if (bySeverity !== 0) return bySeverity;
  const byType = TYPE_PRIORITY[b.type] - TYPE_PRIORITY[a.type];
  if (byType !== 0) return byType;
  return (b.starts_at ? Date.parse(b.starts_at) : 0) - (a.starts_at ? Date.parse(a.starts_at) : 0);
}
