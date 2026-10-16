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
`handle_new_user()` signup trigger before the user has entered any of this
data, and the two commute columns can't be populated until the user has
saved at least one row in `public.locations`.

## public.lgu_sources

Added by `supabase/migrations/0003_add_lgu_posts.sql`. One row per official
LGU or mayor Facebook page that ingestion follows. The migration seeds the
initial rows; only Cebu City's page URL is confirmed so far.

| Column | Type | Notes |
| --- | --- | --- |
| `slug` | `text`, unique | Stable key such as `cebu_city`. Matches `profiles.subscribed_mayor`. |
| `display_name` | `text` | LGU name shown in the UI, e.g. "Lapu-Lapu City". |
| `official_name` | `text`, nullable | Current mayor or governor. Null until confirmed. |
| `lgu_type` | `text` | One of `city`, `municipality`, `province`. |
| `fb_page_url` | `text`, nullable | Official page URL. Null until confirmed; never guessed. |
| `fb_page_id` | `text`, nullable | Facebook's numeric page ID, once known. |
| `is_active` | `boolean` | Ingestion skips inactive sources. |
| `last_fetched_at` | `timestamptz`, nullable | Set by the ingestion job after each fetch. |

## public.lgu_posts

Added by `0003_add_lgu_posts.sql`. One row per post from an `lgu_sources`
page, written only by backend jobs using the service role. Signed-in users can
read; there are no client write policies. Only the page's own posts are
stored — never comments, commenter names, or other Facebook user data.

| Column | Type | Notes |
| --- | --- | --- |
| `source_id` | `uuid`, FK → `lgu_sources(id)` | Cascades on delete. |
| `fb_post_id` | `text` | Facebook's post ID. Unique together with `source_id`; used for upserts. |
| `permalink` | `text`, nullable | Direct link to the post. |
| `caption` | `text`, nullable | Post text as published. |
| `posted_at` | `timestamptz`, nullable | When Facebook says it was posted. |
| `fetched_at` | `timestamptz` | When ingestion last fetched it. |
| `media` | `jsonb` array | Items shaped `{type: 'image' \| 'video', url, thumbnail_url, storage_path, width, height}`. Facebook media URLs expire; `storage_path` is reserved for a later copy into Supabase Storage. |
| `reaction_count`, `comment_count`, `share_count` | `integer`, nullable | Engagement counts at fetch time. Counts only, no comment content. |
| `content_hash` | `text`, nullable | Hash of the normalized caption and media; a change means the post was edited. |
| `category` | `text`, nullable | Set later by classification, e.g. `class_suspension`, `traffic`, `weather`, `utility`, `event`, `general`. |

Indexes: `(source_id, posted_at desc)` for "latest posts for this LGU", and
`category`.
