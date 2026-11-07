// Mock fixtures shaped exactly like docs/api-contract.md. Times are relative to "now"
// so relative labels ("2h ago") and leave times look realistic whenever you open the app.
// The weather is a rain band over Metro Cebu, like the design sample (docs/handoffs/frontend-sample.html).

import type {
  Alert,
  Area,
  LguPost,
  LguSource,
  Location,
  NewsArticle,
  Profile,
  RegionalForecast,
  ScheduleEntry,
  Weather,
  WeatherHour,
} from '@/types/api';

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const hoursFromNow = (h: number) => new Date(now + h * 3_600_000).toISOString();
const pad = (n: number) => String(n).padStart(2, '0');
const round1 = (n: number) => Math.round(n * 10) / 10;

export const areas: Area[] = [
  { slug: 'cebu_city', name: 'Cebu City', lat: 10.3157, lng: 123.8854 },
  { slug: 'mandaue_city', name: 'Mandaue City', lat: 10.3236, lng: 123.9223 },
  { slug: 'lapu_lapu_city', name: 'Lapu-Lapu City', lat: 10.3103, lng: 123.9494 },
  { slug: 'talisay_city', name: 'Talisay City', lat: 10.2447, lng: 123.8494 },
  { slug: 'consolacion', name: 'Consolacion', lat: 10.3766, lng: 123.9573 },
  { slug: 'liloan', name: 'Liloan', lat: 10.3994, lng: 123.9993 },
  { slug: 'minglanilla', name: 'Minglanilla', lat: 10.2449, lng: 123.7962 },
  { slug: 'naga_city', name: 'Naga City', lat: 10.2097, lng: 123.7586 },
  { slug: 'cordova', name: 'Cordova', lat: 10.2525, lng: 123.949 },
];

export const lguSources: LguSource[] = [
  {
    slug: 'cebu_city',
    displayName: 'Cebu City',
    officialName: 'Nestor Archival',
    officialTitle: 'mayor',
    lguType: 'city',
    fbPageUrl: 'https://www.facebook.com/EngrNestorArchival',
  },
  {
    slug: 'lapu_lapu_city',
    displayName: 'Lapu-Lapu City',
    officialName: 'Cindi King Chan',
    officialTitle: 'mayor',
    lguType: 'city',
    fbPageUrl: 'https://www.facebook.com/mayorcindichan',
  },
  {
    slug: 'mandaue_city',
    displayName: 'Mandaue City',
    officialName: 'Thadeo "Jonkie" Ouano',
    officialTitle: 'mayor',
    lguType: 'city',
    fbPageUrl: 'https://www.facebook.com/JonkieOuanoPH',
  },
  {
    slug: 'cebu_province',
    displayName: 'Province of Cebu',
    officialName: 'Pamela Baricuatro',
    officialTitle: 'governor',
    lguType: 'province',
    fbPageUrl: 'https://www.facebook.com/cebugovph',
  },
];

export const USER_ID = '0b0c7a1e-0000-4000-8000-000000000001';

export function initialProfile(): Profile {
  return {
    id: USER_ID,
    displayName: 'thea',
    firstName: 'Thea',
    city: 'cebu_city',
    addressText: 'Guadalupe, Cebu City',
    subscribedMayor: 'cebu_city',
    commuteOriginLocationId: '11111111-0000-4000-8000-000000000001',
    commuteDestinationLocationId: '22222222-0000-4000-8000-000000000002',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
  };
}

export function initialLocations(): Location[] {
  return [
    {
      id: '11111111-0000-4000-8000-000000000001',
      label: 'Home',
      kind: 'home',
      addressText: 'Guadalupe, Cebu City',
      lat: 10.3245,
      lng: 123.8873,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: '22222222-0000-4000-8000-000000000002',
      label: 'School',
      kind: 'school',
      addressText: 'N. Bacalso Ave, Cebu City',
      lat: 10.2945,
      lng: 123.8811,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: '33333333-0000-4000-8000-000000000003',
      label: 'Part-time job',
      kind: 'work',
      addressText: 'A.S. Fortuna St, Mandaue City',
      lat: 10.3311,
      lng: 123.9152,
      createdAt: '2026-10-02T00:00:00Z',
      updatedAt: '2026-10-02T00:00:00Z',
    },
  ];
}

/** "HH:MM" on the Manila clock, `minutes` from now (rounded up to 5 minutes, at most 23:55). */
function manilaClockIn(minutes: number): string {
  const manila = new Date(now + 8 * 3_600_000);
  const t = Math.min(23 * 60 + 55, Math.ceil((manila.getUTCHours() * 60 + manila.getUTCMinutes() + minutes) / 5) * 5);
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

export function initialSchedule(): ScheduleEntry[] {
  const [home, school, work] = initialLocations();
  const ref = (l: Location) => ({ id: l.id, label: l.label, kind: l.kind });
  const everyDay = [0, 1, 2, 3, 4, 5, 6];
  // Arrival times follow the clock, so the demo always has a leave time coming up.
  return [
    {
      id: '44444444-0000-4000-8000-000000000004',
      title: 'Classes',
      daysOfWeek: everyDay,
      arriveBy: manilaClockIn(80),
      originLocationId: home.id,
      destinationLocationId: school.id,
      origin: ref(home),
      destination: ref(school),
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: '55555555-0000-4000-8000-000000000005',
      title: 'Shift at the shop',
      daysOfWeek: everyDay,
      arriveBy: manilaClockIn(330),
      originLocationId: school.id,
      destinationLocationId: work.id,
      origin: ref(school),
      destination: ref(work),
      createdAt: '2026-10-02T00:00:00Z',
      updatedAt: '2026-10-02T00:00:00Z',
    },
  ];
}

export const alerts: Alert[] = [
  {
    id: 'a0000001-0000-4000-8000-000000000001',
    source: 'facebook',
    type: 'advisory',
    severity: 'high',
    title: 'Cebu City: Walay klase sa tanang lebel ugma',
    summary: 'Classes at all levels, public and private, are suspended tomorrow due to the expected heavy rain. Stay safe, Sugbo!',
    lat: 10.2931,
    lng: 123.9022,
    areaName: 'Cebu City',
    startsAt: hoursFromNow(14),
    endsAt: hoursFromNow(26),
    status: 'upcoming',
    sourceUrl: 'https://www.facebook.com/EngrNestorArchival',
    imageUrl: null,
    createdAt: minutesAgo(35),
  },
  {
    id: 'a0000002-0000-4000-8000-000000000002',
    source: 'tomtom',
    type: 'traffic',
    severity: 'high',
    title: 'Stationary traffic on Osmeña Blvd',
    summary: 'Queuing traffic from Fuente Osmeña Circle to Capitol, about 20 minutes of delay.',
    lat: 10.3105,
    lng: 123.8925,
    areaName: 'Cebu City',
    startsAt: minutesAgo(40),
    endsAt: hoursFromNow(1),
    status: 'active',
    sourceUrl: null,
    imageUrl: null,
    createdAt: minutesAgo(40),
  },
  {
    id: 'a0000003-0000-4000-8000-000000000003',
    source: 'tomtom',
    type: 'flood',
    severity: 'high',
    title: 'Flooding on M.J. Cuenco Ave near Mabolo',
    summary: 'Knee-deep flood reported. Light vehicles are advised to take another route.',
    lat: 10.3175,
    lng: 123.9087,
    areaName: 'Cebu City',
    startsAt: minutesAgo(25),
    endsAt: hoursFromNow(3),
    status: 'active',
    sourceUrl: null,
    imageUrl: null,
    createdAt: minutesAgo(25),
  },
  {
    id: 'a0000004-0000-4000-8000-000000000004',
    source: 'sunstar',
    type: 'closure',
    severity: 'high',
    title: 'Road closure: N. Bacalso Ave drainage works',
    summary: 'One stretch of N. Bacalso Ave is closed for drainage works until Sunday. Use C. Padilla St.',
    lat: 10.2962,
    lng: 123.8829,
    areaName: 'Cebu City',
    startsAt: minutesAgo(600),
    endsAt: hoursFromNow(48),
    status: 'active',
    sourceUrl: 'https://www.sunstar.com.ph/cebu',
    imageUrl: null,
    createdAt: minutesAgo(600),
  },
  {
    id: 'a0000005-0000-4000-8000-000000000005',
    source: 'weatherapi',
    type: 'weather',
    severity: 'medium',
    title: 'Heavy rain over Metro Cebu',
    summary: 'Moderate to heavy rain until noon. Flooding is possible in low-lying parts of Banilad and Mandaue.',
    lat: null,
    lng: null,
    areaName: 'Metro Cebu',
    startsAt: minutesAgo(15),
    endsAt: hoursFromNow(2),
    status: 'active',
    sourceUrl: null,
    imageUrl: null,
    createdAt: minutesAgo(15),
  },
  {
    id: 'a0000006-0000-4000-8000-000000000006',
    source: 'tomtom',
    type: 'traffic',
    severity: 'medium',
    title: 'Slow traffic on A.S. Fortuna St',
    summary: 'Heavy traffic toward Banilad, about 10 minutes of delay.',
    lat: 10.3302,
    lng: 123.9128,
    areaName: 'Mandaue City',
    startsAt: minutesAgo(20),
    endsAt: hoursFromNow(1),
    status: 'active',
    sourceUrl: null,
    imageUrl: null,
    createdAt: minutesAgo(20),
  },
  {
    id: 'a0000007-0000-4000-8000-000000000007',
    source: 'tomtom',
    type: 'traffic',
    severity: 'medium',
    title: 'Queuing traffic on Marcelo Fernan Bridge',
    summary: 'Slow-moving traffic toward Lapu-Lapu City.',
    lat: 10.3333,
    lng: 123.9409,
    areaName: 'Mandaue City',
    startsAt: minutesAgo(30),
    endsAt: hoursFromNow(1),
    status: 'active',
    sourceUrl: null,
    imageUrl: null,
    createdAt: minutesAgo(30),
  },
  {
    id: 'a0000008-0000-4000-8000-000000000008',
    source: 'cebudailynews',
    type: 'power',
    severity: 'low',
    title: 'Scheduled power interruption in parts of Talisay',
    summary: 'Line maintenance from 8 AM to 5 PM on Saturday in Tabunok and Lawaan.',
    lat: 10.2563,
    lng: 123.8414,
    areaName: 'Talisay City',
    startsAt: hoursFromNow(30),
    endsAt: hoursFromNow(39),
    status: 'upcoming',
    sourceUrl: 'https://cebudailynews.inquirer.net/',
    imageUrl: null,
    createdAt: minutesAgo(180),
  },
  {
    id: 'a0000009-0000-4000-8000-000000000009',
    source: 'sunstar',
    type: 'water',
    severity: 'low',
    title: 'Low water pressure in Lapu-Lapu City',
    summary: 'Water service may be weak in Pusok and Basak while pipes are repaired.',
    lat: 10.3167,
    lng: 123.9667,
    areaName: 'Lapu-Lapu City',
    startsAt: minutesAgo(120),
    endsAt: hoursFromNow(10),
    status: 'active',
    sourceUrl: 'https://www.sunstar.com.ph/cebu',
    imageUrl: null,
    createdAt: minutesAgo(120),
  },
  {
    id: 'a0000010-0000-4000-8000-000000000010',
    source: 'tomtom',
    type: 'closure',
    severity: 'low',
    title: 'Lane closure on Mactan Circumferential Road',
    summary: 'One lane closed for road works near the airport.',
    lat: 10.3089,
    lng: 123.9811,
    areaName: 'Lapu-Lapu City',
    startsAt: minutesAgo(300),
    endsAt: hoursFromNow(20),
    status: 'active',
    sourceUrl: null,
    imageUrl: null,
    createdAt: minutesAgo(300),
  },
  {
    id: 'a0000011-0000-4000-8000-000000000011',
    source: 'tomtom',
    type: 'traffic',
    severity: 'low',
    title: 'Slow traffic on Natalio Bacalso Ave, Talisay',
    summary: 'Light delay of about 5 minutes near Tabunok.',
    lat: 10.2621,
    lng: 123.8452,
    areaName: 'Talisay City',
    startsAt: minutesAgo(10),
    endsAt: hoursFromNow(1),
    status: 'active',
    sourceUrl: null,
    imageUrl: null,
    createdAt: minutesAgo(10),
  },
  {
    id: 'a0000012-0000-4000-8000-000000000012',
    source: 'gnews',
    type: 'flood',
    severity: 'high',
    title: 'Flooding reported in Poblacion, Consolacion',
    summary: 'Residents report rising water along the national highway after hours of rain.',
    lat: 10.3767,
    lng: 123.9573,
    areaName: 'Consolacion',
    startsAt: minutesAgo(50),
    endsAt: hoursFromNow(4),
    status: 'active',
    sourceUrl: 'https://news.google.com/',
    imageUrl: null,
    createdAt: minutesAgo(50),
  },
];

// Newest first. The first four are the design sample's headlines.
const NEWS_TITLES: Array<[NewsArticle['source'], string, string, string, NewsArticle['type'], boolean]> = [
  ['sunstar', 'Rain to continue over Metro Cebu until noon', 'Moderate to heavy rain is expected until noon. Low-lying parts of Banilad and Mandaue may flood.', 'Metro Cebu', 'weather', true],
  ['cebudailynews', 'New loading bays open along the jeepney route to IT Park', 'Twelve marked stops aim to cut the stop-and-go along the corridor.', 'Cebu City', 'news', false],
  ['gnews', 'Water service resumes in parts of Mandaue tonight', 'Pipe repairs in three barangays are done, and pressure should be back by 9 PM.', 'Mandaue City', 'water', true],
  ['sunstar', 'Sinulog route plans shared for the January parade', 'The city is consulting barangays on the route and the road closures it will need.', 'Cebu City', 'news', false],
  ['cebudailynews', 'Mandaue police to deploy 500 personnel for Kalag-kalag', 'Police will be posted at cemeteries and terminals as families head out for Undas.', 'Mandaue City', 'news', false],
  ['sunstar', 'Cebu City suspends classes at all levels tomorrow', 'City Hall cites the forecast heavy rain and thunderstorms over Metro Cebu.', 'Cebu City', 'advisory', true],
  ['gnews', 'Floods hit parts of Consolacion after overnight rain', 'Several barangays along the national highway report knee-deep water.', 'Consolacion', 'flood', true],
  ['sunstar', 'Drainage works close part of N. Bacalso Avenue until Sunday', 'Motorists are urged to use C. Padilla St. while crews work on the culverts.', 'Cebu City', 'closure', true],
  ['cebudailynews', 'Bus rapid transit test run set for next month', 'The first stretch from Bulacao to Capitol will open for trial rides.', 'Cebu City', 'news', false],
  ['sunstar', 'Lapu-Lapu opens new night market near the airport', 'Food stalls and local crafts will run every weekend until December.', 'Lapu-Lapu City', 'news', false],
  ['gnews', 'Talisay sets scheduled brownout for line maintenance', 'Tabunok and Lawaan will be without power from 8 AM to 5 PM on Saturday.', 'Talisay City', 'power', true],
  ['cebudailynews', 'Cebu fishermen get new boats from provincial program', 'One hundred motorized bancas were turned over to coastal towns.', 'Cebu Province', 'news', false],
  ['sunstar', 'Minglanilla readies Sugat-Kabanhawan route for next year', 'The town is consulting barangays on the parade route and road closures.', 'Minglanilla', 'news', false],
  ['gnews', 'Water pressure to be weak in parts of Lapu-Lapu', 'Pipe repairs in Pusok and Basak may affect supply until tonight.', 'Lapu-Lapu City', 'water', true],
  ['cebudailynews', 'Liloan students win regional robotics contest', 'The team will represent Central Visayas in the national finals.', 'Liloan', 'news', false],
  ['sunstar', 'Cordova bridge traffic plan takes effect Monday', 'New loading zones and a no-stopping rule will apply near the bridge ramp.', 'Cordova', 'traffic', true],
  ['cebudailynews', 'Naga City tree-planting drive covers 20 hectares', 'Volunteers planted native species in upland barangays.', 'Naga City', 'news', false],
  ['gnews', 'Cebu tourism arrivals up for the third quarter', 'Hotels in Mactan report high occupancy ahead of the holidays.', 'Lapu-Lapu City', 'news', false],
  ['sunstar', 'Heavy traffic expected near cemeteries this weekend', 'Traffic enforcers will close side streets near Carreta and Calamba cemeteries.', 'Cebu City', 'traffic', true],
  ['cebudailynews', 'Consolacion mall expansion adds jobs for residents', 'The new wing will hire around 800 workers.', 'Consolacion', 'news', false],
  ['sunstar', 'Cebu City market vendors move to temporary site', 'Carbon Market vendors start their transfer this week.', 'Cebu City', 'news', false],
  ['gnews', 'Mandaue to open new public library', 'The library will have free Wi-Fi and study rooms for students.', 'Mandaue City', 'news', false],
  ['cebudailynews', 'Talisay beach cleanup collects two tons of trash', 'Volunteers cleaned up the Tangke shoreline on Saturday.', 'Talisay City', 'news', false],
  ['gnews', 'Province of Cebu announces class schedule for Undas', 'Towns that follow the province will have no classes on November 2.', 'Cebu Province', 'advisory', true],
];

/** An abstract picture, so mock cards show how an image sits without using photos or calling another server. */
function art(from: string, to: string, width = 1200, height = 675): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/><g fill="#fff" fill-opacity=".12"><circle cx="${width * 0.8}" cy="${height * 0.25}" r="${height * 0.2}"/><path d="M0 ${height * 0.72} C ${width * 0.25} ${height * 0.58}, ${width * 0.55} ${height * 0.86}, ${width} ${height * 0.68} V ${height} H 0 Z"/></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Most stories have no image, so the app shows its gradient placeholders, as in the design sample.
const NEWS_ART: Record<number, string> = { 1: art('#14213D', '#2F7BE0'), 4: art('#0E7C74', '#14213D'), 8: art('#B45309', '#14213D') };

export const news: NewsArticle[] = NEWS_TITLES.map(([source, title, summary, areaName, type, isAlert], i) => ({
  id: `n${String(i + 1).padStart(7, '0')}-0000-4000-8000-000000000000`,
  source,
  title,
  summary,
  url:
    source === 'sunstar'
      ? 'https://www.sunstar.com.ph/cebu'
      : source === 'cebudailynews'
        ? 'https://cebudailynews.inquirer.net/'
        : 'https://news.google.com/',
  imageUrl: NEWS_ART[i] ?? null,
  areaName,
  publishedAt: minutesAgo(18 + i * 47),
  type,
  isAlert,
}));

/** WeatherAPI-style icon URL; the app reads the code and day/night from it and never loads the image. */
const iconUrl = (code: number, isDay: boolean) => `https://cdn.weatherapi.com/weather/64x64/${isDay ? 'day' : 'night'}/${code}.png`;

function conditionFor(rain: number, isDay: boolean): [string, number] {
  if (rain >= 70) return ['Moderate rain', 302];
  if (rain >= 50) return ['Light rain', 296];
  if (rain >= 30) return ['Patchy rain nearby', 176];
  if (rain >= 15) return ['Partly cloudy', 116];
  return [isDay ? 'Sunny' : 'Clear', 113];
}

function manilaHour(d: Date): number {
  return (d.getUTCHours() + 8) % 24;
}

// PAGASA's Visayas forecast, shaped like GET /api/weather/pagasa, with the values its page had on 2026-11-06.
const longDay = (k: number) => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }).format(new Date(now + k * 86_400_000));
const seas = { wind: 'Light to Moderate', direction: 'Northeast', coastal: 'Slight to Moderate' };
const showers = 'Partly cloudy skies to at times cloudy with rainshowers or thunderstorm';
// The latest 5 PM issue (09:00 UTC), so "night" and "day" read as tonight and tomorrow.
const pagasaIssued = new Date(now);
pagasaIssued.setUTCHours(9, 0, 0, 0);
if (pagasaIssued.getTime() > now) pagasaIssued.setUTCDate(pagasaIssued.getUTCDate() - 1);
export const pagasa: RegionalForecast = {
  region: 'visayas',
  issuedAt: pagasaIssued.toISOString(),
  periods: [
    { part: 'night', description: showers, minC: 27, maxC: 30, ...seas },
    { part: 'day', description: showers, minC: 27, maxC: 32, ...seas },
  ],
  outlookIssuedAt: minutesAgo(600),
  outlook: [32, 32, 33, 33, 33].map((maxC, k) => ({ day: longDay(k), minC: k < 2 ? 27 : 26, maxC, ...seas })),
  rainfallWarning: null,
  sourceUrl: 'https://www.pagasa.dost.gov.ph/regional-forecast/visprsd',
  fetchedAt: minutesAgo(12),
};

// Rain chance for the current hour and the next 24: heavy now, easing off, then a lighter band later.
const RAIN_CURVE = [80, 70, 55, 40, 25, 15, 12, 10, 10, 14, 20, 26, 30, 35, 38, 35, 30, 24, 18, 14, 12, 10, 10, 12, 15];

export const weather: Weather[] = areas.map((area, ai) => {
  const start = new Date(now);
  start.setUTCMinutes(0, 0, 0);
  const hourly: WeatherHour[] = RAIN_CURVE.map((curve, h) => {
    const time = new Date(start.getTime() + h * 3_600_000);
    const hour = manilaHour(time);
    const isDay = hour >= 6 && hour < 18;
    // The same rain band everywhere, a little weaker farther from Cebu City.
    const rain = Math.max(5, curve - (ai % 4) * 6);
    const temp = 27 + 3 * Math.sin(((hour - 9) / 24) * Math.PI * 2) + (ai % 3) * 0.4 - rain / 40;
    const [condition, code] = conditionFor(rain, isDay);
    return {
      time: time.toISOString(),
      tempC: round1(temp),
      condition,
      iconUrl: iconUrl(code, isDay),
      chanceOfRain: rain,
      precipMm: rain > 50 ? Math.round((rain - 50) / 8) / 2 : 0,
    };
  });
  const first = hourly[0];
  const isDay = manilaHour(new Date(now)) >= 6 && manilaHour(new Date(now)) < 18;
  return {
    area,
    observedAt: minutesAgo(12),
    fetchedAt: minutesAgo(8),
    current: {
      tempC: first.tempC,
      feelsLikeC: round1(first.tempC + 3.6),
      condition: first.condition,
      iconUrl: first.iconUrl,
      isDay,
      humidity: 82 + (ai % 4) * 3,
      windKph: round1(9 + ai * 1.3),
      precipMm: first.precipMm,
      chanceOfRain: first.chanceOfRain,
    },
    hourly,
  };
});

const CAPTIONS: Array<[LguPost['category'], string]> = [
  [
    'class_suspension',
    'CLASS ADVISORY | WALAY KLASE UGMA\n\nTungod sa gipaabot nga kusog nga ulan, gisuspinde ang klase sa tanang lebel, publiko ug pribado, ugma. Ang mga opisina sa gobyerno magpadayon.\n\nClasses at all levels, public and private, are suspended tomorrow because of the expected heavy rain. Government offices remain open. Please stay safe and keep updated through this page.',
  ],
  [
    'traffic',
    'TRAFFIC ADVISORY\n\nPara sa Undas, ang mga dalan palibot sa mga sementeryo sirado gikan alas 6 sa buntag. Please use the alternate routes and follow our traffic enforcers on the ground.',
  ],
  ['weather', 'WEATHER UPDATE: Heavy rain over Metro Cebu until noon. Avoid low-lying areas and bring an umbrella.'],
  ['utility', 'Scheduled water interruption in some barangays tomorrow from 9 AM to 3 PM for pipe repairs. Please store water ahead of time.'],
  ['general', 'Salamat sa tanang volunteers sa coastal cleanup karong buntag! Over two tons of trash collected. Padayon ta, Sugbo!'],
  ['general', 'Free medical and dental mission this Saturday at the city sports complex, 8 AM to 4 PM. Bring a valid ID.'],
];

const photo = (from: string, to: string): LguPost['media'][number] => ({
  type: 'image',
  url: art(from, to, 1080, 1080),
  thumbnailUrl: art(from, to, 1080, 1080),
  width: 1080,
  height: 1080,
  altText: 'Sample picture for this post',
  durationSeconds: null,
});

// One of each media layout: 1 image, 2 side by side, 3 or more with "+N", and a video that links to Facebook.
const POST_MEDIA: Record<number, LguPost['media']> = {
  0: [photo('#14213D', '#C8102E')],
  1: [photo('#B45309', '#FFC233'), photo('#14213D', '#2F7BE0')],
  3: [photo('#0E7C74', '#3FB8A8'), photo('#1E5AA8', '#5AA2F5'), photo('#14213D', '#2F4E8A'), photo('#B45309', '#14213D'), photo('#0E7C74', '#14213D')],
  4: [{ type: 'video', url: 'https://www.facebook.com/', thumbnailUrl: art('#14213D', '#0E7C74'), width: 1280, height: 720, altText: null, durationSeconds: 94 }],
};

export function postsFor(slug: string): LguPost[] {
  const offset = lguSources.findIndex((s) => s.slug === slug);
  return Array.from({ length: 10 }, (_, i) => {
    const [category, caption] = CAPTIONS[(i + Math.max(0, offset)) % CAPTIONS.length];
    return {
      id: `p${offset}${String(i).padStart(6, '0')}-0000-4000-8000-000000000000`,
      fbPostId: `16471146838${offset}${i}`,
      permalink: lguSources[Math.max(0, offset)].fbPageUrl,
      caption,
      postType: 'text',
      linkUrl: null,
      postedAt: minutesAgo(35 + i * 260 + offset * 30),
      firstSeenAt: minutesAgo(30 + i * 260),
      media: POST_MEDIA[i] ?? [],
      reactionCount: 4754 - i * 410 - offset * 120,
      commentCount: 1872 - i * 170,
      shareCount: 686 - i * 60,
      viewCount: null,
      category,
    };
  });
}
