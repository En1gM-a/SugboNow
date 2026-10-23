import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppServices } from '../src/app.js';
import type { AlertsService } from '../src/services/alerts.service.js';
import type { BriefService } from '../src/services/brief.service.js';
import type { LguSourcesRepository } from '../src/services/lguSources.repository.js';
import type { LocationsService } from '../src/services/locations.service.js';
import type { ProfileService } from '../src/services/profile.service.js';
import type { ScheduleService } from '../src/services/schedule.service.js';
import type { WeatherService } from '../src/services/weather.service.js';
import type { AlertRow, LocationRow, ProfileRow, ScheduleRow, WeatherSnapshotRow } from '../src/types/index.js';
import { conflict, notFound } from '../src/utils/errors.js';
import { TEST_USER, authHeaders, jsonHeaders, startTestApp, type TestServer } from './helpers/testApp.js';

const HOME = '11111111-1111-4111-8111-111111111111';
const SCHOOL = '22222222-2222-4222-8222-222222222222';
const now = new Date('2026-10-22T22:00:00Z');

const profile: ProfileRow = {
  id: TEST_USER.id,
  display_name: 'thea',
  first_name: 'Thea',
  city: 'cebu_city',
  address_text: null,
  subscribed_mayor: 'cebu_city',
  commute_origin_location_id: HOME,
  commute_destination_location_id: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-02T00:00:00Z',
};

const home: LocationRow = {
  id: HOME,
  label: 'Home',
  kind: 'home',
  address_text: 'Guadalupe, Cebu City',
  lat: 10.3157,
  lng: 123.8854,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const entry: ScheduleRow = {
  id: '44444444-4444-4444-8444-444444444444',
  title: 'Classes',
  days_of_week: [1, 3, 5],
  arrive_by: '07:30:00',
  origin_location_id: HOME,
  destination_location_id: SCHOOL,
  origin: { id: HOME, label: 'Home', kind: 'home' },
  destination: { id: SCHOOL, label: 'School', kind: 'school' },
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const upcoming: AlertRow = {
  id: '55555555-5555-4555-8555-555555555555',
  source: 'facebook',
  type: 'advisory',
  severity: 'high',
  title: 'Mandaue City: WALAY KLASE | OCT 23',
  summary: null,
  lat: 10.3236,
  lng: 123.9223,
  area_name: 'Mandaue City',
  starts_at: '2026-10-22T23:00:00Z',
  ends_at: '2026-10-23T10:00:00Z',
  source_url: 'https://www.facebook.com/JonkieOuanoPH/posts/1',
  image_url: null,
  created_at: '2026-10-22T12:00:00Z',
};

const weather: WeatherSnapshotRow = {
  area_slug: 'cebu_city',
  area_name: 'Cebu City',
  lat: 10.3157,
  lng: 123.8854,
  observed_at: '2026-10-22T21:45:00Z',
  current_conditions: { tempC: 27, feelsLikeC: 30, condition: 'Cloudy', iconUrl: null, isDay: false, humidity: 80, windKph: 6, precipMm: 0, chanceOfRain: 20 },
  hourly_forecast: [],
  fetched_at: '2026-10-22T21:50:00Z',
};

let server: TestServer | undefined;

async function start(services: Partial<AppServices>) {
  server = await startTestApp(services, () => now);
  return server.base;
}

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe('auth and errors', () => {
  it('serves health without a token and requires one everywhere else', async () => {
    const base = await start({});
    expect((await fetch(`${base}/api/health`)).status).toBe(200);
    for (const path of ['/api/profile', '/api/areas', '/api/locations', '/api/schedule', '/api/alerts', '/api/news', '/api/weather', '/api/brief/today']) {
      expect((await fetch(`${base}${path}`)).status, path).toBe(401);
    }
  });

  it('rejects malformed JSON with 400', async () => {
    const base = await start({ locations: {} as LocationsService });
    const response = await fetch(`${base}/api/locations`, { method: 'POST', headers: jsonHeaders, body: '{"label":' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: 'invalid_request', message: 'The request body must be valid JSON.' } });
  });

  it('hides unexpected errors behind a 500', async () => {
    const base = await start({ profile: { get: vi.fn(async () => { throw new Error('secret detail'); }) } as unknown as ProfileService });
    const response = await fetch(`${base}/api/profile`, { headers: authHeaders });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: 'internal_error', message: 'Something went wrong.' } });
    expect(server?.logger.error).toHaveBeenCalled();
  });

  it('answers unknown routes with 404', async () => {
    const base = await start({});
    expect((await fetch(`${base}/api/nope`, { headers: authHeaders })).status).toBe(404);
  });
});

describe('/api/profile', () => {
  it('returns the profile in camelCase', async () => {
    const base = await start({ profile: { get: vi.fn(async () => profile) } as unknown as ProfileService });
    expect(await (await fetch(`${base}/api/profile`, { headers: authHeaders })).json()).toEqual({
      id: TEST_USER.id,
      displayName: 'thea',
      firstName: 'Thea',
      city: 'cebu_city',
      addressText: null,
      subscribedMayor: 'cebu_city',
      commuteOriginLocationId: HOME,
      commuteDestinationLocationId: null,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-02T00:00:00Z',
    });
  });

  it('validates PATCH bodies and passes the change to the service', async () => {
    const update = vi.fn(async () => profile);
    const base = await start({ profile: { update } as unknown as ProfileService });

    const unknownField = await fetch(`${base}/api/profile`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ nickname: 'x' }) });
    expect(unknownField.status).toBe(400);
    const empty = await fetch(`${base}/api/profile`, { method: 'PATCH', headers: jsonHeaders, body: '{}' });
    expect(empty.status).toBe(400);

    const ok = await fetch(`${base}/api/profile`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ subscribedMayor: 'mandaue_city', firstName: '  Thea ' }) });
    expect(ok.status).toBe(200);
    expect(update).toHaveBeenCalledWith(TEST_USER, { subscribedMayor: 'mandaue_city', firstName: 'Thea' });
  });
});

describe('reference lists', () => {
  it('lists Metro Cebu areas and LGU pages', async () => {
    const lguSources = {
      listActive: vi.fn(async () => [
        { id: 's1', slug: 'cebu_city', display_name: 'Cebu City', official_name: 'Nestor Archival', official_title: 'mayor', lgu_type: 'city', fb_page_url: 'https://www.facebook.com/EngrNestorArchival', is_active: true, last_fetched_at: null },
      ]),
    } as unknown as LguSourcesRepository;
    const base = await start({ lguSources });

    const areas = await (await fetch(`${base}/api/areas`, { headers: authHeaders })).json();
    expect(areas.areas).toHaveLength(9);
    expect(areas.areas[0]).toEqual({ slug: 'cebu_city', name: 'Cebu City', lat: 10.3157, lng: 123.8854 });

    expect(await (await fetch(`${base}/api/lgu-sources`, { headers: authHeaders })).json()).toEqual({
      sources: [{ slug: 'cebu_city', displayName: 'Cebu City', officialName: 'Nestor Archival', officialTitle: 'mayor', lguType: 'city', fbPageUrl: 'https://www.facebook.com/EngrNestorArchival' }],
    });
  });
});

describe('/api/locations', () => {
  it('creates a place with 201', async () => {
    const create = vi.fn(async () => home);
    const base = await start({ locations: { create } as unknown as LocationsService });
    const response = await fetch(`${base}/api/locations`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ label: 'Home', kind: 'home', addressText: 'Guadalupe, Cebu City', lat: 10.3157, lng: 123.8854 }),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: HOME,
      label: 'Home',
      kind: 'home',
      addressText: 'Guadalupe, Cebu City',
      lat: 10.3157,
      lng: 123.8854,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    });
  });

  it('explains invalid fields', async () => {
    const base = await start({ locations: {} as LocationsService });
    const response = await fetch(`${base}/api/locations`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ label: 'Home', addressText: 'x', lat: 123.8, lng: 10.3 }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('invalid_request');
    expect(body.error.details.map((detail: { path: string }) => detail.path)).toEqual(['lat']);
  });

  it('rejects a malformed id and maps conflicts to 409', async () => {
    const remove = vi.fn(async () => {
      throw conflict('This place is used by a schedule entry. Change or delete that entry first.');
    });
    const base = await start({ locations: { remove } as unknown as LocationsService });
    expect((await fetch(`${base}/api/locations/not-a-uuid`, { method: 'DELETE', headers: authHeaders })).status).toBe(400);
    const response = await fetch(`${base}/api/locations/${HOME}`, { method: 'DELETE', headers: authHeaders });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('conflict');
  });

  it('deletes with 204', async () => {
    const base = await start({ locations: { remove: vi.fn(async () => undefined) } as unknown as LocationsService });
    expect((await fetch(`${base}/api/locations/${HOME}`, { method: 'DELETE', headers: authHeaders })).status).toBe(204);
  });
});

describe('/api/schedule', () => {
  it('lists entries with HH:MM times and embedded places', async () => {
    const base = await start({ schedule: { list: vi.fn(async () => [entry]) } as unknown as ScheduleService });
    const { entries } = await (await fetch(`${base}/api/schedule`, { headers: authHeaders })).json();
    expect(entries[0]).toMatchObject({
      title: 'Classes',
      daysOfWeek: [1, 3, 5],
      arriveBy: '07:30',
      origin: { id: HOME, label: 'Home', kind: 'home' },
      destination: { id: SCHOOL, label: 'School', kind: 'school' },
    });
  });

  it('normalizes days and rejects identical origin and destination', async () => {
    const create = vi.fn(async () => entry);
    const base = await start({ schedule: { create } as unknown as ScheduleService });
    const body = { title: 'Classes', daysOfWeek: [5, 1, 3, 1], arriveBy: '07:30', originLocationId: HOME, destinationLocationId: SCHOOL };

    expect((await fetch(`${base}/api/schedule`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) })).status).toBe(201);
    expect(create).toHaveBeenCalledWith(TEST_USER, { ...body, daysOfWeek: [1, 3, 5] });

    const same = await fetch(`${base}/api/schedule`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ ...body, destinationLocationId: HOME }) });
    expect(same.status).toBe(400);
    expect((await same.json()).error.details[0].path).toBe('destinationLocationId');

    const badTime = await fetch(`${base}/api/schedule`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ ...body, arriveBy: '7:30am' }) });
    expect((await badTime.json()).error.details[0].path).toBe('arriveBy');
  });
});

describe('/api/alerts and /api/news', () => {
  it('parses filters and marks upcoming alerts and nearby places', async () => {
    const list = vi.fn(async () => [{ alert: upcoming, places: [{ id: SCHOOL, label: 'School', distanceKm: 0.2 }] }]);
    const base = await start({ alerts: { list } as unknown as AlertsService });
    const response = await fetch(`${base}/api/alerts?type=advisory,flood&severity=high&near=10.32,123.92&radiusKm=3&relevant=true&limit=10`, { headers: authHeaders });
    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith(TEST_USER, {
      type: ['advisory', 'flood'],
      severity: ['high'],
      near: { lat: 10.32, lng: 123.92 },
      radiusKm: 3,
      relevant: true,
      limit: 10,
    });
    const { alerts } = await response.json();
    expect(alerts[0]).toMatchObject({ id: upcoming.id, status: 'upcoming', areaName: 'Mandaue City', nearPlaces: [{ id: SCHOOL, label: 'School', distanceKm: 0.2 }] });
  });

  it('rejects unknown alert types', async () => {
    const base = await start({ alerts: {} as AlertsService });
    expect((await fetch(`${base}/api/alerts?type=gossip`, { headers: authHeaders })).status).toBe(400);
  });

  it('returns 404 for a missing alert', async () => {
    const base = await start({ alerts: { get: vi.fn(async () => { throw notFound('Alert not found.'); }) } as unknown as AlertsService });
    const response = await fetch(`${base}/api/alerts/${upcoming.id}`, { headers: authHeaders });
    expect(response.status).toBe(404);
  });

  it('lists news with a publish time and whether it is also an alert', async () => {
    const news = vi.fn(async () => [{ ...upcoming, source: 'sunstar', type: 'news' as const, image_url: 'https://img.example/x.jpg' }]);
    const base = await start({ alerts: { news } as unknown as AlertsService });
    const { articles } = await (await fetch(`${base}/api/news?limit=5`, { headers: authHeaders })).json();
    expect(news).toHaveBeenCalledWith({ limit: 5 });
    expect(articles[0]).toMatchObject({ source: 'sunstar', publishedAt: upcoming.starts_at, imageUrl: 'https://img.example/x.jpg', isAlert: false });
  });
});

describe('/api/weather and /api/brief/today', () => {
  it('returns weather per area', async () => {
    const base = await start({
      weather: { list: vi.fn(async () => [weather]), get: vi.fn(async () => { throw notFound('Unknown area.'); }) } as unknown as WeatherService,
    });
    const { areas } = await (await fetch(`${base}/api/weather`, { headers: authHeaders })).json();
    expect(areas[0]).toMatchObject({ area: { slug: 'cebu_city', name: 'Cebu City' }, current: { tempC: 27 } });
    expect((await fetch(`${base}/api/weather/manila`, { headers: authHeaders })).status).toBe(404);
  });

  it('returns today’s brief with leave times in Manila time', async () => {
    const getToday = vi.fn(async () => ({
      date: '2026-10-23',
      brief: { id: 'b1', user_id: TEST_USER.id, brief_date: '2026-10-23', content: 'Good morning!', alert_ids: [upcoming.id], created_at: '', updated_at: '2026-10-22T21:30:00Z' },
      leaveTimes: [
        {
          scheduleEntryId: entry.id,
          title: 'Classes',
          arriveBy: '07:30',
          origin: { id: HOME, label: 'Home', kind: 'home' as const },
          destination: { id: SCHOOL, label: 'School', kind: 'school' as const },
          distanceKm: 5.4,
          baseMinutes: 17,
          delayMinutes: 20,
          arriveAt: new Date('2026-10-22T23:30:00Z'),
          leaveAt: new Date('2026-10-22T22:50:00Z'),
          reasons: [],
        },
      ],
      alerts: [{ alert: upcoming, places: [] }],
      weather,
    }));
    const base = await start({ briefs: { getToday } as unknown as BriefService });
    const body = await (await fetch(`${base}/api/brief/today`, { headers: authHeaders })).json();
    expect(getToday).toHaveBeenCalledWith(TEST_USER.id);
    expect(body.date).toBe('2026-10-23');
    expect(body.brief).toEqual({ id: 'b1', content: 'Good morning!', generatedAt: '2026-10-22T21:30:00Z', alertIds: [upcoming.id] });
    expect(body.leaveTimes[0]).toMatchObject({ leaveAt: '06:50', leaveAtIso: '2026-10-22T22:50:00.000Z', delayMinutes: 20 });
    expect(body.alerts[0]).toMatchObject({ id: upcoming.id, status: 'upcoming', nearPlaces: [] });
    expect(body.weather.area.slug).toBe('cebu_city');
  });
});
