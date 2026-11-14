import { describe, expect, it, vi } from 'vitest';
import { parseTomtomRoute, type RoadRoute, type TomtomRouteResponse } from '../src/integrations/tomtom.js';
import { createIngestRoutesJob, MAX_ROUTE_REQUESTS_PER_RUN } from '../src/jobs/ingestRoutes.js';
import { computeLeaveTime } from '../src/services/leaveTime.service.js';
import type { LocationsRepository } from '../src/services/locations.repository.js';
import type { PlaceRouteMeta, RoutePair, RoutesJobRepository, RoutesRepository } from '../src/services/routes.repository.js';
import { createRoutesService } from '../src/services/routes.service.js';
import type { AlertRow, AlertType, LocationRow, PlaceRouteRow, TrafficFlowLines } from '../src/types/index.js';
import { simplifyLine, type Bounds, type LatLngPair } from '../src/utils/geo.js';
import { notFound } from '../src/utils/errors.js';
import { TEST_USER } from './helpers/testApp.js';

const now = new Date('2026-11-10T02:20:00Z');
const home = { id: 'home', lat: 10.3157, lng: 123.8854 }; // Cebu City
const office = { id: 'office', lat: 10.2954, lng: 123.9472 }; // Lapu-Lapu, across the channel
const pair: RoutePair = { origin: home, destination: office };

describe('parseTomtomRoute', () => {
  const body = (sections: Array<{ sectionType: string }>): TomtomRouteResponse => ({
    routes: [
      {
        summary: { lengthInMeters: 14230.6, travelTimeInSeconds: 1500, historicTrafficTravelTimeInSeconds: 1620 },
        legs: [
          {
            points: [
              { latitude: 10.315701, longitude: 123.885402 },
              { latitude: 10.31, longitude: 123.9 },
              { latitude: 10.2954, longitude: 123.9472 },
            ],
          },
        ],
        sections,
      },
    ],
  });

  it('reads the distance, the typical-traffic time and the line', () => {
    expect(parseTomtomRoute(body([]))).toEqual({
      distanceM: 14231,
      travelS: 1620,
      usesCclex: false,
      line: [
        [10.3157, 123.8854],
        [10.31, 123.9],
        [10.2954, 123.9472],
      ],
    });
  });

  it('treats a toll section as crossing CCLEX', () => {
    expect(parseTomtomRoute(body([{ sectionType: 'TRAVEL_MODE' }, { sectionType: 'TOLL_ROAD' }]))?.usesCclex).toBe(true);
  });

  it('falls back to the plain travel time and returns null without a route', () => {
    const plain = body([]);
    delete plain.routes?.[0].summary.historicTrafficTravelTimeInSeconds;
    expect(parseTomtomRoute(plain)?.travelS).toBe(1500);
    expect(parseTomtomRoute({ routes: [] })).toBeNull();
    expect(parseTomtomRoute({})).toBeNull();
  });
});

describe('simplifyLine', () => {
  it('drops points on a straight stretch and keeps the corners', () => {
    // Along a street to a corner, then up another street; the middle points sit on the line.
    const line: LatLngPair[] = [
      [10.3, 123.88],
      [10.3, 123.882],
      [10.3, 123.884],
      [10.3, 123.886],
      [10.302, 123.886],
      [10.304, 123.886],
    ];
    expect(simplifyLine(line)).toEqual([
      [10.3, 123.88],
      [10.3, 123.886],
      [10.304, 123.886],
    ]);
  });

  it('never keeps more than the maximum, and keeps both ends', () => {
    // A zigzag where every point matters.
    const line = Array.from({ length: 1000 }, (_, i): LatLngPair => [10.3 + (i % 2) * 0.001, 123.88 + i * 0.0001]);
    const simplified = simplifyLine(line, 1, 300);
    expect(simplified).toHaveLength(300);
    expect(simplified[0]).toEqual([10.3, 123.88]);
    expect(simplified[299]).toEqual(line[999].map((v) => Math.round(v * 1e5) / 1e5));
  });
});

function roadRoute(usesCclex: boolean, distanceM = 14_230): RoadRoute {
  return { distanceM, travelS: 1620, usesCclex, line: [[home.lat, home.lng], [office.lat, office.lng]] };
}

function savedRoute(allowCclex: boolean, overrides: Partial<PlaceRouteMeta> = {}): PlaceRouteMeta {
  return {
    origin_location_id: home.id,
    destination_location_id: office.id,
    allow_cclex: allowCclex,
    origin_lat: home.lat,
    origin_lng: home.lng,
    destination_lat: office.lat,
    destination_lng: office.lng,
    distance_m: 14_230,
    travel_s: 1620,
    uses_cclex: allowCclex,
    fetched_at: '2026-11-09T02:20:00Z',
    ...overrides,
  };
}

function jobRepo(pairs: RoutePair[], saved: PlaceRouteMeta[] = []) {
  const written: PlaceRouteRow[] = [];
  const repo: RoutesJobRepository = {
    listPairs: vi.fn(async () => pairs),
    listSaved: vi.fn(async () => saved),
    save: vi.fn(async (row: PlaceRouteRow) => {
      written.push(row);
    }),
  };
  return { repo, written };
}

describe('ingestRoutes job', () => {
  it('skips without the TomTom key', async () => {
    const { repo } = jobRepo([pair]);
    expect(await createIngestRoutesJob({ routes: repo }).run(now)).toEqual({ status: 'skipped', detail: 'TOMTOM_API_KEY is not set' });
  });

  it('fetches both routes for a new pair whose fastest route crosses CCLEX', async () => {
    const { repo, written } = jobRepo([pair]);
    const fetchRoute = vi.fn(async (_key: string, _from: unknown, _to: unknown, options: { allowCclex: boolean }) =>
      options.allowCclex ? roadRoute(true) : roadRoute(false, 17_900),
    );
    const result = await createIngestRoutesJob({ apiKey: 'key', routes: repo, fetchRoute }).run(now);

    expect(fetchRoute).toHaveBeenCalledTimes(2);
    expect(fetchRoute.mock.calls.map((call) => call[3])).toEqual([{ allowCclex: true }, { allowCclex: false }]);
    expect(written.map((row) => [row.allow_cclex, row.uses_cclex, row.distance_m])).toEqual([
      [true, true, 14_230],
      [false, false, 17_900],
    ]);
    expect(written[0]).toMatchObject({ origin_lat: home.lat, destination_lng: office.lng, fetched_at: now.toISOString() });
    expect(result).toEqual({ status: 'ok', detail: '1 pairs, 2 TomTom requests, 0 failed', saved: 2 });
  });

  it('copies the route instead of asking twice when it avoids CCLEX anyway', async () => {
    const { repo, written } = jobRepo([pair]);
    const fetchRoute = vi.fn(async () => roadRoute(false));
    await createIngestRoutesJob({ apiKey: 'key', routes: repo, fetchRoute }).run(now);

    expect(fetchRoute).toHaveBeenCalledTimes(1);
    expect(written.map((row) => row.allow_cclex)).toEqual([true, false]);
    expect(written[1].line).toEqual(written[0].line);
  });

  it('leaves fresh routes alone, and refetches ones for a moved place or over a week old', async () => {
    const fetchRoute = vi.fn(async () => roadRoute(true));
    const fresh = jobRepo([pair], [savedRoute(true), savedRoute(false)]);
    await createIngestRoutesJob({ apiKey: 'key', routes: fresh.repo, fetchRoute }).run(now);
    expect(fetchRoute).not.toHaveBeenCalled();

    const moved = jobRepo([{ ...pair, origin: { ...home, lat: 10.32 } }], [savedRoute(true), savedRoute(false)]);
    await createIngestRoutesJob({ apiKey: 'key', routes: moved.repo, fetchRoute }).run(now);
    expect(fetchRoute).toHaveBeenCalledTimes(2);

    fetchRoute.mockClear();
    const old = { fetched_at: '2026-11-01T02:20:00Z' };
    const stale = jobRepo([pair], [savedRoute(true, old), savedRoute(false, old)]);
    await createIngestRoutesJob({ apiKey: 'key', routes: stale.repo, fetchRoute }).run(now);
    expect(fetchRoute).toHaveBeenCalledTimes(2);
  });

  it('stops at its request limit and reports what waits for the next run', async () => {
    const pairs = Array.from({ length: 30 }, (_, i): RoutePair => ({ origin: { ...home, id: `o${i}` }, destination: { ...office, id: `d${i}` } }));
    const { repo } = jobRepo(pairs);
    const fetchRoute = vi.fn(async () => roadRoute(true));
    const result = await createIngestRoutesJob({ apiKey: 'key', routes: repo, fetchRoute }).run(now);

    expect(fetchRoute).toHaveBeenCalledTimes(MAX_ROUTE_REQUESTS_PER_RUN);
    expect(result.detail).toBe(`30 pairs, ${MAX_ROUTE_REQUESTS_PER_RUN} TomTom requests, 0 failed, 10 waiting for the next run`);
  });

  it('fails only when nothing could be saved', async () => {
    const { repo } = jobRepo([pair]);
    const result = await createIngestRoutesJob({ apiKey: 'key', routes: repo, fetchRoute: vi.fn(async () => Promise.reject(new Error('HTTP 403'))) }).run(now);
    expect(result).toEqual({ status: 'failed', detail: '1 pairs, 1 TomTom requests, 1 failed', saved: 0 });
  });
});

describe('routes service', () => {
  const place = (p: { id: string; lat: number; lng: number }, label: string): LocationRow => ({
    ...p,
    label,
    kind: 'other',
    address_text: label,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  });
  const row = (allowCclex: boolean, overrides: Partial<PlaceRouteRow> = {}): PlaceRouteRow => ({
    ...savedRoute(allowCclex),
    line: [[home.lat, home.lng], [office.lat, office.lng]],
    ...overrides,
  });

  function service(owned: LocationRow[], rows: PlaceRouteRow[], options: { alerts?: AlertRow[]; flow?: TrafficFlowLines } = {}) {
    const locations = { findOwned: vi.fn(async () => owned) } as unknown as LocationsRepository;
    const routes: RoutesRepository = { between: vi.fn(async () => rows) };
    const alerts = { listActive: vi.fn(async () => options.alerts ?? []) };
    const flow = {
      current: vi.fn(async () => (options.flow ? { area: 'metro_cebu', lines: options.flow, fetched_at: now.toISOString() } : null)),
    };
    return { svc: createRoutesService({ routes, locations, alerts, flow, now: () => now }), routes, alerts };
  }

  const alert = (id: string, lat: number, lng: number, type: AlertType = 'traffic'): AlertRow => ({
    id,
    source: 'tomtom',
    type,
    severity: 'high',
    title: id,
    summary: null,
    lat,
    lng,
    area_name: null,
    starts_at: null,
    ends_at: null,
    source_url: null,
    image_url: null,
    created_at: '2026-11-10T02:00:00Z',
  });

  it('returns both routes for two of the user’s places', async () => {
    const { svc, routes } = service([place(home, 'Home'), place(office, 'Office')], [row(true), row(false)]);
    const result = await svc.between(TEST_USER, home.id, office.id);
    expect(routes.between).toHaveBeenCalledWith(TEST_USER, home.id, office.id);
    expect(result.withCclex?.allow_cclex).toBe(true);
    expect(result.withoutCclex?.allow_cclex).toBe(false);
  });

  it('hides a route saved before a place moved', async () => {
    const { svc } = service([place({ ...home, lat: 10.32 }, 'Home'), place(office, 'Office')], [row(true), row(false)]);
    expect(await svc.between(TEST_USER, home.id, office.id)).toEqual({ from: home.id, to: office.id, withCclex: null, withoutCclex: null });
  });

  it('colors each route by the traffic along it and lists only the traffic alerts on it', async () => {
    // Heavy traffic eastbound on the first kilometre of the Home to Office line.
    const flow: TrafficFlowLines = {
      heavy: [
        [
          [home.lat, home.lng],
          [10.31242, 123.89462],
        ],
      ],
      medium: [],
      free: [],
    };
    const { svc, alerts } = service([place(home, 'Home'), place(office, 'Office')], [row(true), row(false)], {
      flow,
      alerts: [
        alert('on the route', 10.30657, 123.91321),
        alert('300 m off the route', 10.3184, 123.8854),
        alert('power cut on the route', 10.30657, 123.91321, 'power'),
      ],
    });
    const result = await svc.between(TEST_USER, home.id, office.id);
    expect(alerts.listActive).toHaveBeenCalledWith(expect.objectContaining({ types: ['traffic', 'closure', 'flood'] }));
    expect(result.withCclex?.alerts.map((a) => a.id)).toEqual(['on the route']);
    expect(result.withCclex?.traffic.map((stretch) => stretch.level)).toEqual(['heavy', null]);
    expect(result.withoutCclex?.traffic).toEqual(result.withCclex?.traffic);
  });

  it('asks only for alerts inside the box around the two routes', async () => {
    // The route without CCLEX swings north through Mandaue.
    const north: LatLngPair[] = [[home.lat, home.lng], [10.33, 123.92], [office.lat, office.lng]];
    const { svc, alerts } = service([place(home, 'Home'), place(office, 'Office')], [row(true), row(false, { line: north })]);
    await svc.between(TEST_USER, home.id, office.id);

    const [{ within }] = alerts.listActive.mock.calls[0] as unknown as [{ within: Bounds }];
    // About 200 m (0.0018°) wider than the lines on every side, and no more than 300 m.
    expect(within.minLat).toBeLessThan(office.lat - 0.0017);
    expect(within.minLat).toBeGreaterThan(office.lat - 0.0027);
    expect(within.maxLat).toBeGreaterThan(10.33 + 0.0017);
    expect(within.maxLat).toBeLessThan(10.33 + 0.0027);
    expect(within.minLng).toBeLessThan(home.lng - 0.0017);
    expect(within.minLng).toBeGreaterThan(home.lng - 0.0028);
    expect(within.maxLng).toBeGreaterThan(office.lng + 0.0017);
    expect(within.maxLng).toBeLessThan(office.lng + 0.0028);
  });

  it('reads the places and the routes at the same time, and nothing more when there is no route yet', async () => {
    let deliver: (places: LocationRow[]) => void = () => undefined;
    const locations = { findOwned: vi.fn(() => new Promise<LocationRow[]>((resolve) => (deliver = resolve))) } as unknown as LocationsRepository;
    const routes: RoutesRepository = { between: vi.fn(async () => []) };
    const alerts = { listActive: vi.fn(async () => []) };
    const flow = { current: vi.fn(async () => null) };
    const svc = createRoutesService({ routes, locations, alerts, flow, now: () => now });

    const reading = svc.between(TEST_USER, home.id, office.id);
    expect(routes.between).toHaveBeenCalledWith(TEST_USER, home.id, office.id);
    deliver([place(home, 'Home'), place(office, 'Office')]);
    expect(await reading).toEqual({ from: home.id, to: office.id, withCclex: null, withoutCclex: null });
    expect(alerts.listActive).not.toHaveBeenCalled();
    expect(flow.current).not.toHaveBeenCalled();
  });

  it('sends no traffic colors when there is no current flow', async () => {
    const { svc } = service([place(home, 'Home'), place(office, 'Office')], [row(true), row(false)]);
    expect((await svc.between(TEST_USER, home.id, office.id)).withCclex?.traffic).toEqual([]);
  });

  it('is a 404 for a place that isn’t the user’s', async () => {
    const { svc } = service([place(home, 'Home')], []);
    await expect(svc.between(TEST_USER, home.id, office.id)).rejects.toEqual(notFound('Place not found.'));
  });
});

describe('leave time with a road route', () => {
  const trip = { date: '2026-11-10', arriveBy: '08:30', origin: { ...home, label: 'Home' }, destination: { ...office, label: 'Office' }, alerts: [] };

  it('uses the road distance, at the door-to-door speed when that is slower than the car', () => {
    // 14.2 km at 20 km/h door to door = 43 min, slower than TomTom's 27 min by car.
    const result = computeLeaveTime({ ...trip, route: { distanceKm: 14.23, travelMinutes: 27 } });
    expect(result.distanceKm).toBe(14.2);
    expect(result.baseMinutes).toBe(43);
  });

  it('uses the car time when traffic makes it the slower one', () => {
    const result = computeLeaveTime({ ...trip, route: { distanceKm: 5, travelMinutes: 33.2 } });
    expect(result.distanceKm).toBe(5);
    expect(result.baseMinutes).toBe(34);
  });

  it('adds time for traffic on the route, not for traffic near a place but off the route', () => {
    const alert = (title: string, lat: number, lng: number, type: AlertType = 'traffic') => ({
      id: title,
      type,
      severity: 'high' as const,
      title,
      lat,
      lng,
      starts_at: null,
      ends_at: null,
    });
    const line: LatLngPair[] = [
      [home.lat, home.lng],
      [office.lat, office.lng],
    ];
    const result = computeLeaveTime({
      ...trip,
      alerts: [
        // On the route, 3.2 km from Home: further than the 3 km "near a place" radius.
        alert('on the route', 10.30657, 123.91321),
        // 300 m from Home, but off the route.
        alert('off the route', 10.3184, 123.8854),
        // Weather still counts near either end.
        alert('rain', 10.3184, 123.8854, 'weather'),
      ],
      route: { distanceKm: 7, travelMinutes: 20, line },
    });
    expect(result.reasons.map((reason) => [reason.title, reason.nearPlace])).toEqual([
      ['on the route', 'Home'],
      ['rain', 'Home'],
    ]);
    expect(result.delayMinutes).toBe(40);
  });

  it('keeps the straight-line estimate until the route is fetched', () => {
    const result = computeLeaveTime(trip);
    // 7.13 km straight line × 1.3 = 9.3 km.
    expect(result.distanceKm).toBe(9.3);
  });
});
