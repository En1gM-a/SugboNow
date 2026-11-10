# Data Model

Database migrations are the executable source of truth. This file documents
notable columns that aren't self-explanatory from the migration alone.

## public.profiles

Added by `supabase/migrations/0002_add_profile_personalization_columns.sql`,
on top of the base columns from `0001_init_schema.sql`:

| Column | Type | Notes |
| --- | --- | --- |
| `first_name` | `text`, nullable | For personalized greetings; separate from `display_name`. |
| `city` | `text`, nullable | Home city; used to select which weather data applies to the user. |
| `address_text` | `text`, nullable | Free-text home address. Named to match `locations.address_text`. |
| `subscribed_mayor` | `text`, nullable | Stable slug (e.g. `cebu_city`), not a display name. Matches `lgu_sources.slug`; identifies whose official Facebook posts (`lgu_posts`) to surface. |
| `commute_origin_location_id` | `uuid`, nullable, FK → `locations(id)` | Typical commute start. References a saved place rather than storing its own lat/lng. |
| `commute_destination_location_id` | `uuid`, nullable, FK → `locations(id)` | Typical commute end. Same reasoning as origin. |

All six columns are nullable. Profile rows are created by the
`handle_new_user()` signup trigger, and the two commute columns can't be
populated until the user has saved at least one row in `public.locations`.

`first_name`, `city`, `address_text` and `subscribed_mayor` start from the
sign-up form: since `0006_save_signup_details_on_profile.sql`, the trigger reads
them from the auth metadata and saves a bad value as empty, so it never blocks a
sign-up. Read them from `profiles`, never from `user_metadata`, which doesn't
change when the user edits their Profile. See `docs/handoffs/signup.md`.

`0009_add_place_routes.sql` adds one more:

| Column | Type | Notes |
| --- | --- | --- |
| `allow_cclex` | `boolean`, not null, default `true` | Whether routes and leave times may use CCLEX, the toll expressway between Cordova and Cebu City. One setting for every trip; the Traffic page's "Use CCLEX" switch changes it. |

## public.lgu_sources

Created by `supabase/migrations/0003_add_lgu_posts.sql`, extended by
`0004_optimize_lgu_tables.sql`. One row per official LGU Facebook page that
ingestion follows.

| Column | Type | Notes |
| --- | --- | --- |
| `slug` | `text`, unique | Stable key such as `cebu_city` (lowercase letters, digits, `_`). Matches `profiles.subscribed_mayor`. |
| `display_name` | `text` | LGU name shown in the UI, e.g. "Lapu-Lapu City". |
| `official_name` | `text`, nullable | Current mayor or governor. |
| `official_title` | `text`, nullable | `mayor` or `governor`. |
| `lgu_type` | `text` | One of `city`, `municipality`, `province`. |
| `fb_page_url` | `text`, nullable, unique | Official page URL (`https://www.facebook.com/<handle>`). Never guessed. |
| `fb_page_id` | `text`, nullable, unique | Facebook's numeric page ID, once known. |
| `is_active` | `boolean` | Ingestion skips inactive sources. |
| `last_fetched_at` | `timestamptz`, nullable | Set by the ingestion job after each successful fetch. |
| `last_fetch_error` | `text`, nullable | Error from the most recent failed fetch; cleared on success. |

Current sources:

| Slug | Page | Official |
| --- | --- | --- |
| `cebu_city` | facebook.com/EngrNestorArchival | Mayor Nestor Archival |
| `lapu_lapu_city` | facebook.com/mayorcindichan | Mayor Cindi King Chan |
| `mandaue_city` | facebook.com/JonkieOuanoPH | Mayor Thadeo "Jonkie" Ouano |
| `cebu_province` | facebook.com/cebugovph (Provincial Government's official page) | Governor Pamela Baricuatro |

Talisay City was removed in `0004`: it is a component city of the Province of
Cebu, covered by `cebu_province`. Lapu-Lapu, Mandaue and Cebu City are
independent (highly urbanized) cities, so they have their own sources.

## public.lgu_posts

Created by `0003_add_lgu_posts.sql`, extended by `0004_optimize_lgu_tables.sql`.
One row per scraped post from an `lgu_sources` page, written only by backend
jobs using the service role. Signed-in users can read; there are no client
write policies. Only the page's own posts are stored — never comments,
commenter names, or other Facebook user data.

| Column | Type | Notes |
| --- | --- | --- |
| `source_id` | `uuid`, FK → `lgu_sources(id)` | Cascades on delete. |
| `fb_post_id` | `text` | Facebook's post ID. Unique together with `source_id`; used for upserts. |
| `permalink` | `text`, nullable | Direct link to the post. |
| `caption` | `text`, nullable | Post text as published. |
| `post_type` | `text` | `text`, `photo`, `video`, `album`, `link`, `shared`, `event`, or `other`. |
| `link_url` | `text`, nullable | Outbound link attached to the post. |
| `is_pinned` | `boolean` | Pinned posts sit at the top of a page; don't treat them as the newest. |
| `posted_at` | `timestamptz`, nullable | When Facebook says it was posted. |
| `first_seen_at` | `timestamptz` | When ingestion first saved it. |
| `fetched_at` | `timestamptz` | When ingestion last saw it on the page. |
| `edited_at` | `timestamptz`, nullable | Set when `content_hash` changes after the first fetch. |
| `deleted_at` | `timestamptz`, nullable | Set when a previously seen post disappears from the page. |
| `media` | `jsonb` array | Images and videos, shaped `{type: 'image' \| 'video', url, thumbnail_url, storage_path, width, height}`. Facebook media URLs expire; `storage_path` is for a copy in Supabase Storage. |
| `reaction_count`, `comment_count`, `share_count`, `view_count` | `integer`, nullable | Engagement counts at fetch time. Counts only, no comment content. |
| `content_hash` | `text`, nullable | Hash of the normalized caption and media; a change means the post was edited. |
| `category` | `text`, nullable | Set from the caption when the post is saved: `class_suspension`, `traffic`, `weather`, `utility` or `general`. |
| `raw` | `jsonb` | Original fetched payload, for reprocessing. Must not contain comments or commenter data. |

Indexes: `(source_id, posted_at desc) where deleted_at is null` for "latest
posts for this LGU", and `(category, posted_at desc) where category is not
null` for category lookups. `(source_id, fb_post_id)` is unique, which also
covers the foreign key.

Posts that announce a disruption (class suspension, flood, road closure,
brownout, …) are also saved as alerts with `source = 'facebook'`; see
`public.alerts` below.

## public.locations

`kind` was added by `0005_core_api_support.sql`:

| Column | Type | Notes |
| --- | --- | --- |
| `kind` | `text`, default `other` | `home`, `school`, `work` or `other`. The brief uses the `home` place to pick the weather area when the profile has no `city`. |

`profiles.city` holds an area slug (`cebu_city`, `mandaue_city`, `lapu_lapu_city`,
`talisay_city`, `consolacion`, `liloan`, `minglanilla`, `naga_city`, `cordova`),
defined in `backend/src/config/areas.ts` and listed by `GET /api/areas`.

## public.place_routes

Road routes between saved places, added by `0009_add_place_routes.sql`. The
`ingestRoutes` job (TomTom Routing) writes them with the service role; users can
only read the routes that start at one of their own places. `GET /api/routes`
serves them, and leave times use them.

| Column | Type | Notes |
| --- | --- | --- |
| `origin_location_id`, `destination_location_id` | `uuid`, FK → `locations(id)` on delete cascade | The pair. Deleting either place deletes its routes. |
| `allow_cclex` | `boolean` | `true`: the fastest route, which may use CCLEX. `false`: the fastest that avoids toll roads. Part of the primary key with the pair. |
| `origin_lat`, `origin_lng`, `destination_lat`, `destination_lng` | `double precision` | The places' coordinates when fetched. If a place moves, the API hides the route and the job fetches a new one. |
| `distance_m`, `travel_s` | `integer` | Road distance, and typical car time with historic traffic. |
| `uses_cclex` | `boolean` | Whether the route crosses CCLEX (a TomTom toll section). |
| `line` | `jsonb` | `[[lat, lng], …]` along the roads, at most 300 points. |
| `fetched_at` | `timestamptz` | Refetched after 7 days. |

Only pairs that a trip or a usual commute uses get routes. A route for a pair
that stops being used stays until either place is deleted; it costs no requests.

## public.alerts

Written only by backend jobs (service role); readable by signed-in users. An
alert is something that disrupts getting around Cebu, or a major event that can
lead to it. Ordinary news is stored here too, with `type = 'news'`, so
`/api/news` can list it, but it is never shown as an alert.

| Column | Notes |
| --- | --- |
| `source` | `tomtom`, `weatherapi`, `facebook`, `sunstar`, `cebudailynews`, `gnews` or `manual`. |
| `type` | `advisory` (class suspensions/advisories), `weather`, `flood`, `closure`, `traffic`, `power`, `water`, or `news` (not an alert). |
| `severity` | `low`, `medium` or `high`. Power and water interruptions are `low`, so they rank below class, weather and road alerts. |
| `lat`, `lng` | Where the alert applies; `null` for area-wide alerts (e.g. the province's page). News is placed at the centre of the first Metro Cebu area it names. |
| `area_name` | City or area name, used by the `area` filter. |
| `starts_at`, `ends_at` | Active window. News: publish time to publish time + 24–48 hours. Traffic: TomTom's times, extended while TomTom still reports the incident. |
| `image_url` | Added by `0005`. News or post image, when there is one. |
| `fingerprint` | Unique. `tomtom:<incident id>`, `weatherapi:rain:<area>:<date>`, `weatherapi:official:<hash>`, `facebook:<lgu>:<post id>`, and `news:<hash of the article URL>` for every news source, so one article is stored once whichever source sees it first. |
| `raw` | Small summary of the source data for debugging; never comments or personal data. |

Traffic and weather alerts are refreshed on every run (upsert updates the row);
news and Facebook alerts are kept as first saved.

**Kept for about a day** (`0008_delete_old_job_data.sql`): every 5 minutes,
Supabase Cron deletes rows that started over 24 hours ago and have ended. A
plain story ends 24 hours after it's published, so it goes then. An alert
still in effect, such as a road closure until Friday, stays until it ends.
`manual` rows are never deleted.

## public.weather_snapshots

Added by `0005_core_api_support.sql`. One row per Metro Cebu area, replaced
hourly by the weather job (WeatherAPI.com); readable by signed-in users.

| Column | Type | Notes |
| --- | --- | --- |
| `area_slug` | `text`, primary key | Area slug, same values as `profiles.city`. |
| `area_name`, `lat`, `lng` | | The area's name and the point polled. |
| `observed_at` | `timestamptz` | When the provider last updated the observation. |
| `current_conditions` | `jsonb` object | `{tempC, feelsLikeC, condition, iconUrl, isDay, humidity, windKph, precipMm, chanceOfRain}` |
| `hourly_forecast` | `jsonb` array | Current hour plus the next 24: `[{time, tempC, condition, iconUrl, chanceOfRain, precipMm, feelsLikeC, isDay, humidity, windKph}]`. The last four are saved since 2026-11-07. |
| `fetched_at` | `timestamptz` | When the job saved it. |

## public.regional_forecasts

Added by `0007_add_regional_forecasts.sql`. PAGASA's regional forecast, one row per
region (only `visayas` for now), replaced every 30 minutes by the PAGASA job; readable
by signed-in users. The same page's Cebu thunderstorm advisories go to `alerts`.

| Column | Type | Notes |
| --- | --- | --- |
| `region` | `text`, primary key | `visayas` |
| `issued_at` | `timestamptz` | When PAGASA issued the forecast. |
| `periods` | `jsonb` array | `[{part: 'night' \| 'day', description, minC, maxC, wind, direction, coastal}]`, in the page's order |
| `outlook_issued_at` | `timestamptz` | When PAGASA issued the extended outlook. |
| `outlook` | `jsonb` array | `[{day, minC, maxC, wind, direction, coastal}]`, usually 5 days |
| `rainfall_warning` | `text` | The heavy-rainfall warning, or `null` when none is issued. |
| `source_url` | `text` | The page read. |
| `fetched_at` | `timestamptz` | When the job saved it. |

## public.daily_briefs

One brief per user per Manila date (`unique (user_id, brief_date)`), written by
the 05:30 job for users with a trip that day, or on the user's first
`GET /api/brief/today` that day. `content` is the brief text; `alert_ids` are
the alerts near the user's places when it was written. Leave times are not
stored: the API recomputes them from current alerts on every request. Only
today's brief is kept: the same cleanup deletes briefs from earlier dates.
