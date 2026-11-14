# Data Sources

Every source is fetched by a scheduled backend job (see `backend/src/jobs/`)
and written to Supabase. Browsers never call these sources; the only
user-triggered fetch is the throttled LGU Facebook check described in
`docs/api-contract.md`. Quotas were checked in October 2026; re-check each
provider's dashboard before relying on them.

| Source | What | Key | Job and schedule (Asia/Manila) | Quota use |
| --- | --- | --- | --- | --- |
| [TomTom Traffic](https://developer.tomtom.com) Incident Details v5 | Traffic incidents in Metro Cebu | `TOMTOM_API_KEY` | `ingestTraffic`, every 15 min 05:00–22:45 | 72 of 2,500 requests/day |
| [TomTom Traffic Flow](https://developer.tomtom.com) Vector Flow Tiles v4 | Speed on every road in Metro Cebu, against its free-flow speed | `TOMTOM_API_KEY` | `ingestTraffic`, with the incidents | 49 tiles a run: about 110,000 of 200,000 tiles/month |
| [TomTom Routing](https://developer.tomtom.com) Calculate Route v1 | Road routes between saved places, with and without CCLEX | `TOMTOM_API_KEY` | `ingestRoutes`, every 30 min (:20, :50) | Shares the 2,500/day above. 1–2 per new or moved pair of places, then 1–2 per pair a week; at most 40 a run |
| [WeatherAPI.com](https://www.weatherapi.com) forecast | Conditions, 24-hour forecast, official warnings per area | `WEATHER_API_KEY` | `ingestWeather`, hourly at :05 | 9 areas × 24 × 30 ≈ 6,500 of 100,000 calls/month |
| [GNews](https://gnews.io) search | Cebu articles about suspensions, floods, closures, utilities, storms | `GNEWS_API_KEY` | `ingestNews`, every 3 hours at :20 | 3 queries × 8 = 24 of 100 requests/day |
| SunStar RSS | Cebu stories | none | `ingestSunstar`, every 30 min | — |
| Cebu Daily News (CDN Digital) RSS | Cebu stories from "Latest News" | none | `ingestCebuDailyNews`, every 30 min (offset 15 min) | — |
| Official LGU Facebook pages | Mayors' and the governor's posts | none | On sign-in (`POST /api/lgu-posts/refresh`), at most every 10 min per page | — |
| [PAGASA Visayas regional page](https://www.pagasa.dost.gov.ph/regional-forecast/visprsd) | Night and day forecast, extended outlook, heavy-rainfall warning, thunderstorm advisories and watches | none | `ingestPagasa`, every 30 min at :10 and :40 | 1 page request per run |

## TomTom

- Bounding box: Metro Cebu, Naga City to Liloan and Talisay to Mactan
  (`123.75,10.20,124.02,10.45`), only incidents valid now.
- Every incident becomes an alert, `tomtom:<incident id>`, refreshed each run:
  - road closed → `closure`/`high`; flooding → `flood`/`high`
  - accident → `traffic`, `medium` or `high`
  - lane closure and road works → `closure`, by delay
  - congestion → `traffic` by delay: minor `low`, moderate `medium`, major `high`
- When TomTom gives no end time, the alert lasts an hour, extended while TomTom still reports it.

### Traffic flow (`ingestTraffic`)

- After the incidents, each run fetches the 49 zoom-13 vector flow tiles over the same box
  (`/traffic/map/4/tile/flow/relative/…pbf`, `margin=0` so neighbouring tiles don't repeat a road)
  and saves every road line with a level: heavy under 40% of the road's free-flow speed or
  closed, medium under 75%, free otherwise. Roads TomTom has no speed for are left out.
- A run within 10 minutes of the last saved flow keeps it, so duplicate runs (GitHub's timer and
  Supabase's) don't spend tiles twice. If the flow fails, the alerts are still saved and the run fails.
- **Quota:** TomTom's pricing page (checked 2026-11-12) lists free allowances per month, with no card:
  200,000 flow tiles, 2,500 incident requests and 20,000 routing requests. The incidents row
  above says per day; check the TomTom dashboard, because 72 a day is about 2,200 a month.

### Routing (`ingestRoutes`)

- For every origin → destination pair a trip or a usual commute uses, it asks for the fastest car route
  (`travelMode=car`, `routeType=fastest`, `traffic=false`, `computeTravelTimeFor=all`,
  `sectionType=tollRoad`), and saves it to `public.place_routes`.
- The travel time is TomTom's historic-traffic time for the route, not live traffic.
- CCLEX is Metro Cebu's only toll road, so a `TOLL_ROAD` section marks a route that crosses it.
  Only then does it ask again with `avoid=tollRoads` for the route over a bridge; otherwise it saves
  the same route for both choices, with no second request.
  **Check with the real key:** that TomTom marks CCLEX as a toll road. If it doesn't, routes still work,
  but the CCLEX switch never appears.
- Lines are simplified to at most 300 points before saving.
- A route is fetched again when a place moves or after 7 days. At most 40 requests a run; the rest wait.

## WeatherAPI.com

- Polls the centre of each Metro Cebu area (`backend/src/config/areas.ts`) with
  `days=2&alerts=yes`, and replaces that area's `weather_snapshots` row.
- Raises a `weather` alert only for rain that can disrupt trips in the next 12 hours (hours with ≥ 70% chance):
  - heavy rain (≥ 7.5 mm in an hour, or ≥ 20 mm total) → `high`
  - thunderstorms, or ≥ 6 mm total → `medium`
  - light rain → no alert
- Official warnings passed through by WeatherAPI become `weather` alerts, once per warning.
- PAGASA's API (TenDay) still needs the formal request letter. Its Visayas page is
  read instead (below); typhoon signals still come in through the news sources.

## News: SunStar, Cebu Daily News, GNews

- **SunStar:** `https://www.sunstar.com.ph/api/v1/collections/local-news.rss`.
  The Cebu-only collection (`cebu.rss`) is empty, so the all-editions local feed
  is filtered to Cebu stories by URL (`/cebu/`) or category.
- **Cebu Daily News:** `https://cebudailynews.inquirer.net/category/latest-news/feed`.
  - The WordPress REST API needs a login, and HTML scraping isn't needed.
  - `robots.txt` allows this feed.
  - Use the URL exactly: variants such as `/feed/` with a trailing slash get a bot-protection challenge (HTTP 403).
  - The feed labels Manila time as UTC; the integration corrects this.
  - "Latest News" also has world and entertainment stories, so only items mentioning Cebu or a Metro Cebu area are kept.
- **GNews:** three searches (`backend/src/integrations/gnews.ts`) for Cebu plus
  alert keywords, articles from the last 24 hours, about 1 request per second
  (the free plan's rate limit).
- Articles older than 24 hours are skipped. Each article is classified by keyword
  (`backend/src/services/alertClassifier.ts`, English, Cebuano and Tagalog):
  - class suspensions and advisories, major weather, floods, road blockages,
    traffic, and power or water interruptions become alerts
  - everything else is stored as plain news (`type = 'news'`)
- Fingerprint `news:<hash of the URL>`, so an article is stored once even if
  GNews and a feed both carry it.

## LGU Facebook pages

See `docs/data-model.md` (`lgu_sources`, `lgu_posts`). Pages are read logged
out with headless Chromium. Captions that announce a disruption also become
alerts (`facebook:<lgu>:<post id>`), placed at the city's centre; the province
page's alerts have no single point.

## PAGASA Visayas regional page

- One request per run to `https://www.pagasa.dost.gov.ph/regional-forecast/visprsd`, PAGASA's public
  Visayas page (`backend/src/integrations/pagasa.ts`). There is no key and no official API, so it reads the page.
- The night and day forecast, the extended outlook and the heavy-rainfall warning replace the `regional_forecasts`
  row for `visayas` (`GET /api/weather/pagasa`).
- Thunderstorm advisories that name Cebu become `weather` alerts (`medium`), one per Metro Cebu town named and placed
  at its centre, ending 2 hours after issue. Watches that name Cebu become one `low` alert for the province, for the
  hours the watch states. Fingerprint `pagasa:<sha1 of heading, issue time and area>`.
- Page times are Manila time. Content is DOST-PAGASA public information; the app credits PAGASA and links the page.
- A page redesign shows up as a `failed` run ("No forecast or outlook found"); the last saved forecast stays.
  `backend/tests/fixtures/pagasa-visprsd.html` is a trimmed copy from 2026-11-07 for the parser tests.

## Etiquette

- Requests identify themselves as `SugboNowBot/0.1 (+https://github.com/En1gM-a/SugboNow)`.
- Feeds are read at most every 30 minutes.
- Only the headline, a short snippet (≤ 300 characters), the image URL and the
  link are stored; the app always links back to the source.
- Comments and commenters' data from Facebook are never stored.
