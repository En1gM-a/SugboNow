# Data Sources

Every source is fetched by a scheduled backend job (see `backend/src/jobs/`)
and written to Supabase. Browsers never call these sources; the only
user-triggered fetch is the throttled LGU Facebook check described in
`docs/api-contract.md`. Quotas were checked in October 2026; re-check each
provider's dashboard before relying on them.

| Source | What | Key | Job and schedule (Asia/Manila) | Quota use |
| --- | --- | --- | --- | --- |
| [TomTom Traffic](https://developer.tomtom.com) Incident Details v5 | Traffic incidents in Metro Cebu | `TOMTOM_API_KEY` | `ingestTraffic`, every 15 min 05:00–22:45 | 72 of 2,500 requests/day |
| [WeatherAPI.com](https://www.weatherapi.com) forecast | Conditions, 24-hour forecast, official warnings per area | `WEATHER_API_KEY` | `ingestWeather`, hourly at :05 | 9 areas × 24 × 30 ≈ 6,500 of 100,000 calls/month |
| [GNews](https://gnews.io) search | Cebu articles about suspensions, floods, closures, utilities, storms | `GNEWS_API_KEY` | `ingestNews`, every 3 hours at :20 | 3 queries × 8 = 24 of 100 requests/day |
| SunStar RSS | Cebu stories | none | `ingestSunstar`, every 30 min | — |
| Cebu Daily News (CDN Digital) RSS | Cebu stories from "Latest News" | none | `ingestCebuDailyNews`, every 30 min (offset 15 min) | — |
| Official LGU Facebook pages | Mayors' and the governor's posts | none | On sign-in (`POST /api/lgu-posts/refresh`), at most every 10 min per page | — |

## TomTom

- Bounding box: Metro Cebu, Naga City to Liloan and Talisay to Mactan
  (`123.75,10.20,124.02,10.45`), only incidents valid now.
- Every incident becomes an alert, `tomtom:<incident id>`, refreshed each run:
  - road closed → `closure`/`high`; flooding → `flood`/`high`
  - accident → `traffic`, `medium` or `high`
  - lane closure and road works → `closure`, by delay
  - congestion → `traffic` by delay: minor `low`, moderate `medium`, major `high`
- When TomTom gives no end time, the alert lasts an hour, extended while TomTom still reports it.

## WeatherAPI.com

- Polls the centre of each Metro Cebu area (`backend/src/config/areas.ts`) with
  `days=2&alerts=yes`, and replaces that area's `weather_snapshots` row.
- Raises a `weather` alert only for rain that can disrupt trips in the next 12 hours (hours with ≥ 70% chance):
  - heavy rain (≥ 7.5 mm in an hour, or ≥ 20 mm total) → `high`
  - thunderstorms, or ≥ 6 mm total → `medium`
  - light rain → no alert
- Official warnings passed through by WeatherAPI become `weather` alerts, once per warning.
- PAGASA access (typhoon signals) still needs the formal request letter; until
  then, typhoon and signal news comes in through the news sources.

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
  alert keywords, articles from the last 48 hours, about 1 request per second
  (the free plan's rate limit).
- Articles older than 72 hours are skipped. Each article is classified by keyword
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

## Etiquette

- Requests identify themselves as `SugboNowBot/0.1 (+https://github.com/En1gM-a/SugboNow)`.
- Feeds are read at most every 30 minutes.
- Only the headline, a short snippet (≤ 300 characters), the image URL and the
  link are stored; the app always links back to the source.
- Comments and commenters' data from Facebook are never stored.
