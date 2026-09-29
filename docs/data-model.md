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
| `subscribed_mayor` | `text`, nullable | Stable slug (e.g. `cebu_city`), not a display name. Identifies whose scraped Facebook advisories to surface — filters `alerts` sourced from a specific local official's page. |
| `commute_origin_location_id` | `uuid`, nullable, FK → `locations(id)` | Typical commute start. References a saved place rather than storing its own lat/lng. |
| `commute_destination_location_id` | `uuid`, nullable, FK → `locations(id)` | Typical commute end. Same reasoning as origin. |

All six columns are nullable. Profile rows are created by the
`handle_new_user()` signup trigger before the user has entered any of this
data, and the two commute columns can't be populated until the user has
saved at least one row in `public.locations`.
