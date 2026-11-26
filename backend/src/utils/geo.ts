// Geographic distance helpers.

import { CEBU_AREAS, type CebuArea } from "../config/areas";

export interface LatLng {
  lat: number;
  lng: number;
}

// [lat, lng], as route lines are stored and sent.
export type LatLngPair = [number, number];

const EARTH_RADIUS_KM = 6371;
const METRES_PER_DEGREE = 111_320;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// [lat, lng] → flat x/y metres around a latitude; accurate enough over a city.
export function flatProjection(lat: number): (point: LatLngPair) => [number, number] {
  const metresPerDegreeLng = METRES_PER_DEGREE * Math.cos(toRadians(lat));
  return ([pointLat, lng]) => [lng * metresPerDegreeLng, pointLat * METRES_PER_DEGREE];
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

// Distance in metres from point p to the segment a–b, all in flat x/y metres.
export function segmentDistanceM(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// Shortest distance in metres from a point to a line; Infinity for an empty line.
export function distanceToLineM(point: LatLng, line: LatLngPair[]): number {
  const flat = flatProjection(point.lat);
  const p = flat([point.lat, point.lng]);
  const points = line.map(flat);
  if (points.length === 1) return Math.hypot(p[0] - points[0][0], p[1] - points[0][1]);
  let best = Infinity;
  for (let i = 1; i < points.length; i++) best = Math.min(best, segmentDistanceM(p, points[i - 1], points[i]));
  return best;
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// The box around every point of the lines, widened by `marginM` on each side.
// Anything within `marginM` of a line is inside it.
export function boundsAround(lines: LatLngPair[][], marginM: number): Bounds {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const line of lines) {
    for (const [lat, lng] of line) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }
  const marginLat = marginM / METRES_PER_DEGREE;
  // A degree of longitude is shortest at the edge furthest from the equator, so
  // measuring the margin there never makes it too narrow.
  const marginLng = marginM / (METRES_PER_DEGREE * Math.cos(toRadians(Math.max(Math.abs(minLat), Math.abs(maxLat)))));
  return { minLat: minLat - marginLat, maxLat: maxLat + marginLat, minLng: minLng - marginLng, maxLng: maxLng + marginLng };
}

export const round5 = (value: number) => Math.round(value * 1e5) / 1e5;

// A route line with fewer points (Douglas–Peucker): drops points within
// `toleranceM` of the line through their neighbours, then thins evenly to at
// most `maxPoints`. Both ends stay, and coordinates keep 5 decimals (about 1 m).
export function simplifyLine(points: LatLngPair[], toleranceM = 8, maxPoints = 300): LatLngPair[] {
  if (points.length <= 2) return points.map(([lat, lng]) => [round5(lat), round5(lng)]);
  // Over a city, a flat projection around the first point is accurate enough.
  const metresPerDegreeLng = METRES_PER_DEGREE * Math.cos(toRadians(points[0][0]));
  const flat = points.map(([lat, lng]): [number, number] => [lng * metresPerDegreeLng, lat * METRES_PER_DEGREE]);
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number];
    let farthest = -1;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const distance = segmentDistanceM(flat[i], flat[first], flat[last]);
      if (distance > farthest) {
        farthest = distance;
        index = i;
      }
    }
    if (farthest > toleranceM) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  let kept = points.filter((_, i) => keep[i]);
  if (kept.length > maxPoints) {
    const step = (kept.length - 1) / (maxPoints - 1);
    kept = Array.from({ length: maxPoints }, (_, i) => kept[Math.round(i * step)]);
  }
  return kept.map(([lat, lng]) => [round5(lat), round5(lng)]);
}
