// MSW request handlers. They follow docs/api-contract.md, including validation errors
// and the 409 for deleting a place a trip still uses. Mock data is kept in localStorage,
// so your edits survive a reload.

import { delay, http, HttpResponse } from 'msw';
import type {
  Alert,
  AlertType,
  ApiErrorDetail,
  BriefTodayResponse,
  LeaveTime,
  Location,
  LocationInput,
  Profile,
  ScheduleEntry,
  ScheduleInput,
  Severity,
} from '@/types/api';
import {
  alerts,
  areas,
  initialLocations,
  initialProfile,
  initialSchedule,
  lguSources,
  news,
  postsFor,
  USER_ID,
  weather,
} from './data/fixtures';

const API = `${import.meta.env.VITE_API_URL ?? '/api'}`;
const DB_KEY = 'sn-mock-db';
export const FRESH_USER_KEY = 'sn-mock-fresh-user';

interface MockDb {
  profile: Profile;
  locations: Location[];
  schedule: ScheduleEntry[];
}

function freshDb(): MockDb {
  const p = initialProfile();
  return {
    profile: {
      ...p,
      firstName: null,
      city: null,
      addressText: null,
      subscribedMayor: null,
      commuteOriginLocationId: null,
      commuteDestinationLocationId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    locations: [],
    schedule: [],
  };
}

function loadDb(): MockDb {
  try {
    if (localStorage.getItem(FRESH_USER_KEY)) {
      localStorage.removeItem(FRESH_USER_KEY);
      const db = freshDb();
      saveDb(db);
      return db;
    }
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as MockDb;
  } catch {
    // Fall through to the default data.
  }
  return { profile: initialProfile(), locations: initialLocations(), schedule: initialSchedule() };
}

function saveDb(db: MockDb) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // Storage may be unavailable (private mode); keep the in-memory copy.
  }
}

let db = loadDb();
const reload = () => (db = loadDb());

const invalid = (details: ApiErrorDetail[]) =>
  HttpResponse.json({ error: { code: 'invalid_request', message: 'Some fields are invalid.', details } }, { status: 400 });
const notFound = () => HttpResponse.json({ error: { code: 'not_found', message: 'Not found.' } }, { status: 404 });

const latency = () => delay(250 + Math.random() * 450);

function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function relevantAlerts(): Alert[] {
  return alerts
    .map((a) => {
      if (a.lat === null || a.lng === null) return { ...a, nearPlaces: [] };
      const nearPlaces = db.locations
        .map((l) => ({ id: l.id, label: l.label, distanceKm: Math.round(km(a.lat!, a.lng!, l.lat, l.lng) * 10) / 10 }))
        .filter((p) => p.distanceKm <= 3)
        .sort((x, y) => x.distanceKm - y.distanceKm);
      return { ...a, nearPlaces };
    })
    .filter((a) => (a.nearPlaces?.length ?? 0) > 0 || a.lat === null);
}

const SEVERITY_MIN: Record<Severity, number> = { high: 20, medium: 10, low: 5 };

function manilaNow() {
  const d = new Date(Date.now() + 8 * 3_600_000);
  return { day: d.getUTCDay(), date: d.toISOString().slice(0, 10) };
}

function leaveTimes(): LeaveTime[] {
  const { day, date } = manilaNow();
  return db.schedule
    .filter((s) => s.daysOfWeek.includes(day))
    .map((s) => {
      const o = db.locations.find((l) => l.id === s.originLocationId)!;
      const d = db.locations.find((l) => l.id === s.destinationLocationId)!;
      const distanceKm = Math.round(km(o.lat, o.lng, d.lat, d.lng) * 10) / 10;
      const baseMinutes = Math.max(8, Math.round(distanceKm * 3 + 2));
      const reasons = alerts
        .filter((a) => a.lat !== null && a.status === 'active' && a.type !== 'power' && a.type !== 'water')
        .flatMap((a) => {
          const near = [o, d].find((p) => km(a.lat!, a.lng!, p.lat, p.lng) <= 1.5);
          return near
            ? [{ alertId: a.id, title: a.title, severity: a.severity, minutes: SEVERITY_MIN[a.severity], nearPlace: near.label }]
            : [];
        })
        .slice(0, 3);
      const delayMinutes = Math.min(45, reasons.reduce((n, r) => n + r.minutes, 0));
      const [h, m] = s.arriveBy.split(':').map(Number);
      let leave = h * 60 + m - baseMinutes - delayMinutes;
      leave = Math.floor(leave / 5) * 5;
      const leaveAt = `${String(Math.floor(leave / 60)).padStart(2, '0')}:${String(leave % 60).padStart(2, '0')}`;
      return {
        scheduleEntryId: s.id,
        title: s.title,
        arriveBy: s.arriveBy,
        leaveAt,
        leaveAtIso: new Date(`${date}T${leaveAt}:00+08:00`).toISOString(),
        origin: s.origin,
        destination: s.destination,
        distanceKm,
        baseMinutes,
        delayMinutes,
        reasons,
      };
    })
    .sort((a, b) => a.leaveAt.localeCompare(b.leaveAt));
}

function clock(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function brief(): BriefTodayResponse {
  const { date } = manilaNow();
  const area = db.profile.city ?? 'cebu_city';
  const w = weather.find((x) => x.area.slug === area) ?? null;
  const lt = leaveTimes();
  const near = relevantAlerts().slice(0, 10);
  const name = db.profile.firstName ?? 'there';
  const dayLabel = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const lines = [`Good day, ${name}! Here's your Cebu brief for ${dayLabel}.`, ''];
  if (w) {
    const maxRain = Math.max(...w.hourly.slice(0, 6).map((h) => h.chanceOfRain));
    lines.push(
      `Weather in ${w.area.name}: ${Math.round(w.current.tempC)}°C, ${w.current.condition.toLowerCase()}. Up to ${maxRain}% chance of rain in the next 6 hours${maxRain >= 50 ? ', so bring an umbrella' : ''}.`,
      '',
    );
  }
  if (lt.length) {
    lines.push('Your trips today:');
    for (const t of lt) {
      const extra = t.delayMinutes ? ` (+${t.delayMinutes} min: ${t.reasons[0].title} near your ${t.reasons[0].nearPlace})` : '';
      lines.push(`• ${t.title}: leave by ${clock(t.leaveAt)} to reach ${t.destination.label} by ${clock(t.arriveBy)}${extra}.`);
    }
    lines.push('');
  }
  if (near.length) {
    lines.push('Heads up near your places:');
    for (const a of near.slice(0, 3)) lines.push(`• ${a.title}`);
  } else {
    lines.push('No disruptions near your places right now. Safe travels!');
  }
  return {
    date,
    brief: { id: 'b0000000-0000-4000-8000-000000000000', content: lines.join('\n'), generatedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(), alertIds: near.map((a) => a.id) },
    leaveTimes: lt,
    alerts: near,
    weather: w,
  };
}

function validateLocation(body: Partial<LocationInput>): ApiErrorDetail[] {
  const d: ApiErrorDetail[] = [];
  if (!body.label || body.label.length > 60) d.push({ path: 'label', message: 'Use 1 to 60 characters.' });
  if (!body.addressText || body.addressText.length > 200) d.push({ path: 'addressText', message: 'Use 1 to 200 characters.' });
  if (typeof body.lat !== 'number' || body.lat < -90 || body.lat > 90) d.push({ path: 'lat', message: 'Drop a pin on the map.' });
  if (typeof body.lng !== 'number' || body.lng < -180 || body.lng > 180) d.push({ path: 'lng', message: 'Drop a pin on the map.' });
  return d;
}

function validateSchedule(body: Partial<ScheduleInput>): ApiErrorDetail[] {
  const d: ApiErrorDetail[] = [];
  if (!body.title?.trim()) d.push({ path: 'title', message: 'Give this trip a name.' });
  if (!body.daysOfWeek?.length) d.push({ path: 'daysOfWeek', message: 'Pick at least one day.' });
  if (!body.arriveBy || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.arriveBy)) d.push({ path: 'arriveBy', message: 'Use 24-hour HH:MM, e.g. 07:30.' });
  const ids = db.locations.map((l) => l.id);
  if (!body.originLocationId || !ids.includes(body.originLocationId)) d.push({ path: 'originLocationId', message: 'Pick one of your places.' });
  if (!body.destinationLocationId || !ids.includes(body.destinationLocationId)) d.push({ path: 'destinationLocationId', message: 'Pick one of your places.' });
  else if (body.destinationLocationId === body.originLocationId) d.push({ path: 'destinationLocationId', message: 'Pick a different place from the origin.' });
  return d;
}

function toEntry(id: string, body: ScheduleInput, createdAt: string): ScheduleEntry {
  const ref = (lid: string) => {
    const l = db.locations.find((x) => x.id === lid)!;
    return { id: l.id, label: l.label, kind: l.kind };
  };
  return {
    id,
    ...body,
    daysOfWeek: [...new Set(body.daysOfWeek)].sort(),
    origin: ref(body.originLocationId),
    destination: ref(body.destinationLocationId),
    createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export const handlers = [
  // Re-read the mock database on every request (it may have been reset by a sign-up). Falls through.
  http.all(`${API}/*`, () => {
    reload();
  }),

  http.get(`${API}/health`, () => HttpResponse.json({ ok: true })),

  http.get(`${API}/profile`, async () => {
    await latency();
    return HttpResponse.json(db.profile);
  }),

  http.patch(`${API}/profile`, async ({ request }) => {
    await latency();
    const body = (await request.json()) as Partial<Profile>;
    const d: ApiErrorDetail[] = [];
    if (body.city && !areas.some((a) => a.slug === body.city)) d.push({ path: 'city', message: 'Pick a Metro Cebu area.' });
    if (body.subscribedMayor && !lguSources.some((s) => s.slug === body.subscribedMayor))
      d.push({ path: 'subscribedMayor', message: 'Pick one of the listed LGUs.' });
    for (const key of ['commuteOriginLocationId', 'commuteDestinationLocationId'] as const) {
      if (body[key] && !db.locations.some((l) => l.id === body[key])) d.push({ path: key, message: 'Pick one of your places.' });
    }
    if (d.length) return invalid(d);
    db.profile = { ...db.profile, ...body, id: USER_ID, updatedAt: new Date().toISOString() };
    saveDb(db);
    return HttpResponse.json(db.profile);
  }),

  http.get(`${API}/areas`, async () => {
    await latency();
    return HttpResponse.json({ areas });
  }),

  http.get(`${API}/lgu-sources`, async () => {
    await latency();
    return HttpResponse.json({ sources: lguSources });
  }),

  http.get(`${API}/locations`, async () => {
    await latency();
    return HttpResponse.json({ locations: db.locations });
  }),

  http.post(`${API}/locations`, async ({ request }) => {
    await latency();
    const body = (await request.json()) as LocationInput;
    const d = validateLocation(body);
    if (d.length) return invalid(d);
    const now = new Date().toISOString();
    const loc: Location = { id: crypto.randomUUID(), ...body, kind: body.kind ?? 'other', createdAt: now, updatedAt: now };
    db.locations.push(loc);
    saveDb(db);
    return HttpResponse.json(loc, { status: 201 });
  }),

  http.put(`${API}/locations/:id`, async ({ request, params }) => {
    await latency();
    const i = db.locations.findIndex((l) => l.id === params.id);
    if (i < 0) return notFound();
    const body = (await request.json()) as LocationInput;
    const d = validateLocation(body);
    if (d.length) return invalid(d);
    db.locations[i] = { ...db.locations[i], ...body, updatedAt: new Date().toISOString() };
    db.schedule = db.schedule.map((s) => toEntry(s.id, s, s.createdAt));
    saveDb(db);
    return HttpResponse.json(db.locations[i]);
  }),

  http.delete(`${API}/locations/:id`, async ({ params }) => {
    await latency();
    if (!db.locations.some((l) => l.id === params.id)) return notFound();
    if (db.schedule.some((s) => s.originLocationId === params.id || s.destinationLocationId === params.id)) {
      return HttpResponse.json({ error: { code: 'conflict', message: 'This place is still used by a trip.' } }, { status: 409 });
    }
    db.locations = db.locations.filter((l) => l.id !== params.id);
    for (const key of ['commuteOriginLocationId', 'commuteDestinationLocationId'] as const) {
      if (db.profile[key] === params.id) db.profile[key] = null;
    }
    saveDb(db);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/schedule`, async () => {
    await latency();
    return HttpResponse.json({ entries: [...db.schedule].sort((a, b) => a.arriveBy.localeCompare(b.arriveBy)) });
  }),

  http.post(`${API}/schedule`, async ({ request }) => {
    await latency();
    const body = (await request.json()) as ScheduleInput;
    const d = validateSchedule(body);
    if (d.length) return invalid(d);
    const entry = toEntry(crypto.randomUUID(), body, new Date().toISOString());
    db.schedule.push(entry);
    saveDb(db);
    return HttpResponse.json(entry, { status: 201 });
  }),

  http.put(`${API}/schedule/:id`, async ({ request, params }) => {
    await latency();
    const i = db.schedule.findIndex((s) => s.id === params.id);
    if (i < 0) return notFound();
    const body = (await request.json()) as ScheduleInput;
    const d = validateSchedule(body);
    if (d.length) return invalid(d);
    db.schedule[i] = toEntry(db.schedule[i].id, body, db.schedule[i].createdAt);
    saveDb(db);
    return HttpResponse.json(db.schedule[i]);
  }),

  http.delete(`${API}/schedule/:id`, async ({ params }) => {
    await latency();
    if (!db.schedule.some((s) => s.id === params.id)) return notFound();
    db.schedule = db.schedule.filter((s) => s.id !== params.id);
    saveDb(db);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/alerts`, async ({ request }) => {
    await latency();
    const q = new URL(request.url).searchParams;
    let list: Alert[] = q.get('relevant') === 'true' ? relevantAlerts() : alerts;
    const types = q.get('type')?.split(',') as AlertType[] | undefined;
    const sev = q.get('severity')?.split(',') as Severity[] | undefined;
    const area = q.get('area')?.toLowerCase();
    if (types) list = list.filter((a) => types.includes(a.type));
    if (sev) list = list.filter((a) => sev.includes(a.severity));
    if (area) list = list.filter((a) => a.areaName?.toLowerCase().includes(area));
    return HttpResponse.json({ alerts: list.slice(0, Number(q.get('limit') ?? 50)) });
  }),

  http.get(`${API}/alerts/:id`, async ({ params }) => {
    await latency();
    const a = alerts.find((x) => x.id === params.id);
    return a ? HttpResponse.json(a) : notFound();
  }),

  http.get(`${API}/news`, async ({ request }) => {
    await latency();
    const q = new URL(request.url).searchParams;
    const area = q.get('area')?.toLowerCase();
    const list = area ? news.filter((n) => n.areaName?.toLowerCase().includes(area)) : news;
    return HttpResponse.json({ articles: list.slice(0, Number(q.get('limit') ?? 20)) });
  }),

  http.get(`${API}/weather`, async () => {
    await latency();
    return HttpResponse.json({ areas: weather });
  }),

  http.get(`${API}/weather/:area`, async ({ params }) => {
    await latency();
    const w = weather.find((x) => x.area.slug === params.area);
    return w ? HttpResponse.json(w) : notFound();
  }),

  http.get(`${API}/brief/today`, async () => {
    await latency();
    return HttpResponse.json(brief());
  }),

  http.post(`${API}/lgu-posts/refresh`, async ({ request }) => {
    await latency();
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 2);
    const slug = db.profile.subscribedMayor;
    if (!slug) return HttpResponse.json({ status: 'no_subscription', newPosts: 0, source: null, posts: [] });
    const s = lguSources.find((x) => x.slug === slug)!;
    return HttpResponse.json({
      status: 'refreshed',
      newPosts: 1,
      source: { slug: s.slug, displayName: s.displayName, officialName: s.officialName, officialTitle: s.officialTitle, fbPageUrl: s.fbPageUrl, lastFetchedAt: new Date().toISOString() },
      posts: postsFor(slug).slice(0, limit),
    });
  }),

  http.get(`${API}/lgu-posts/latest`, async ({ request }) => {
    await latency();
    const q = new URL(request.url).searchParams;
    const limit = Number(q.get('limit') ?? 2);
    // `source` is a mock-only query so the Mayor page can preview other LGUs' posts.
    const slug = q.get('source') ?? db.profile.subscribedMayor;
    const s = lguSources.find((x) => x.slug === slug);
    if (!s) return HttpResponse.json({ source: null, posts: [] });
    return HttpResponse.json({
      source: { slug: s.slug, displayName: s.displayName, officialName: s.officialName, officialTitle: s.officialTitle, fbPageUrl: s.fbPageUrl, lastFetchedAt: new Date(Date.now() - 6 * 60_000).toISOString() },
      posts: postsFor(s.slug).slice(0, limit),
    });
  }),
];
