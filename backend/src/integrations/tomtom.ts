// TomTom Traffic Incident Details API (v5). Free tier: 2,500 non-tile
// requests/day; the traffic job runs every 15 minutes from 05:00 to 22:00
// (68 requests/day). Every incident in Metro Cebu becomes an alert; minor
// slowdowns are low severity, so they sort last.

import type { AlertSeverity, AlertType, NewAlert } from "../types";
import { nearestArea, simplifyLine, type LatLng, type LatLngPair } from "../utils/geo";
import { addMinutes } from "../utils/time";
import { fetchJson, IntegrationError } from "./http";

export const TOMTOM_SOURCE = "tomtom";

// Metro Cebu: Naga City to Liloan, Talisay to Mactan (minLon,minLat,maxLon,maxLat).
export const METRO_CEBU_BBOX = "123.75,10.20,124.02,10.45";

const FIELDS =
  "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers}}}";

// TomTom iconCategory values used here.
const ACCIDENT = 1;
const JAM = 6;
const LANE_CLOSED = 7;
const ROAD_CLOSED = 8;
const ROAD_WORKS = 9;
const FLOODING = 11;

// magnitudeOfDelay: 0 unknown, 1 minor, 2 moderate, 3 major, 4 undefined (closures).
function severityFor(magnitudeOfDelay: number): AlertSeverity {
  if (magnitudeOfDelay >= 3) return "high";
  return magnitudeOfDelay === 2 ? "medium" : "low";
}

// When TomTom gives no end time, assume the incident lasts this long; the
// next run (15 minutes later) extends it while TomTom still reports it.
const DEFAULT_DURATION_MINUTES = 60;

export interface TomtomIncident {
  type: "Feature";
  geometry: { type: "Point"; coordinates: number[] } | { type: "LineString"; coordinates: number[][] };
  properties: {
    id: string;
    iconCategory: number;
    magnitudeOfDelay: number;
    events?: Array<{ description: string; code: number; iconCategory: number }>;
    startTime?: string | null;
    endTime?: string | null;
    from?: string | null;
    to?: string | null;
    length?: number | null; // metres
    delay?: number | null; // seconds
    roadNumbers?: string[];
  };
}

// The point used to place the incident: a Point, or the middle of a line.
function incidentPoint(incident: TomtomIncident): LatLng | null {
  const coordinates =
    incident.geometry.type === "Point"
      ? incident.geometry.coordinates
      : incident.geometry.coordinates[Math.floor(incident.geometry.coordinates.length / 2)];
  if (!coordinates || coordinates.length < 2) return null;
  return { lng: coordinates[0], lat: coordinates[1] };
}

function classify(incident: TomtomIncident): { type: AlertType; severity: AlertSeverity } {
  const { iconCategory, magnitudeOfDelay } = incident.properties;
  switch (iconCategory) {
    case ROAD_CLOSED:
      return { type: "closure", severity: "high" };
    case FLOODING:
      return { type: "flood", severity: "high" };
    case ACCIDENT:
      // An accident blocks lanes even when TomTom reports little delay yet.
      return { type: "traffic", severity: magnitudeOfDelay >= 3 ? "high" : "medium" };
    case LANE_CLOSED:
    case ROAD_WORKS:
      return { type: "closure", severity: severityFor(magnitudeOfDelay) };
    default:
      return { type: "traffic", severity: severityFor(magnitudeOfDelay) };
  }
}

function describe(incident: TomtomIncident): { title: string; summary: string | null } {
  const { events, from, to, length, delay, iconCategory } = incident.properties;
  const event =
    events?.[0]?.description ?? (iconCategory === ROAD_CLOSED ? "Road closed" : iconCategory === JAM ? "Heavy traffic" : "Traffic incident");
  const title = from ? `${event} on ${from}` : event;
  const parts = [
    from && to ? `From ${from} to ${to}` : null,
    length ? `${(length / 1000).toFixed(1)} km` : null,
    delay && delay >= 60 ? `about ${Math.round(delay / 60)} min delay` : null,
  ].filter((part): part is string => Boolean(part));
  return { title, summary: parts.length > 0 ? parts.join(" · ") : null };
}

export function incidentToAlert(incident: TomtomIncident, now: Date): NewAlert | null {
  const point = incidentPoint(incident);
  if (!point) return null;
  const kind = classify(incident);
  const { title, summary } = describe(incident);
  const { startTime, endTime, id, iconCategory, magnitudeOfDelay, delay, length, roadNumbers } = incident.properties;
  const end = endTime ? new Date(endTime) : addMinutes(now, DEFAULT_DURATION_MINUTES);
  return {
    source: TOMTOM_SOURCE,
    type: kind.type,
    severity: kind.severity,
    title,
    summary,
    lat: point.lat,
    lng: point.lng,
    areaName: nearestArea(point).area.name,
    startsAt: startTime ?? now.toISOString(),
    // Still reported now, so keep it active for at least another 15 minutes.
    endsAt: (end.getTime() < now.getTime() ? addMinutes(now, 15) : end).toISOString(),
    sourceUrl: null,
    imageUrl: null,
    fingerprint: `tomtom:${id}`,
    raw: { id, iconCategory, magnitudeOfDelay, delay: delay ?? null, length: length ?? null, roadNumbers: roadNumbers ?? [] },
  };
}

export async function fetchTomtomIncidents(apiKey: string): Promise<TomtomIncident[]> {
  const params = new URLSearchParams({
    key: apiKey,
    bbox: METRO_CEBU_BBOX,
    fields: FIELDS,
    language: "en-GB",
    timeValidityFilter: "present",
  });
  const response = await fetchJson<{ incidents: TomtomIncident[] }>(
    "TomTom",
    `https://api.tomtom.com/traffic/services/5/incidentDetails?${params}`,
  );
  return response.incidents ?? [];
}

// ---------------------------------------------------------------------------
// TomTom Routing API (v1, Calculate Route). Same key and the same free 2,500
// non-tile requests a day as the incidents above. The ingestRoutes job calls it
// only for new or moved places and weekly otherwise, so it uses a few a day.
// ---------------------------------------------------------------------------

export interface TomtomRouteResponse {
  routes?: Array<{
    summary: {
      lengthInMeters: number;
      travelTimeInSeconds: number;
      // With computeTravelTimeFor=all: the time with typical traffic for this hour.
      historicTrafficTravelTimeInSeconds?: number;
    };
    legs: Array<{ points: Array<{ latitude: number; longitude: number }> }>;
    // With sectionType=tollRoad: one TOLL_ROAD section per stretch of toll road.
    sections?: Array<{ sectionType: string; startPointIndex?: number; endPointIndex?: number }>;
  }>;
}

export interface RoadRoute {
  distanceM: number;
  // Typical car travel time, in seconds (historic traffic, not live).
  travelS: number;
  // CCLEX is Metro Cebu's only toll road, so a toll section means the route crosses it.
  usesCclex: boolean;
  line: LatLngPair[];
}

// The first route in TomTom's answer, with its line simplified for storage.
export function parseTomtomRoute(body: TomtomRouteResponse): RoadRoute | null {
  const route = body.routes?.[0];
  if (!route) return null;
  const points = route.legs.flatMap((leg) => leg.points.map((point): LatLngPair => [point.latitude, point.longitude]));
  if (points.length < 2) return null;
  return {
    distanceM: Math.round(route.summary.lengthInMeters),
    travelS: Math.round(route.summary.historicTrafficTravelTimeInSeconds ?? route.summary.travelTimeInSeconds),
    usesCclex: (route.sections ?? []).some((section) => section.sectionType === "TOLL_ROAD"),
    line: simplifyLine(points),
  };
}

// The fastest car route from one point to another. With allowCclex false it
// avoids toll roads, which in Metro Cebu means taking a bridge instead of CCLEX.
export async function fetchTomtomRoute(
  apiKey: string,
  from: LatLng,
  to: LatLng,
  options: { allowCclex: boolean },
): Promise<RoadRoute> {
  const params = new URLSearchParams({
    key: apiKey,
    travelMode: "car",
    routeType: "fastest",
    traffic: "false",
    computeTravelTimeFor: "all",
    sectionType: "tollRoad",
    routeRepresentation: "polyline",
  });
  if (!options.allowCclex) params.set("avoid", "tollRoads");
  const body = await fetchJson<TomtomRouteResponse>(
    "TomTom",
    `https://api.tomtom.com/routing/1/calculateRoute/${from.lat},${from.lng}:${to.lat},${to.lng}/json?${params}`,
  );
  const route = parseTomtomRoute(body);
  if (!route) throw new IntegrationError(TOMTOM_SOURCE, "TomTom returned no route");
  return route;
}
