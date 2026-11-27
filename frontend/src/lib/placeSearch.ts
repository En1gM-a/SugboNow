// The map search: looks through a list of Cebu places (areas, landmarks, streets) in the browser. The list is a static
// file built from OpenStreetMap by scripts/build-places.mjs, so typing never calls an outside service.

import placesUrl from '@/data/cebuPlaces.json?url';

export type PlaceResultKind = 'area' | 'landmark' | 'street';

export interface PlaceResult {
  name: string;
  kind: PlaceResultKind;
  /** The barangay and town, e.g. "Lahug, Cebu City", or "near Tabunok, Talisay City" when the barangay is a guess. Empty for a town. */
  context: string;
  lat: number;
  lng: number;
}

interface IndexedPlace extends PlaceResult {
  foldedName: string;
  /** "usc", for landmarks with a long name. */
  short: string;
  /** The words of the name, and of the name and context, each with a space in front: a prefix match is one includes(). */
  nameWords: string;
  allWords: string;
}

export type PlaceIndex = IndexedPlace[];

/** The file's shape: [name, kind index, lat, lng, context index]. */
interface PlacesFile {
  kinds: PlaceResultKind[];
  contexts: string[];
  places: Array<[string, number, number, number, number]>;
}

/** What people write short and the map writes long, or the other way round. Both spellings match. */
const ALIASES = new Map<string, string>([
  ['st', 'street saint'],
  ['street', 'st'],
  ['saint', 'st'],
  ['ave', 'avenue'],
  ['av', 'avenue'],
  ['avenue', 'ave'],
  ['rd', 'road'],
  ['road', 'rd'],
  ['dr', 'drive doctor'],
  ['drive', 'dr'],
  ['doctor', 'dr'],
  ['blvd', 'boulevard'],
  ['boulevard', 'blvd'],
  ['hwy', 'highway'],
  ['highway', 'hwy'],
  ['ext', 'extension'],
  ['extension', 'ext'],
  ['sto', 'santo'],
  ['santo', 'sto'],
  ['sta', 'santa'],
  ['santa', 'sta'],
  ['gen', 'general'],
  ['general', 'gen'],
  ['subd', 'subdivision'],
  ['subdivision', 'subd'],
  ['univ', 'university'],
  ['university', 'univ'],
  ['elem', 'elementary'],
  ['elementary', 'elem'],
  ['natl', 'national'],
  ['national', 'natl'],
]);

const SKIPPED_WORDS = new Set(['brgy', 'bgy', 'barangay']);

/** Lower case, no accents, one space between words: "Sto. Niño" becomes "sto nino" and "I.T. Park" "it park". */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ'’]/g, '')
    .toLowerCase()
    .replace(/\b([a-z])\.(?=[a-z]\b)/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** "University of San Carlos" as "usc", for names of three words or more. */
function initials(name: string): string {
  const words = fold(name)
    .split(' ')
    .filter((w) => w !== 'of' && w !== 'the' && w !== 'and');
  return words.length >= 3 ? words.map((w) => w[0]).join('') : '';
}

/** Every word of a name with its other spellings, and "Pari-an" as "parian" too. */
function searchWords(name: string): string {
  let out = '';
  const joined = name.includes('-') ? ` ${fold(name.replace(/-/g, ''))}` : '';
  for (const word of `${fold(name)}${joined}`.split(' ')) {
    if (!word) continue;
    const alias = ALIASES.get(word);
    out += alias ? ` ${word} ${alias}` : ` ${word}`;
  }
  return out;
}

export async function loadPlaceIndex(): Promise<PlaceIndex> {
  const res = await fetch(placesUrl);
  if (!res.ok) throw new Error(`Place list: HTTP ${res.status}`);
  const file = (await res.json()) as PlacesFile;
  const contextWords = file.contexts.map(searchWords);
  return file.places.map(([name, kind, lat, lng, context]) => {
    const short = file.kinds[kind] === 'landmark' ? initials(name) : '';
    const nameWords = `${searchWords(name)} ${short}`;
    return {
      name,
      kind: file.kinds[kind],
      context: file.contexts[context],
      lat,
      lng,
      foldedName: fold(name),
      short,
      nameWords,
      allWords: nameWords + contextWords[context],
    };
  });
}

const KIND_RANK: Record<PlaceResultKind, number> = { area: 0, landmark: 1, street: 2 };

function match(
  index: PlaceIndex,
  words: string[],
  near: { lat: number; lng: number },
  limit: number,
): PlaceResult[] {
  const query = words.join(' ');
  const tokens = words.map((w) => ` ${w}`);
  const found: Array<{ place: IndexedPlace; rank: number; distance: number }> = [];
  for (const place of index) {
    if (!tokens.every((t) => place.allWords.includes(t))) continue;
    const inName = tokens.every((t) => place.nameWords.includes(t));
    const starts = place.foldedName.startsWith(query);
    const isTown = place.kind === 'area' && place.context === '';
    const rank =
      place.foldedName === query || place.short === query || (isTown && starts)
        ? 0
        : starts
          ? 1
          : inName
            ? 2
            : 3;
    // Only used to order results, so flat distance is close enough.
    const distance = (place.lat - near.lat) ** 2 + (place.lng - near.lng) ** 2;
    found.push({ place, rank, distance });
  }
  // A town comes before the sitios that share its name.
  const order = (p: PlaceResult) => (p.context === '' ? -1 : KIND_RANK[p.kind]);
  found.sort(
    (a, b) => a.rank - b.rank || order(a.place) - order(b.place) || a.distance - b.distance,
  );
  return found.slice(0, limit).map((f) => f.place);
}

/** The best matches, nearest first among equals. Every word must start a word of the place's name, barangay or town. */
export function searchPlaces(
  index: PlaceIndex,
  text: string,
  near: { lat: number; lng: number },
  limit = 8,
): PlaceResult[] {
  const words = fold(text)
    .split(' ')
    .filter((w) => w && !SKIPPED_WORDS.has(w));
  if (words.join('').length < 2) return [];
  const results = match(index, words, near, limit);
  if (results.length > 0) return results;
  // The list has no house numbers, so "123 Colon Street" finds Colon Street.
  const withoutNumbers = words.filter((w) => !/^\d+[a-z]?$/.test(w));
  return withoutNumbers.length > 0 && withoutNumbers.length < words.length
    ? match(index, withoutNumbers, near, limit)
    : [];
}

/** The result as an address to save. A guessed barangay stays out of it. */
export function placeAddress(place: PlaceResult): string {
  const context = place.context.replace(/^near [^,]+(, )?/, '');
  return context ? `${place.name}, ${context}` : place.name;
}
