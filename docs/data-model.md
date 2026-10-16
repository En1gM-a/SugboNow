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
| `category` | `text`, nullable | Set later by classification, e.g. `class_suspension`, `traffic`, `weather`, `utility`, `event`, `general`. |
| `raw` | `jsonb` | Original fetched payload, for reprocessing. Must not contain comments or commenter data. |

Indexes: `(source_id, posted_at desc) where deleted_at is null` for "latest
posts for this LGU", and `(category, posted_at desc) where category is not
null` for category lookups. `(source_id, fb_post_id)` is unique, which also
covers the foreign key.
