// Current traffic for the API: every road for the All Cebu map (GET /api/traffic-flow)
// and the colors along a route (GET /api/routes), from the flow the traffic job saved.

import { FLOW_LEVELS, type FlowLevel, type RouteTraffic, type TrafficFlowLines, type TrafficFlowRow } from "../types";
import { flatProjection, round5, segmentDistanceM, type LatLngPair } from "../utils/geo";
import type { TrafficFlowRepository } from "./trafficFlow.repository";

// The traffic job runs every 15 minutes, 05:00–22:45. Older flow means the job
// stopped or it's night, and old traffic mustn't pass for current.
const STALE_AFTER_MS = 45 * 60_000;
// How long the flow last read is served before the database is asked for a newer
// one. A page asks for the map and a route together, and that is one read.
const RECHECK_MS = 30_000;
// How far the road under a route can be from the route's line (both are simplified).
const MATCH_M = 20;
// A route is colored in stretches of at most this length.
const STEP_M = 50;
const CELL_M = 100;
// A road only colors the route when it runs the same way, within 45°, so the other
// side of a two-way road and the cross streets don't.
const SAME_WAY = Math.cos(Math.PI / 4);

type Flat = [number, number];

interface FlowSegment {
  a: Flat;
  b: Flat;
  level: FlowLevel;
}

export function createTrafficFlowService(repo: Pick<TrafficFlowRepository, "get">, now: () => Date = () => new Date()) {
  // The flow last read, kept for as long as this process lives. Its lines are
  // about 400 KB and only change when the traffic job saves new ones, so the
  // database is asked for them again only when it holds a newer flow.
  let held: TrafficFlowRow | null = null;
  let checkedAt = Number.NEGATIVE_INFINITY;
  let reading: Promise<TrafficFlowRow | null> | null = null;

  // Requests arriving together share one read.
  function saved(): Promise<TrafficFlowRow | null> {
    if (now().getTime() - checkedAt < RECHECK_MS) return Promise.resolve(held);
    reading ??= repo
      .get(held?.fetched_at)
      .then((newer) => {
        // No answer while holding a flow means that flow is still the one saved.
        if (newer) held = newer;
        checkedAt = now().getTime();
        return held;
      })
      .finally(() => {
        reading = null;
      });
    return reading;
  }

  return {
    // The latest flow, or null when there's none recent enough to show. The same
    // object comes back until a newer flow is saved.
    async current(): Promise<TrafficFlowRow | null> {
      const row = await saved();
      return row && now().getTime() - Date.parse(row.fetched_at) <= STALE_AFTER_MS ? row : null;
    },
  };
}

export type TrafficFlowService = ReturnType<typeof createTrafficFlowService>;

// The route from start to end in stretches, each at the traffic level of the road
// under it; null where no road with a speed runs along it.
export function colorRoute(route: LatLngPair[], flow: TrafficFlowLines): RouteTraffic[] {
  if (route.length < 2) return [];
  const flat = flatProjection(route[0][0]);
  const points = route.map(flat);
  const minX = Math.min(...points.map((p) => p[0])) - MATCH_M;
  const maxX = Math.max(...points.map((p) => p[0])) + MATCH_M;
  const minY = Math.min(...points.map((p) => p[1])) - MATCH_M;
  const maxY = Math.max(...points.map((p) => p[1])) + MATCH_M;

  // A grid of the flow segments near the route: each segment sits in every cell
  // it passes within MATCH_M of, so a point's own cell holds all its candidates.
  const cells = new Map<string, FlowSegment[]>();
  for (const level of FLOW_LEVELS) {
    for (const line of flow[level]) {
      for (let i = 1; i < line.length; i++) {
        const a = flat(line[i - 1]);
        const b = flat(line[i]);
        const x0 = Math.min(a[0], b[0]) - MATCH_M;
        const x1 = Math.max(a[0], b[0]) + MATCH_M;
        const y0 = Math.min(a[1], b[1]) - MATCH_M;
        const y1 = Math.max(a[1], b[1]) + MATCH_M;
        if (x1 < minX || x0 > maxX || y1 < minY || y0 > maxY) continue;
        for (let cx = Math.floor(x0 / CELL_M); cx <= Math.floor(x1 / CELL_M); cx++) {
          for (let cy = Math.floor(y0 / CELL_M); cy <= Math.floor(y1 / CELL_M); cy++) {
            const key = `${cx},${cy}`;
            const cell = cells.get(key);
            if (cell) cell.push({ a, b, level });
            else cells.set(key, [{ a, b, level }]);
          }
        }
      }
    }
  }

  // The level of the nearest road running the same way (dx, dy: unit direction).
  const levelAt = (p: Flat, dx: number, dy: number): FlowLevel | null => {
    let best: { distance: number; level: FlowLevel } | null = null;
    for (const segment of cells.get(`${Math.floor(p[0] / CELL_M)},${Math.floor(p[1] / CELL_M)}`) ?? []) {
      const sx = segment.b[0] - segment.a[0];
      const sy = segment.b[1] - segment.a[1];
      const length = Math.hypot(sx, sy);
      if (length === 0 || (sx * dx + sy * dy) / length < SAME_WAY) continue;
      const distance = segmentDistanceM(p, segment.a, segment.b);
      if (distance <= MATCH_M && (!best || distance < best.distance)) best = { distance, level: segment.level };
    }
    return best?.level ?? null;
  };

  const stretches: RouteTraffic[] = [];
  for (let i = 1; i < route.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length === 0) continue;
    const steps = Math.ceil(length / STEP_M);
    const along = (t: number): LatLngPair => [
      round5(route[i - 1][0] + (route[i][0] - route[i - 1][0]) * t),
      round5(route[i - 1][1] + (route[i][1] - route[i - 1][1]) * t),
    ];
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps;
      const level = levelAt([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], (b[0] - a[0]) / length, (b[1] - a[1]) / length);
      const end = along((s + 1) / steps);
      const last = stretches[stretches.length - 1];
      if (last && last.level === level) last.line.push(end);
      else stretches.push({ level, line: [last ? last.line[last.line.length - 1] : along(0), end] });
    }
  }
  return stretches;
}
