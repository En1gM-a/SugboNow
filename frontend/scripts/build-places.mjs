// Builds src/data/cebuPlaces.json: the list of Cebu places that the map search looks through in the browser.
// A developer runs this by hand when the list needs refreshing; the app itself never calls OpenStreetMap's search.
//
//   node scripts/build-places.mjs [cacheDir]
//
// With a cacheDir, each downloaded answer is kept there and reused, so a rerun only fetches what is missing.
// Data: © OpenStreetMap contributors, ODbL (https://www.openstreetmap.org/copyright). Every map credits it.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const OUT = new URL('../src/data/cebuPlaces.json', import.meta.url);
const cacheDir = process.argv[2];
// South, west, north, east: the whole province with Bantayan and Camotes. Neighbouring islands are dropped below.
const BBOX = '9.40,123.28,11.36,124.15';

// Highly urbanized cities: outside the province on paper, but inside Cebu for everyone.
const CITIES = ['Cebu City', 'Mandaue', 'Mandaue City', 'Lapu-Lapu', 'Lapu-Lapu City'];

const QUERIES = {
  province: 'relation["ISO3166-2"="PH-CEB"]["boundary"="administrative"]; out geom;',
  towns: `relation["boundary"="administrative"]["admin_level"="6"](${BBOX}); out geom;`,
  barangays: `relation["boundary"="administrative"]["admin_level"="10"](${BBOX}); out geom;`,
  settlements: `(
    node["place"~"^(city|town|village|suburb|quarter|neighbourhood|hamlet|island|islet)$"]["name"](${BBOX});
    way["landuse"="residential"]["name"](${BBOX});
  ); out tags center;`,
  landmarks: `(
    nwr["amenity"~"^(school|university|college|hospital|clinic|marketplace|townhall|courthouse|library|place_of_worship|bus_station|ferry_terminal|police|fire_station|theatre|cinema|community_centre)$"]["name"](${BBOX});
    nwr["shop"~"^(mall|supermarket|department_store)$"]["name"](${BBOX});
    nwr["tourism"~"^(attraction|museum|viewpoint|hotel|resort|theme_park|zoo)$"]["name"](${BBOX});
    nwr["leisure"~"^(park|stadium|sports_centre|beach_resort|marina)$"]["name"](${BBOX});
    nwr["office"~"^(government|company|it)$"]["name"](${BBOX});
    nwr["building"~"^(office|apartments|commercial)$"]["name"](${BBOX});
    nwr["landuse"~"^(commercial|industrial|retail)$"]["name"](${BBOX});
    nwr["aeroway"~"^(aerodrome|terminal)$"]["name"](${BBOX});
    nwr["historic"]["name"](${BBOX});
    nwr["public_transport"="station"]["name"](${BBOX});
  ); out tags center;`,
  streets: `way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|service)$"]["name"](${BBOX}); out tags geom;`,
};

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function fetchQuery(name) {
  const file = cacheDir && join(cacheDir, `${name}.json`);
  if (file && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).elements;
  const body = new URLSearchParams({ data: `[out:json][timeout:170];${QUERIES[name]}` });
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(OVERPASS, {
        method: 'POST',
        body,
        headers: { 'User-Agent': 'cebu-place-list-build/1.0' },
        signal: AbortSignal.timeout(200_000),
      });
      if (res.ok) {
        const text = await res.text();
        const json = JSON.parse(text);
        // Overpass can answer 200 with a partial list and say so only in `remark`.
        if (json.remark) throw new Error(json.remark);
        if (file) {
          mkdirSync(cacheDir, { recursive: true });
          writeFileSync(file, text);
        }
        console.log(`${name}: ${json.elements.length} (${Math.round(text.length / 1024)} KB)`);
        return json.elements;
      }
      console.log(`${name}: HTTP ${res.status}, attempt ${attempt}`);
    } catch (err) {
      console.log(`${name}: ${err.message}, attempt ${attempt}`);
    }
    await sleep(15_000 * attempt);
  }
  throw new Error(`OpenStreetMap did not answer for "${name}". Try again later.`);
}

// ---------- Areas ----------

/** A boundary relation as a flat list of its line segments, with a box to skip most point tests. */
function toArea(rel) {
  const segments = [];
  const box = [Infinity, Infinity, -Infinity, -Infinity];
  for (const m of rel.members ?? []) {
    if (m.type !== 'way' || !m.geometry || (m.role && m.role !== 'outer' && m.role !== 'inner'))
      continue;
    const line = m.geometry.filter(Boolean);
    for (let i = 1; i < line.length; i++)
      segments.push([line[i - 1].lat, line[i - 1].lon, line[i].lat, line[i].lon]);
    for (const p of line) {
      box[0] = Math.min(box[0], p.lat);
      box[1] = Math.min(box[1], p.lon);
      box[2] = Math.max(box[2], p.lat);
      box[3] = Math.max(box[3], p.lon);
    }
  }
  return { name: clean(rel.tags?.name), segments, box };
}

/** Even-odd ray cast over every segment, so the order and direction of the member ways don't matter. */
function inside(area, lat, lng) {
  const [s, w, n, e] = area.box;
  if (lat < s || lat > n || lng < w || lng > e) return false;
  let odd = false;
  for (const [aLat, aLng, bLat, bLng] of area.segments) {
    if (aLat > lat !== bLat > lat && lng < ((bLng - aLng) * (lat - aLat)) / (bLat - aLat) + aLng)
      odd = !odd;
  }
  return odd;
}

// ---------- Helpers ----------

const clean = (text) => (text ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
const fold = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const round5 = (n) => Math.round(n * 1e5) / 1e5;

function metres(aLat, aLng, bLat, bLng) {
  const x = (bLng - aLng) * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  return Math.hypot(bLat - aLat, x) * 111_320;
}

/** Town names the way the rest of the app writes them. */
function townName(name) {
  if (/^(Mandaue|Lapu-Lapu|Talisay|Danao|Carcar|Toledo|Bogo|Naga)$/.test(name))
    return `${name} City`;
  if (name === 'Lilo-an') return 'Liloan';
  return name.replace(/^City of (.+)$/, '$1 City');
}

// ---------- Build ----------

const raw = {};
for (const name of Object.keys(QUERIES)) raw[name] = await fetchQuery(name);

const province = raw.province.map(toArea);
const allTowns = raw.towns.map(toArea).filter((a) => a.name && a.segments.length);
const cities = allTowns.filter((t) => CITIES.includes(t.name));
const barangayAreas = raw.barangays
  .map(toArea)
  .filter((a) => a.name && a.segments.length && !/\bzone\b/i.test(a.name));
const inCebu = (lat, lng) => [...province, ...cities].some((a) => inside(a, lat, lng));

// OpenStreetMap has boundaries for the three big cities and a few towns. Everywhere else there's only a point per town and
// per barangay, so the nearest point stands in: good enough to tell two "Rizal Street"s apart, and the barangay then says
// "near" because it may be the one next door.
const nodes = (places) =>
  raw.settlements.filter(
    (e) => e.lat !== undefined && places.includes(e.tags.place) && inCebu(e.lat, e.lon),
  );
const townNodes = nodes(['city', 'town']).filter(
  (e) => !allTowns.some((t) => inside(t, e.lat, e.lon)),
);
const barangayNodes = nodes(['suburb', 'village', 'quarter']);

function nearest(list, lat, lng, limit) {
  let best = null;
  let bestAt = limit;
  for (const e of list) {
    const d = metres(e.lat, e.lon, lat, lng);
    if (d < bestAt) {
      best = e;
      bestAt = d;
    }
  }
  return best && clean(best.tags.name);
}

/** { town, barangay } at a point, or null when it isn't in Cebu. */
function contextOf(lat, lng) {
  if (!inCebu(lat, lng)) return null;
  const town =
    allTowns.find((t) => inside(t, lat, lng))?.name ?? nearest(townNodes, lat, lng, 20_000);
  if (!town) return null;
  const barangay = barangayAreas.find((b) => inside(b, lat, lng))?.name;
  if (barangay) return { town: townName(town), barangay, near: false };
  return {
    town: townName(town),
    barangay: nearest(barangayNodes, lat, lng, 1_200) ?? '',
    near: true,
  };
}

const KINDS = ['area', 'landmark', 'street'];
const rows = [];
function add(kind, name, lat, lng) {
  const at = contextOf(lat, lng);
  if (!at) return;
  // "Lahug, Cebu City" without repeating the place's own name.
  const isSelf = (p) => fold(p) === fold(name) || fold(townName(p)) === fold(name);
  const parts = [];
  if (at.barangay && !isSelf(at.barangay) && at.barangay !== at.town)
    parts.push(at.near ? `near ${at.barangay}` : at.barangay);
  if (!isSelf(at.town)) parts.push(at.town);
  // A town is its own context.
  rows.push({
    name,
    kind,
    lat: round5(lat),
    lng: round5(lng),
    context: isSelf(at.town) && kind === 'area' ? '' : parts.join(', '),
  });
}

for (const el of raw.settlements) {
  const at = el.center ?? el;
  const name = clean(el.tags.name);
  if (/^private/i.test(name)) continue;
  add('area', /^(city|town)$/.test(el.tags.place ?? '') ? townName(name) : name, at.lat, at.lon);
}
// A barangay with a boundary but no label node still gets a row, at the middle of its box.
for (const b of barangayAreas) {
  const lat = (b.box[0] + b.box[2]) / 2;
  const lng = (b.box[1] + b.box[3]) / 2;
  if (inside(b, lat, lng)) add('area', b.name, lat, lng);
}
for (const el of raw.landmarks) {
  const at = el.center ?? el;
  add('landmark', clean(el.tags.name), at.lat, at.lon);
}

// A street is many short ways. Ways with one name join when they come within 250 m of each other, so one long street is
// one row, while two streets that share a name in different subdivisions stay apart.
const byName = new Map();
for (const way of raw.streets) {
  const name = clean(way.tags.name);
  const points = (way.geometry ?? []).filter(Boolean).map((p) => [p.lat, p.lon]);
  if (!name || points.length === 0) continue;
  const middle = points[points.length >> 1];
  const key = `${fold(name)}|${allTowns.findIndex((t) => inside(t, ...middle))}`;
  if (!byName.has(key)) byName.set(key, []);
  byName.get(key).push({ name, points });
}
for (const ways of byName.values()) {
  const group = ways.map((_, i) => i);
  const find = (i) => (group[i] === i ? i : (group[i] = find(group[i])));
  for (let i = 0; i < ways.length; i++) {
    for (let j = i + 1; j < ways.length; j++) {
      if (find(i) === find(j)) continue;
      if (ways[i].points.some((p) => ways[j].points.some((q) => metres(...p, ...q) < 250)))
        group[find(i)] = find(j);
    }
  }
  const clusters = new Map();
  ways.forEach((w, i) => {
    const root = find(i);
    if (!clusters.has(root)) clusters.set(root, { name: w.name, points: [] });
    clusters.get(root).points.push(...w.points);
  });
  for (const { name, points } of clusters.values()) {
    const lat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
    const lng = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    // The street's own point nearest its middle, so the pin is on the street even when it bends.
    const mid = points.reduce((best, p) =>
      metres(...p, lat, lng) < metres(...best, lat, lng) ? p : best,
    );
    add('street', name, mid[0], mid[1]);
  }
}

// The same place is often mapped as a point and as an outline: keep the first of each name, kind and spot.
const kept = new Map();
const unique = rows.filter((r) => {
  const key = `${fold(r.name)}|${r.kind}`;
  const others = kept.get(key) ?? [];
  if (
    others.some(
      (o) =>
        (r.kind !== 'street' && o.context === r.context) ||
        metres(o.lat, o.lng, r.lat, r.lng) < 300,
    )
  )
    return false;
  kept.set(key, [...others, r]);
  return true;
});

unique.sort(
  (a, b) =>
    KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) ||
    (a.name < b.name ? -1 : a.name > b.name ? 1 : a.lat - b.lat || a.lng - b.lng),
);
const contexts = [...new Set(unique.map((r) => r.context))].sort();
const contextIndex = new Map(contexts.map((c, i) => [c, i]));
const head = `{"builtOn":"${new Date().toISOString().slice(0, 10)}","kinds":${JSON.stringify(KINDS)},\n"contexts":${JSON.stringify(contexts)},\n"places":[\n`;
const body = unique
  .map((r) =>
    JSON.stringify([r.name, KINDS.indexOf(r.kind), r.lat, r.lng, contextIndex.get(r.context)]),
  )
  .join(',\n');
mkdirSync(new URL('.', OUT), { recursive: true });
writeFileSync(OUT, `${head}${body}\n]}\n`);
for (const k of KINDS) console.log(k, unique.filter((r) => r.kind === k).length);
