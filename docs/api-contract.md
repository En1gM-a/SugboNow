# API Contract

This document is the source of truth for the frontend and backend API boundary.
The frontend mirrors these shapes in `frontend/src/types/api.ts`.

## Endpoints at a glance

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness check (no auth) |
| GET, PATCH | `/api/profile` | The signed-in user's profile |
| GET | `/api/areas` | Metro Cebu areas, for the home-city picker |
| GET | `/api/lgu-sources` | Mayors/governor the user can follow |
| GET, POST | `/api/locations` | Saved places |
| PUT, DELETE | `/api/locations/:id` | Change or delete a saved place |
| GET, POST | `/api/schedule` | Recurring trips |
| PUT, DELETE | `/api/schedule/:id` | Change or delete a trip |
| GET | `/api/alerts` | Active and upcoming alerts |
| GET | `/api/alerts/:id` | One alert |
| GET | `/api/news` | Latest Cebu news |
| GET | `/api/weather` | Weather for every Metro Cebu area |
| GET | `/api/weather/:area` | Weather for one area |
| GET | `/api/brief/today` | Today's Cebu Daily Brief with leave times |
| POST | `/api/lgu-posts/refresh` | Check the followed mayor's page, return latest posts |
| GET | `/api/lgu-posts/latest` | Latest saved posts, no check |

### Typical flow after sign-in

1. `GET /api/profile`. If `city` or `subscribedMayor` is `null`, show onboarding
   with pickers from `GET /api/areas` and `GET /api/lgu-sources`, then `PATCH /api/profile`.
2. `POST /api/lgu-posts/refresh` once, for the mayor's latest posts.
3. `GET /api/brief/today` for the dashboard: brief text, leave times, nearby alerts, weather.
4. `GET /api/alerts`, `GET /api/news`, `GET /api/weather` for their own screens.

## Conventions

- Base path: `/api`. The frontend reads it from `VITE_API_URL`.
- JSON in and out. Field names are camelCase.
- Every endpoint except `/api/health` needs the user's Supabase access token:
  `Authorization: Bearer <access_token>`. Missing or invalid tokens get `401`.
- Errors use one shape. `details` appears on validation errors, one entry per field:

  ```json
  {
    "error": {
      "code": "invalid_request",
      "message": "Some fields are invalid.",
      "details": [{ "path": "arriveBy", "message": "Use 24-hour HH:MM, e.g. 07:30." }]
    }
  }
  ```

  | Code | Status | When |
  | --- | --- | --- |
  | `invalid_request` | 400 | Bad body, query or id; malformed JSON |
  | `unauthorized` | 401 | Missing, invalid or expired token |
  | `forbidden` | 403 | The database refused the change |
  | `not_found` | 404 | No such record (or not the user's) |
  | `conflict` | 409 | The record is still in use, e.g. a place used by a trip |
  | `internal_error` | 500 | Anything else |

- Timestamps (`…At`) are ISO 8601 strings in UTC. Clock times (`arriveBy`,
  `leaveAt`) are `"HH:MM"` in Asia/Manila. Dates (`date`) are `"YYYY-MM-DD"` in Asia/Manila.
- Ids are UUIDs. A malformed id gets `400`; someone else's id gets `404`.
- `DELETE` returns `204` with no body. `POST` returns `201` with the created record.

## GET /api/health

No auth. Returns `{ "ok": true }`.

## Profile

### GET /api/profile

```json
{
  "id": "0b0c…",
  "displayName": "thea",
  "firstName": "Thea",
  "city": "cebu_city",
  "addressText": "Guadalupe, Cebu City",
  "subscribedMayor": "cebu_city",
  "commuteOriginLocationId": "1111…",
  "commuteDestinationLocationId": null,
  "createdAt": "2026-10-01T00:00:00Z",
  "updatedAt": "2026-10-02T00:00:00Z"
}
```

| Field | Notes |
| --- | --- |
| `city` | Area slug from `GET /api/areas`. Picks the weather shown in the brief. |
| `subscribedMayor` | LGU slug from `GET /api/lgu-sources`. Whose Facebook posts to show. |
| `commuteOriginLocationId`, `commuteDestinationLocationId` | The user's own saved places, or `null`. |

### PATCH /api/profile

Send only the fields to change; `null` clears a field. Unknown fields are rejected.

```json
{ "firstName": "Thea", "city": "mandaue_city", "subscribedMayor": "mandaue_city" }
```

Returns the updated profile. `400` with `details` for an unknown `city` or
`subscribedMayor`, or a commute place that isn't one of the user's places.

## Reference lists

### GET /api/areas

Metro Cebu areas, in this order: Cebu City, Mandaue City, Lapu-Lapu City,
Talisay City, Consolacion, Liloan, Minglanilla, Naga City, Cordova.

```json
{ "areas": [{ "slug": "cebu_city", "name": "Cebu City", "lat": 10.3157, "lng": 123.8854 }] }
```

### GET /api/lgu-sources

```json
{
  "sources": [
    {
      "slug": "cebu_city",
      "displayName": "Cebu City",
      "officialName": "Nestor Archival",
      "officialTitle": "mayor",
      "lguType": "city",
      "fbPageUrl": "https://www.facebook.com/EngrNestorArchival"
    }
  ]
}
```

Current slugs: `cebu_city`, `lapu_lapu_city`, `mandaue_city`, `cebu_province`.

## Saved places

```json
{
  "id": "1111…",
  "label": "Home",
  "kind": "home",
  "addressText": "Guadalupe, Cebu City",
  "lat": 10.3157,
  "lng": 123.8854,
  "createdAt": "2026-10-01T00:00:00Z",
  "updatedAt": "2026-10-01T00:00:00Z"
}
```

- `GET /api/locations` → `{ "locations": [Location] }`, oldest first.
- `POST /api/locations` → `201` Location. Body:
  `{ "label": "Home", "kind": "home", "addressText": "Guadalupe, Cebu City", "lat": 10.3157, "lng": 123.8854 }`
  - `label` 1–60 chars, `addressText` 1–200 chars, `lat` −90…90, `lng` −180…180.
  - `kind`: `home`, `school`, `work` or `other` (default `other`).
- `PUT /api/locations/:id` → Location. Same body (full replacement).
- `DELETE /api/locations/:id` → `204`. `409 conflict` while a trip still uses the place.

The frontend geocodes addresses (e.g. with the map); the API stores the coordinates it is given.

## Schedule

```json
{
  "id": "4444…",
  "title": "Classes",
  "daysOfWeek": [1, 3, 5],
  "arriveBy": "07:30",
  "originLocationId": "1111…",
  "destinationLocationId": "2222…",
  "origin": { "id": "1111…", "label": "Home", "kind": "home" },
  "destination": { "id": "2222…", "label": "School", "kind": "school" },
  "createdAt": "2026-10-01T00:00:00Z",
  "updatedAt": "2026-10-01T00:00:00Z"
}
```

- `GET /api/schedule` → `{ "entries": [ScheduleEntry] }`, earliest `arriveBy` first.
- `POST /api/schedule` → `201` ScheduleEntry. Body:
  `{ "title": "Classes", "daysOfWeek": [1, 3, 5], "arriveBy": "07:30", "originLocationId": "…", "destinationLocationId": "…" }`
  - `daysOfWeek`: `0` = Sunday … `6` = Saturday; duplicates removed, sorted.
  - `arriveBy`: 24-hour `"HH:MM"`, Asia/Manila.
  - Origin and destination must be two different places of the user's.
- `PUT /api/schedule/:id` → ScheduleEntry. Same body (full replacement).
- `DELETE /api/schedule/:id` → `204`.

## Alerts

An alert is something that disrupts getting around Cebu today, or a major event
that can lead to it. Ordinary news (politics, crime, sports, business) is never
an alert; it appears only in `/api/news`.

| `type` | What | Typical source | Severity |
| --- | --- | --- | --- |
| `advisory` | Class suspensions (`high`); class advisories such as resumptions (`medium`) | Mayors' Facebook posts, news | `high`/`medium` |
| `weather` | Typhoons, storm signals, heavy rain, thunderstorms, official warnings | WeatherAPI, news | `high`/`medium` |
| `flood` | Flooding | TomTom, news, Facebook posts | `high` |
| `closure` | Road closures, rerouting, landslides; lane closures and road works | TomTom, news | `high` (closures) to `low` |
| `traffic` | Congestion, accidents, traffic advisories | TomTom, news | by delay: `high`/`medium`/`low` |
| `power` | Brownouts, power interruptions | News, Facebook posts | `low` |
| `water` | Water interruptions | News, Facebook posts | `low` |

`source` is one of `tomtom`, `weatherapi`, `facebook`, `sunstar`, `cebudailynews`, `gnews`, `manual`.

```json
{
  "id": "5555…",
  "source": "facebook",
  "type": "advisory",
  "severity": "high",
  "title": "Mandaue City: WALAY KLASE | OCT 23",
  "summary": "WALAY KLASE | OCT 23 Based on the latest air quality advisory…",
  "lat": 10.3236,
  "lng": 123.9223,
  "areaName": "Mandaue City",
  "startsAt": "2026-10-22T23:00:00Z",
  "endsAt": "2026-10-23T10:00:00Z",
  "status": "upcoming",
  "sourceUrl": "https://www.facebook.com/JonkieOuanoPH/posts/…",
  "imageUrl": "https://scontent…jpg",
  "createdAt": "2026-10-22T12:00:00Z",
  "nearPlaces": [{ "id": "2222…", "label": "School", "distanceKm": 0.2 }]
}
```

| Field | Notes |
| --- | --- |
| `status` | `active` (started) or `upcoming` (starts within 48 hours). |
| `lat`, `lng` | `null` for area-wide alerts, e.g. province-wide announcements. |
| `sourceUrl` | Link to the article or post, when there is one. Always show it for news and Facebook alerts. |
| `imageUrl` | News or post image, when there is one. Facebook image URLs expire after some days. |
| `nearPlaces` | Only with `relevant=true`: the user's places this alert is near, nearest first. |

### GET /api/alerts

Active and upcoming alerts, most important first: by severity, then type
(`advisory`, `flood`, `closure`, `weather`, `traffic`, `power`, `water`), then newest.

| Query | Default | Notes |
| --- | --- | --- |
| `type` | every type except `news` | Comma-separated, e.g. `type=advisory,flood` |
| `severity` | all | Comma-separated: `low`, `medium`, `high` |
| `area` | — | Matches part of `areaName`, e.g. `area=Mandaue` |
| `near` | — | `lat,lng`; with `radiusKm` (default 5, max 50) keeps alerts within that distance |
| `relevant` | `false` | `true`: only alerts near the user's saved places, with `nearPlaces` |
| `limit` | 50 | 1–200 |

Response: `{ "alerts": [Alert] }`.

### GET /api/alerts/:id

One Alert, or `404`.

## GET /api/news

Latest Cebu stories from SunStar, Cebu Daily News and GNews (last 72 hours), newest first.

| Query | Default | Notes |
| --- | --- | --- |
| `area` | — | Matches part of `areaName` |
| `limit` | 20 | 1–50 |

```json
{
  "articles": [
    {
      "id": "…",
      "source": "cebudailynews",
      "title": "Mandaue City Police Office to deploy 500 personnel for Kalag-kalag",
      "summary": "MANDAUE CITY, Cebu – The Mandaue City Police Office (MCPO) will deploy…",
      "url": "https://cebudailynews.inquirer.net/777910/…",
      "imageUrl": "https://cebudailynews.inquirer.net/files/…jpg",
      "areaName": "Mandaue City",
      "publishedAt": "2026-10-22T11:58:39.000Z",
      "type": "news",
      "isAlert": false
    }
  ]
}
```

`isAlert` is `true` when the story is also an alert (then `type` is the alert type).
Only the headline, a short snippet and the link are stored: link to `url` for the full story.

## Weather

```json
{
  "area": { "slug": "cebu_city", "name": "Cebu City", "lat": 10.3157, "lng": 123.8854 },
  "observedAt": "2026-10-22T12:15:00.000Z",
  "fetchedAt": "2026-10-22T12:20:03.000Z",
  "current": {
    "tempC": 28.5,
    "feelsLikeC": 33.2,
    "condition": "Patchy rain nearby",
    "iconUrl": "https://cdn.weatherapi.com/weather/64x64/night/176.png",
    "isDay": false,
    "humidity": 79,
    "windKph": 10.1,
    "precipMm": 0.02,
    "chanceOfRain": 25
  },
  "hourly": [
    { "time": "2026-10-22T12:00:00.000Z", "tempC": 28.1, "condition": "Patchy rain nearby", "iconUrl": "https://…", "chanceOfRain": 25, "precipMm": 0.02 }
  ]
}
```

- `GET /api/weather` → `{ "areas": [Weather] }`, one per area that has been fetched.
- `GET /api/weather/:area` → Weather for an area slug. `404` for an unknown slug, or before the first fetch.
- `hourly` covers the current hour and the next 24. Updated hourly.

## GET /api/brief/today

Today's Cebu Daily Brief. The brief text is written once a day (05:30, or the
first time the user opens it that day). `leaveTimes`, `alerts` and `weather` are
recomputed on every request, so they stay current.

```json
{
  "date": "2026-10-23",
  "brief": {
    "id": "…",
    "content": "Good morning, Thea! Here's your Cebu brief for Friday, October 23.\n\nWeather in Cebu City: 27°C, patchy rain nearby. …\n\nYour trips today:\n• Classes: leave by 6:50 AM to reach School by 7:30 AM (+20 min: Stationary traffic on Osmeña Blvd near your Home).",
    "generatedAt": "2026-10-22T21:30:00Z",
    "alertIds": ["…"]
  },
  "leaveTimes": [
    {
      "scheduleEntryId": "4444…",
      "title": "Classes",
      "arriveBy": "07:30",
      "leaveAt": "06:50",
      "leaveAtIso": "2026-10-22T22:50:00.000Z",
      "origin": { "id": "1111…", "label": "Home", "kind": "home" },
      "destination": { "id": "2222…", "label": "School", "kind": "school" },
      "distanceKm": 5.4,
      "baseMinutes": 17,
      "delayMinutes": 20,
      "reasons": [
        { "alertId": "…", "title": "Stationary traffic on Osmeña Blvd", "severity": "high", "minutes": 20, "nearPlace": "Home" }
      ]
    }
  ],
  "alerts": [Alert],
  "weather": Weather
}
```

| Field | Notes |
| --- | --- |
| `brief.content` | Plain text with `\n` line breaks and `•` bullets. Render with `white-space: pre-line`. |
| `leaveTimes` | Today's trips (by `daysOfWeek`), earliest departure first. Empty when there are none. |
| `leaveTimes[].leaveAt` | Suggested departure, `"HH:MM"` Manila, rounded down to 5 minutes. |
| `leaveTimes[].baseMinutes` | Estimated trip time without disruptions. |
| `leaveTimes[].delayMinutes` | Extra time for alerts near the start or end of the trip (max 45). |
| `alerts` | Up to 10 alerts near the user's places, most important first, each with `nearPlaces`. |
| `weather` | The profile's `city`, else the area nearest the user's home; `null` before the first fetch. |

The brief is rule-based for now; when an AI provider is chosen, only `brief.content` changes.

## LGU Facebook posts

The signed-in user's subscribed LGU is `profiles.subscribed_mayor`, a slug
matching `lgu_sources.slug` (`cebu_city`, `lapu_lapu_city`, `mandaue_city`,
`cebu_province`).

### POST /api/lgu-posts/refresh

Call once after sign-in. The **backend** checks the subscribed LGU's official
Facebook page for its newest 2 posts and saves any it hasn't seen before; posts
already saved are ignored. Posts announcing a disruption (class suspension,
flood, road closure, brownout, …) also become alerts. The browser never
contacts Facebook.

Throttling: each page is checked at most once per
`FB_REFRESH_INTERVAL_MINUTES` (default 10) however many users sign in, and only
one check per page runs at a time. If the check fails or is skipped, saved posts
are still returned, so this endpoint never blocks sign-in on Facebook.

Query: `limit` (optional, 1–10, default 2): how many saved posts to return.

Response `200`:

```json
{
  "status": "refreshed",
  "newPosts": 1,
  "source": {
    "slug": "mandaue_city",
    "displayName": "Mandaue City",
    "officialName": "Thadeo \"Jonkie\" Ouano",
    "officialTitle": "mayor",
    "fbPageUrl": "https://www.facebook.com/JonkieOuanoPH",
    "lastFetchedAt": "2026-10-16T08:00:00.000Z"
  },
  "posts": [
    {
      "id": "6b1d…",
      "fbPostId": "1647114683872212",
      "permalink": "https://www.facebook.com/JonkieOuanoPH/posts/pfbid02…",
      "caption": "CLASS ADVISORY | OCT 16 …",
      "postType": "album",
      "linkUrl": null,
      "postedAt": "2026-10-15T09:55:39.000Z",
      "firstSeenAt": "2026-10-16T08:00:00.000Z",
      "media": [
        {
          "type": "image",
          "url": "https://scontent…fbcdn.net/…jpg",
          "thumbnailUrl": "https://scontent…fbcdn.net/…jpg",
          "width": 1080,
          "height": 1080,
          "altText": "May be an image of text",
          "durationSeconds": null
        }
      ],
      "reactionCount": 4754,
      "commentCount": 1872,
      "shareCount": 686,
      "viewCount": null,
      "category": "class_suspension"
    }
  ]
}
```

| Field | Notes |
| --- | --- |
| `status` | `refreshed` (checked now), `fresh` (checked recently, nothing to do), `failed` (check failed; saved posts returned), `disabled` (`FB_SCRAPE_ENABLED=false`), `no_subscription` (user has no `subscribed_mayor`; `source` is null, `posts` empty), `unknown_source` (slug has no active page). |
| `newPosts` | How many posts this request saved. `0` unless `status` is `refreshed`. |
| `source` | `null` when the user has no subscription or the slug is unknown. |
| `posts` | Newest first by `postedAt`. Deleted posts are excluded. |
| `postType` | `text`, `photo`, `video`, `album`, `link`, `shared`, `event`, `other`. |
| `media[].url` | Image URL for `image`; the video's Facebook page URL for `video`. Facebook image URLs expire after some days. |
| `media[].thumbnailUrl` | Smaller image, or the video's thumbnail. |
| `media[].durationSeconds` | Videos only. |
| Counts | Engagement counts when the post was first saved. Counts only; comments are never stored. |
| `category` | `class_suspension`, `traffic`, `weather`, `utility` or `general`, set from the caption; `null` for posts saved before categories existed. |

### GET /api/lgu-posts/latest

Same auth, query and response as `refresh`, without `status` and `newPosts`,
and without checking Facebook: `{ "source": {…} | null, "posts": [...] }`.
Use it to re-read saved posts without triggering a check.

## Data freshness

Scheduled backend jobs (Asia/Manila time, when `CRON_ENABLED=true`) fill the
database; the API only reads it.

| Data | Updated |
| --- | --- |
| Traffic alerts (TomTom) | Every 15 minutes, 05:00–22:45 |
| Weather and weather alerts (WeatherAPI) | Hourly at :05 |
| SunStar / Cebu Daily News stories | Every 30 minutes |
| GNews stories | Every 3 hours |
| Daily briefs | 05:30 (and on first open) |
| Mayor's Facebook posts | On sign-in, at most every 10 minutes per page |
