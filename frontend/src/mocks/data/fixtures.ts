// Mock fixtures shaped exactly like docs/api-contract.md. Times are relative to "now"
// so relative labels ("2h ago") and leave times look realistic whenever you open the app.

import type {
  Alert,
  Area,
  LguPost,
  LguSource,
  Location,
  NewsArticle,
  Profile,
  ScheduleEntry,
  Weather,
  WeatherHour,
} from '@/types/api';
import { ribbonArt } from './art';

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const hoursFromNow = (h: number) => new Date(now + h * 3_600_000).toISOString();

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
    officialName: null,
    officialTitle: 'mayor',
    lguType: 'city',
    fbPageUrl: null,
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
    officialName: null,
    officialTitle: 'governor',
    lguType: 'province',
    fbPageUrl: null,
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

export function initialSchedule(): ScheduleEntry[] {
  const [home, school, work] = initialLocations();
  const ref = (l: Location) => ({ id: l.id, label: l.label, kind: l.kind });
  return [
    {
      id: '44444444-0000-4000-8000-000000000004',
      title: 'Classes',
      daysOfWeek: [1, 2, 3, 4, 5],
      arriveBy: '07:30',
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
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      arriveBy: '16:00',
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
    imageUrl: ribbonArt(3),
    createdAt: minutesAgo(600),
  },
  {
    id: 'a0000005-0000-4000-8000-000000000005',
    source: 'weatherapi',
    type: 'weather',
    severity: 'medium',
    title: 'Thunderstorm advisory for Metro Cebu',
    summary: 'Moderate to heavy rain with lightning and strong winds within the next 2 hours.',
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
    imageUrl: ribbonArt(5),
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
    imageUrl: ribbonArt(2),
    createdAt: minutesAgo(50),
  },
];

const NEWS_TITLES: Array<[NewsArticle['source'], string, string, string, NewsArticle['type'], boolean]> = [
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
  ['sunstar', 'Thunderstorm advisory raised over Metro Cebu', 'The weather bureau warns of lightning and strong winds this afternoon.', 'Metro Cebu', 'weather', true],
  ['gnews', 'Cebu startup builds app for jeepney routes', 'Commuters can now find the right jeep with offline maps.', 'Cebu City', 'news', false],
  ['cebudailynews', 'Lapu-Lapu fiesta schedule released', 'Masses, a parade and a fluvial procession are set for the weekend.', 'Lapu-Lapu City', 'news', false],
  ['sunstar', 'Port operations normal despite rain', 'Ferries to Bohol and Leyte continue to sail on schedule.', 'Cebu City', 'news', false],
  ['gnews', 'Province of Cebu announces class schedule for Undas', 'Towns that follow the province will have no classes on November 2.', 'Cebu Province', 'advisory', true],
];

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
  imageUrl: i % 5 === 4 ? null : ribbonArt(i),
  areaName,
  publishedAt: minutesAgo(18 + i * 47),
  type,
  isAlert,
}));

function conditionFor(rain: number, isDay: boolean): string {
  if (rain >= 70) return 'Moderate or heavy rain with thunder';
  if (rain >= 45) return 'Patchy rain nearby';
  if (rain >= 25) return isDay ? 'Partly cloudy' : 'Cloudy';
  return isDay ? 'Sunny' : 'Clear';
}

function manilaHour(d: Date): number {
  return (d.getUTCHours() + 8) % 24;
}

export const weather: Weather[] = areas.map((area, ai) => {
  const start = new Date(now);
  start.setUTCMinutes(0, 0, 0);
  const hourly: WeatherHour[] = Array.from({ length: 25 }, (_, h) => {
    const time = new Date(start.getTime() + h * 3_600_000);
    const hour = manilaHour(time);
    const isDay = hour >= 6 && hour < 18;
    const temp = 28 + 3.5 * Math.sin(((hour - 8) / 24) * Math.PI * 2) + (ai % 3) * 0.4;
    // A rain band that moves across Metro Cebu over the afternoon.
    const peak = 3 + (ai % 4) * 2;
    const rain = Math.max(5, Math.min(95, Math.round(85 - Math.abs(h - peak) * 12 + (ai % 2) * 6)));
    return {
      time: time.toISOString(),
      tempC: Math.round(temp * 10) / 10,
      condition: conditionFor(rain, isDay),
      iconUrl: null,
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
      tempC: first.tempC + 0.4,
      feelsLikeC: first.tempC + 4.6,
      condition: first.condition,
      iconUrl: null,
      isDay,
      humidity: 76 + (ai % 4) * 3,
      windKph: 8 + ai * 1.3,
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
    'TRAFFIC ADVISORY\n\nPara sa Undas, ang mga dalan palibot sa mga sementeryo sirado gikan alas 6 sa buntag. Please use the alternate routes shown in the photos and follow our traffic enforcers on the ground.',
  ],
  ['weather', 'WEATHER UPDATE: Thunderstorm advisory over Metro Cebu this afternoon. Avoid low-lying areas and bring an umbrella.'],
  ['utility', 'Scheduled water interruption in some barangays tomorrow from 9 AM to 3 PM for pipe repairs. Please store water ahead of time.'],
  ['general', 'Salamat sa tanang volunteers sa coastal cleanup karong buntag! Over two tons of trash collected. Padayon ta, Sugbo!'],
  ['general', 'Free medical and dental mission this Saturday at the city sports complex, 8 AM to 4 PM. Bring a valid ID.'],
];

export function postsFor(slug: string): LguPost[] {
  const offset = lguSources.findIndex((s) => s.slug === slug);
  return Array.from({ length: 10 }, (_, i) => {
    const [category, caption] = CAPTIONS[(i + Math.max(0, offset)) % CAPTIONS.length];
    const mediaCount = i % 4 === 0 ? 3 : i % 4 === 1 ? 1 : i % 4 === 2 ? 0 : 2;
    const isVideo = i === 3;
    return {
      id: `p${offset}${String(i).padStart(6, '0')}-0000-4000-8000-000000000000`,
      fbPostId: `16471146838${offset}${i}`,
      permalink: lguSources[Math.max(0, offset)].fbPageUrl,
      caption,
      postType: isVideo ? 'video' : mediaCount > 1 ? 'album' : mediaCount === 1 ? 'photo' : 'text',
      linkUrl: null,
      postedAt: minutesAgo(45 + i * 260 + offset * 30),
      firstSeenAt: minutesAgo(40 + i * 260),
      media: Array.from({ length: isVideo ? 1 : mediaCount }, (_, m) => ({
        type: isVideo ? ('video' as const) : ('image' as const),
        url: isVideo ? (lguSources[Math.max(0, offset)].fbPageUrl ?? '#') : ribbonArt(i * 3 + m + offset),
        thumbnailUrl: ribbonArt(i * 3 + m + offset),
        width: 1080,
        height: 1080,
        altText: 'May be an image of text',
        durationSeconds: isVideo ? 94 : null,
      })),
      reactionCount: 4754 - i * 410 - offset * 120,
      commentCount: 1872 - i * 170,
      shareCount: 686 - i * 60,
      viewCount: isVideo ? 21_000 : null,
      category,
    };
  });
}
