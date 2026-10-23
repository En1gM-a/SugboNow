// Metro Cebu areas the app knows about. Slugs are stable keys used by
// profiles.city, weather_snapshots.area_slug and the /api/areas list.
//
// Coordinates are approximate town centres (WGS84). They are used to poll
// weather, to place area-level news on the map, and to match it to saved
// places; they are not boundaries.

export interface CebuArea {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  // How the area is written in news text.
  aliases: RegExp[];
}

export const CEBU_AREAS: readonly CebuArea[] = [
  { slug: "cebu_city", name: "Cebu City", lat: 10.3157, lng: 123.8854, aliases: [/\bcebu city\b/i] },
  { slug: "mandaue_city", name: "Mandaue City", lat: 10.3236, lng: 123.9223, aliases: [/\bmandaue\b/i] },
  { slug: "lapu_lapu_city", name: "Lapu-Lapu City", lat: 10.3103, lng: 123.9494, aliases: [/\blapu[- ]?lapu\b/i, /\bmactan\b/i] },
  { slug: "talisay_city", name: "Talisay City", lat: 10.2447, lng: 123.8494, aliases: [/\btalisay\b/i] },
  { slug: "consolacion", name: "Consolacion", lat: 10.3766, lng: 123.9573, aliases: [/\bconsolacion\b/i] },
  { slug: "liloan", name: "Liloan", lat: 10.3994, lng: 123.9985, aliases: [/\blilo-?an\b/i] },
  { slug: "minglanilla", name: "Minglanilla", lat: 10.2449, lng: 123.7962, aliases: [/\bminglanilla\b/i] },
  { slug: "naga_city", name: "Naga City", lat: 10.2093, lng: 123.758, aliases: [/\bnaga\b/i] },
  { slug: "cordova", name: "Cordova", lat: 10.2522, lng: 123.9496, aliases: [/\bcordova\b/i] },
];

export function getArea(slug: string): CebuArea | undefined {
  return CEBU_AREAS.find((area) => area.slug === slug);
}

// The area mentioned first in the text (a news dateline usually comes first).
export function findAreaInText(text: string): CebuArea | undefined {
  let best: { area: CebuArea; index: number } | undefined;
  for (const area of CEBU_AREAS) {
    for (const alias of area.aliases) {
      const index = text.search(alias);
      if (index >= 0 && (!best || index < best.index)) best = { area, index };
    }
  }
  return best?.area;
}

// True when the text is about Cebu: it names Cebu or a Metro Cebu area.
export function mentionsCebu(text: string): boolean {
  return /\bcebu(ano|anos)?\b/i.test(text) || findAreaInText(text) !== undefined;
}
