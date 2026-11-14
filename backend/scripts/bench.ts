// Measures what the API costs without touching Supabase or any outside service.
//
// The real app runs (Express, auth, services, repositories, supabase-js), but every
// network call it makes is answered inside this process by a fake Supabase, holding
// data sized like production's, after a fixed delay. So the numbers show what the
// code does, not how fast today's network is: how many calls an endpoint makes, how
// many of them wait on each other, and how much it reads from the database.
//
//   npm run bench                       20 ms per Supabase call, 15 runs each
//   BENCH_LATENCY_MS=5 npm run bench
//
// The start-up line times the built Vercel entry (dist/index.js), so run
// `npm run build` first. Sizes are from production on 2026-11-14.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { CEBU_AREAS } from "../src/config/areas";
import { manilaDate } from "../src/utils/time";

const SUPABASE = "http://supabase.bench.invalid";
const LATENCY_MS = Number(process.env.BENCH_LATENCY_MS ?? 20);
const RUNS = Number(process.env.BENCH_RUNS ?? 15);
const USER_ID = "00000000-0000-4000-8000-000000000001";
const NOW = Date.now();

type Row = Record<string, unknown>;
type Point = [number, number];

// ---------------------------------------------------------------------------
// Data, the same on every run.
// ---------------------------------------------------------------------------

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seeded(20261114);
const between = (min: number, max: number) => min + random() * (max - min);
const round5 = (value: number) => Math.round(value * 1e5) / 1e5;
const iso = (msFromNow: number) => new Date(NOW + msFromNow).toISOString();
const uuid = (n: number) => `${n.toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`;
const MIN = 60_000;
const HOUR = 60 * MIN;

const HOME = { id: "11111111-1111-4111-8111-111111111111", label: "Home", kind: "home", lat: 10.3157, lng: 123.8854 };
const SCHOOL = { id: "22222222-2222-4222-8222-222222222222", label: "School", kind: "school", lat: 10.3236, lng: 123.9223 };
const WORK = { id: "33333333-3333-4333-8333-333333333333", label: "Work", kind: "work", lat: 10.2954, lng: 123.9472 };
const PLACES = [HOME, SCHOOL, WORK];
const ref = (place: typeof HOME) => ({ id: place.id, label: place.label, kind: place.kind });

// Home to Work in 300 points, the most a saved route has.
function routeLine(bend: number): Point[] {
  return Array.from({ length: 300 }, (_, i): Point => {
    const t = i / 299;
    return [round5(HOME.lat + (WORK.lat - HOME.lat) * t + Math.sin(t * Math.PI) * bend), round5(HOME.lng + (WORK.lng - HOME.lng) * t)];
  });
}

const ROUTES = [
  { allowCclex: true, line: routeLine(0.004) },
  { allowCclex: false, line: routeLine(-0.006) },
];

// Road lines across Metro Cebu, about 11 points each.
function roadLines(count: number): Point[][] {
  return Array.from({ length: count }, () => {
    let lat = between(10.2, 10.45);
    let lng = between(123.75, 124.02);
    const heading = random() * Math.PI * 2;
    return Array.from({ length: 6 + Math.floor(random() * 11) }, (): Point => {
      lat += Math.cos(heading) * 0.0008;
      lng += Math.sin(heading) * 0.0008;
      return [round5(lat), round5(lng)];
    });
  });
}

// Production had 632 free, 731 medium and 390 heavy lines (19,204 points, 393 KB).
// The route itself is among them, so coloring it finds roads to match.
const FLOW = {
  free: [...roadLines(632), ROUTES[0].line.slice(150), ROUTES[1].line.slice(150)],
  medium: [...roadLines(731), ROUTES[0].line.slice(60, 151), ROUTES[1].line.slice(60, 151)],
  heavy: [...roadLines(390), ROUTES[0].line.slice(0, 61), ROUTES[1].line.slice(0, 61)],
};

const ALERT_TYPES = ["traffic", "traffic", "traffic", "traffic", "closure", "flood", "weather", "advisory", "power", "water"];
const SEVERITIES = ["low", "medium", "high"];
const SUMMARY = "Expect delays in both directions while crews work on the affected lanes; motorists are advised to take alternate routes where they can. ";

// 200 alerts in effect now and 60 news stories, about 470 bytes a row as in production.
function alertRows(): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < 260; i++) {
    const news = i >= 200;
    const area = CEBU_AREAS[i % CEBU_AREAS.length];
    // Every tenth alert sits on the Home to Work route.
    const [lat, lng] = !news && i % 10 === 0 ? ROUTES[0].line[(i * 7) % 300] : [round5(area.lat + between(-0.03, 0.03)), round5(area.lng + between(-0.03, 0.03))];
    const startsAt = iso(-(i % 90) * MIN);
    rows.push({
      id: uuid(i + 1),
      source: news ? ["sunstar", "cebudailynews", "gnews"][i % 3] : "tomtom",
      type: news ? "news" : ALERT_TYPES[i % ALERT_TYPES.length],
      severity: SEVERITIES[i % 3],
      title: `Slow traffic near ${area.name} on the road to the city centre (${i})`,
      // TomTom incidents, most of the alerts, have no summary; stories do.
      summary: news || i % 4 === 0 ? SUMMARY.trim() : null,
      lat,
      lng,
      area_name: area.name,
      starts_at: startsAt,
      ends_at: iso(3 * HOUR),
      source_url: `https://example.com/cebu/stories/${i}/slow-traffic-near-${area.slug}`,
      image_url: null,
      created_at: startsAt,
    });
  }
  return rows.sort((a, b) => String(b.starts_at).localeCompare(String(a.starts_at)));
}

function weatherRows(): Row[] {
  const thisHour = Math.floor(NOW / HOUR) * HOUR;
  return CEBU_AREAS.map((area) => ({
    area_slug: area.slug,
    area_name: area.name,
    lat: area.lat,
    lng: area.lng,
    observed_at: iso(-20 * MIN),
    current_conditions: { tempC: 28.5, feelsLikeC: 33.2, condition: "Patchy rain nearby", iconUrl: "https://cdn.weatherapi.com/weather/64x64/day/176.png", isDay: true, humidity: 79, windKph: 10.1, precipMm: 0.02, chanceOfRain: 25 },
    hourly_forecast: Array.from({ length: 24 }, (_, hour) => ({
      time: new Date(thisHour + hour * HOUR).toISOString(),
      tempC: 28.1,
      condition: "Patchy rain nearby",
      iconUrl: "https://cdn.weatherapi.com/weather/64x64/day/176.png",
      chanceOfRain: 25,
      precipMm: 0.02,
      feelsLikeC: 32.6,
      isDay: true,
      humidity: 80,
      windKph: 9.8,
    })),
    fetched_at: iso(-15 * MIN),
  }));
}

const LGU_SOURCE_ID = uuid(9001);
const CAPTION = "CLASS ADVISORY: classes at all levels, public and private, continue today. Please keep safe on the road and watch for updates from the city. ";

const tables: Record<string, Row[]> = {
  profiles: [
    {
      id: USER_ID,
      display_name: "thea",
      first_name: "Thea",
      city: "cebu_city",
      address_text: "Guadalupe, Cebu City",
      subscribed_mayor: "cebu_city",
      commute_origin_location_id: HOME.id,
      commute_destination_location_id: WORK.id,
      allow_cclex: true,
      created_at: iso(-30 * 24 * HOUR),
      updated_at: iso(-24 * HOUR),
    },
  ],
  locations: PLACES.map((place) => ({ ...place, user_id: USER_ID, address_text: `${place.label}, Cebu`, created_at: iso(-30 * 24 * HOUR), updated_at: iso(-30 * 24 * HOUR) })),
  schedule_entries: ["Classes", "Work"].map((title, i) => ({
    id: uuid(8001 + i),
    user_id: USER_ID,
    title,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    arrive_by: i === 0 ? "07:30:00" : "13:00:00",
    origin_location_id: HOME.id,
    destination_location_id: WORK.id,
    origin: ref(HOME),
    destination: ref(WORK),
    created_at: iso(-30 * 24 * HOUR),
    updated_at: iso(-30 * 24 * HOUR),
  })),
  place_routes: ROUTES.map((route) => ({
    origin_location_id: HOME.id,
    destination_location_id: WORK.id,
    allow_cclex: route.allowCclex,
    origin_lat: HOME.lat,
    origin_lng: HOME.lng,
    destination_lat: WORK.lat,
    destination_lng: WORK.lng,
    distance_m: 14_230,
    travel_s: 1_620,
    uses_cclex: route.allowCclex,
    line: route.line,
    fetched_at: iso(-24 * HOUR),
  })),
  alerts: alertRows(),
  traffic_flow: [{ area: "metro_cebu", lines: FLOW, fetched_at: iso(-5 * MIN) }],
  weather_snapshots: weatherRows(),
  regional_forecasts: [
    {
      region: "visayas",
      issued_at: iso(-3 * HOUR),
      periods: ["night", "day"].map((part) => ({ part, description: "Partly cloudy skies to at times cloudy with rainshowers or thunderstorm", minC: 27, maxC: 32, wind: "Light to Moderate", direction: "Northeast", coastal: "Slight to Moderate" })),
      outlook_issued_at: iso(-6 * HOUR),
      outlook: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"].map((day) => ({ day, minC: 27, maxC: 32, wind: "Light to Moderate", direction: "Northeast", coastal: "Slight to Moderate" })),
      rainfall_warning: null,
      source_url: "https://www.pagasa.dost.gov.ph/regional-forecast/visprsd",
      fetched_at: iso(-10 * MIN),
    },
  ],
  lgu_sources: ["cebu_city", "lapu_lapu_city", "mandaue_city", "cebu_province"].map((slug, i) => ({
    id: i === 0 ? LGU_SOURCE_ID : uuid(9002 + i),
    slug,
    display_name: slug,
    official_name: "Mayor",
    official_title: "mayor",
    lgu_type: "city",
    fb_page_url: `https://www.facebook.com/${slug}`,
    is_active: true,
    last_fetched_at: iso(-HOUR),
  })),
  lgu_posts: Array.from({ length: 10 }, (_, i) => ({
    id: uuid(9100 + i),
    source_id: LGU_SOURCE_ID,
    fb_post_id: String(1647114683872212 + i),
    permalink: `https://www.facebook.com/cebu_city/posts/${i}`,
    caption: CAPTION.repeat(3).trim(),
    post_type: "photo",
    link_url: null,
    posted_at: iso(-(i + 1) * HOUR),
    first_seen_at: iso(-(i + 1) * HOUR),
    media: [{ type: "image", url: "https://example.com/photo.jpg", thumbnail_url: "https://example.com/thumb.jpg", storage_path: null, width: 1080, height: 1080 }],
    reaction_count: 4754,
    comment_count: 1872,
    share_count: 686,
    view_count: null,
    category: "class_suspension",
    deleted_at: null,
  })),
  daily_briefs: [
    {
      id: uuid(7001),
      user_id: USER_ID,
      brief_date: manilaDate(new Date(NOW)),
      content: "Good morning, Thea! Here's your Cebu brief. ".repeat(12).trim(),
      alert_ids: [],
      created_at: iso(-2 * HOUR),
      updated_at: iso(-2 * HOUR),
    },
  ],
};

// ---------------------------------------------------------------------------
// The fake Supabase: enough of PostgREST and Auth for the API's own queries.
// ---------------------------------------------------------------------------

const NOT_FILTERS = new Set(["select", "order", "limit", "offset", "or", "and", "on_conflict", "columns"]);
const unquote = (text: string) => text.replace(/^"(.*)"$/, "$1");

function passes(row: Row, column: string, filter: string): boolean {
  const value = row[column];
  if (filter === "is.null") return value === null || value === undefined;
  if (filter.startsWith("eq.")) return String(value) === unquote(filter.slice(3));
  if (filter.startsWith("in.(")) return filter.slice(4, -1).split(",").map(unquote).includes(String(value));
  if (filter.startsWith("neq.")) return String(value) !== unquote(filter.slice(4));
  if (filter.startsWith("gte.") || filter.startsWith("lte.")) {
    if (value === null || value === undefined) return false;
    const bound = unquote(filter.slice(4));
    const [left, right] = typeof value === "number" ? [value, Number(bound)] : [String(value), bound];
    return filter.startsWith("gte.") ? left >= right : left <= right;
  }
  return true; // ilike, cs and the rest don't change the sizes measured here
}

function select(table: string, query: URLSearchParams): Row[] {
  let rows = tables[table] ?? [];
  for (const [column, filter] of query) {
    // A dot in the name is a filter on an embedded table, e.g. origin.user_id.
    if (!NOT_FILTERS.has(column) && !column.includes(".")) rows = rows.filter((row) => passes(row, column, filter));
  }
  const limit = query.get("limit");
  if (limit) rows = rows.slice(0, Number(limit));
  const columns = query.get("select");
  if (!columns || columns === "*" || columns.includes("(")) return rows;
  const names = columns.split(",").map((name) => name.trim());
  return rows.map((row) => Object.fromEntries(names.map((name) => [name, row[name]])));
}

const upstream = { auth: 0, db: 0, bytes: 0 };
const realFetch = globalThis.fetch;
// A timer alone is too coarse on Windows, where it fires in steps of about 16 ms,
// so the last part of the wait is polled.
function sleep(ms: number): Promise<void> {
  const until = performance.now() + ms;
  return new Promise((resolve) => {
    const check = () => (performance.now() >= until ? resolve() : setImmediate(check));
    setTimeout(check, Math.max(0, ms - 17));
  });
}

function answer(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// A database answer, counted toward what the request read.
function rowsAnswer(body: unknown): Response {
  const response = answer(body);
  upstream.bytes += Buffer.byteLength(JSON.stringify(body));
  return response;
}

async function fakeSupabase(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  // Nothing but the fake may be called: a benchmark must never reach a real project.
  if (url.origin !== SUPABASE) throw new Error(`bench: refusing to call ${url.origin}`);
  const headers = new Headers(init?.headers);
  await sleep(LATENCY_MS);

  if (url.pathname === "/auth/v1/user") {
    upstream.auth++;
    const token = (headers.get("authorization") ?? "").replace(/^Bearer /, "");
    return token.endsWith(".bench")
      ? answer({ id: USER_ID, aud: "authenticated", role: "authenticated", email: "bench@example.com", app_metadata: {}, user_metadata: {}, created_at: iso(-30 * 24 * HOUR) })
      : answer({ code: 401, error_code: "bad_jwt", msg: "invalid JWT" }, 401);
  }

  upstream.db++;
  const table = url.pathname.replace("/rest/v1/", "");
  const method = (init?.method ?? "GET").toUpperCase();
  let rows: Row[];
  if (method === "GET" || method === "HEAD") {
    rows = select(table, url.searchParams);
  } else {
    // A write: answer with what was sent, as PostgREST does with return=representation.
    const sent: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    rows = (Array.isArray(sent) ? (sent as Row[]) : [sent as Row]).map((row) => ({ id: uuid(7999), ...row, created_at: iso(0), updated_at: iso(0) }));
  }
  const single = (headers.get("accept") ?? "").includes("vnd.pgrst.object");
  return rowsAnswer(single ? (rows[0] ?? null) : rows);
}

// ---------------------------------------------------------------------------
// Measuring.
// ---------------------------------------------------------------------------

interface ApiRequest {
  path: string;
  method?: "GET" | "POST";
}

interface Sample {
  ms: number;
  auth: number;
  db: number;
  dbBytes: number;
  bytes: number;
}

// Shaped like a Supabase access token, so code that reads its expiry finds one.
let tokens = 0;
function newToken(): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "HS256", typ: "JWT" })}.${part({ sub: USER_ID, exp: Math.floor(NOW / 1000) + 3600, jti: ++tokens })}.bench`;
}

async function call(base: string, request: ApiRequest, token: string): Promise<number> {
  const response = await realFetch(`${base}${request.path}`, { method: request.method ?? "GET", headers: { Authorization: `Bearer ${token}` } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${request.method ?? "GET"} ${request.path} answered ${response.status}: ${text.slice(0, 200)}`);
  return Buffer.byteLength(text);
}

// The requests go out together, as a page sends them.
async function measure(base: string, requests: ApiRequest[], token: string): Promise<Sample> {
  upstream.auth = upstream.db = upstream.bytes = 0;
  const started = performance.now();
  const sizes = await Promise.all(requests.map((request) => call(base, request, token)));
  return { ms: performance.now() - started, auth: upstream.auth, db: upstream.db, dbBytes: upstream.bytes, bytes: sizes.reduce((total, size) => total + size, 0) };
}

function median(samples: Sample[]): Sample {
  const middle = (pick: (sample: Sample) => number) => samples.map(pick).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
  return { ms: middle((s) => s.ms), auth: middle((s) => s.auth), db: middle((s) => s.db), dbBytes: middle((s) => s.dbBytes), bytes: middle((s) => s.bytes) };
}

const kb = (bytes: number) => (bytes / 1024).toFixed(1);

async function run(base: string, name: string, requests: ApiRequest[]): Promise<string> {
  const known = newToken();
  for (let i = 0; i < 3; i++) await measure(base, requests, known);
  const first: Sample[] = [];
  const next: Sample[] = [];
  for (let i = 0; i < RUNS; i++) {
    // "First": a token the API hasn't seen, as on the first request after sign-in.
    first.push(await measure(base, requests, newToken()));
    next.push(await measure(base, requests, known));
  }
  const a = median(first);
  const b = median(next);
  return `| ${name} | ${a.ms.toFixed(0)} ms | ${b.ms.toFixed(0)} ms | ${a.auth} / ${b.auth} | ${b.db} | ${kb(b.dbBytes)} KB | ${kb(b.bytes)} KB |`;
}

// How long the built Vercel entry takes to load in a new process: the part of a
// cold start that is this project's own code and dependencies.
function startUp(): string {
  const entry = path.resolve("dist/index.js");
  if (!existsSync(entry)) return "Start-up: no dist/index.js. Run `npm run build` first.";
  const script = `const t=performance.now();require(${JSON.stringify(entry)});console.log(JSON.stringify([performance.now()-t,Object.keys(require.cache).length]))`;
  const runs: Array<[number, number]> = [];
  for (let i = 0; i < 7; i++) {
    const result = spawnSync(process.execPath, ["-e", script], { encoding: "utf8", env: process.env });
    const line = result.stdout.split("\n").find((candidate) => candidate.startsWith("["));
    if (result.status !== 0 || !line) return `Start-up: dist/index.js failed to load. ${result.stderr.trim().split("\n")[0] ?? ""}`;
    runs.push(JSON.parse(line) as [number, number]);
  }
  runs.sort((a, b) => a[0] - b[0]);
  const [ms, modules] = runs[Math.floor(runs.length / 2)];
  return `Start-up (loading dist/index.js in a new process, median of ${runs.length}): ${ms.toFixed(0)} ms, ${modules} modules`;
}

async function main(): Promise<void> {
  // Set before the app loads: env.ts reads the environment once, and dotenv never
  // replaces a variable that is already set, so a real .env can't point this at a project.
  Object.assign(process.env, { SUPABASE_URL: SUPABASE, SUPABASE_SERVICE_ROLE_KEY: "bench", SUPABASE_ANON_KEY: "bench", FB_SCRAPE_ENABLED: "false", CRON_ENABLED: "false" });
  console.log(startUp());

  globalThis.fetch = fakeSupabase;
  const { createApp } = await import("../src/app.js");
  const { createContainer } = await import("../src/container.js");
  const { services, verifyToken } = createContainer();
  const quiet = { info: () => undefined, warn: () => undefined, error: (message: string, meta?: Record<string, unknown>) => console.error(message, meta) };
  const app = createApp({ frontendOrigin: "http://localhost:5173", verifyToken, services, logger: quiet });
  const server: Server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const get = (requestPath: string): ApiRequest => ({ path: `/api${requestPath}` });
  const route = `/routes?from=${HOME.id}&to=${WORK.id}`;
  const endpoints: Array<[string, ApiRequest[]]> = [
    ["GET /profile", [get("/profile")]],
    ["GET /brief/today", [get("/brief/today")]],
    ["GET /alerts?relevant=true", [get("/alerts?relevant=true")]],
    ["GET /alerts", [get("/alerts")]],
    ["GET /news?limit=3", [get("/news?limit=3")]],
    ["GET /routes", [get(route)]],
    ["GET /traffic-flow", [get("/traffic-flow")]],
    ["GET /weather", [get("/weather")]],
    ["GET /weather/cebu_city", [get("/weather/cebu_city")]],
    ["GET /lgu-posts/latest", [get("/lgu-posts/latest")]],
    ["GET /schedule", [get("/schedule")]],
    // What a page sends at once (frontend/src/lib/nav.ts).
    ["Today after sign-in (5 requests)", [get("/profile"), get("/brief/today"), get("/news?limit=3"), get("/alerts?relevant=true"), { path: "/api/lgu-posts/refresh", method: "POST" }]],
    ["Traffic page (5 requests)", [get("/locations"), get("/schedule"), get("/alerts?relevant=true"), get("/traffic-flow"), get(route)]],
  ];

  console.log(`\nEach Supabase call takes ${LATENCY_MS} ms. Median of ${RUNS} runs.\n`);
  console.log("| Request | First request | Later requests | Auth calls (first / later) | Database calls | Read from database | Response |");
  console.log("| --- | --- | --- | --- | --- | --- | --- |");
  for (const [name, requests] of endpoints) console.log(await run(base, name, requests));
  console.log("\nFirst request: with a token the API hasn't checked yet. Database calls and sizes are for later requests.");
  console.log("The traffic flow is looked up again at most every 30 seconds, so these runs reuse the one held.");

  await new Promise((resolve) => server.close(resolve));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
