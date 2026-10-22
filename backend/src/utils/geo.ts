// Geographic distance helpers.

import { CEBU_AREAS, type CebuArea } from "../config/areas";

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Great-circle ("as the crow flies") distance in kilometres.
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function roundKm(km: number): number {
  return Math.round(km * 10) / 10;
}

// The Metro Cebu area whose centre is closest to the point.
export function nearestArea(point: LatLng): { area: CebuArea; distanceKm: number } {
  let best = { area: CEBU_AREAS[0], distanceKm: haversineKm(point, CEBU_AREAS[0]) };
  for (const area of CEBU_AREAS.slice(1)) {
    const distanceKm = haversineKm(point, area);
    if (distanceKm < best.distanceKm) best = { area, distanceKm };
  }
  return best;
}
