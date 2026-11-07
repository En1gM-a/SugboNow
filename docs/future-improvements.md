# Future improvements

None of these is scheduled yet. They were waiting on the frontend stack (#45 to #49), which landed on 2026-11-06. Each item says what was asked for, what the code does today, and what to settle first.

The code references were checked on 2026-11-06 against `main`, after #49 landed.

## 1. Password rules at sign-up

**Asked for:** show the password rules at sign-up (length, which characters and so on), with a checkmark beside each rule once it's met.

**Today:** the sign-up form (`frontend/src/pages/HomePage.tsx`) and the new-password screen (`frontend/src/pages/ResetPasswordPage.tsx`, added in #48) only check for 8 or more characters.

**Settle first:**
- The checklist must match what Supabase enforces in its password settings (minimum length and required characters). Otherwise a password can pass the checklist and still be refused.
- Use the same checklist on both screens.

## 2. Map zoom and place search

**Asked for:**
- Every map zooms with the scroll wheel.
- Users can type an address or a place and the map moves there, so they don't have to pan around the whole map to find it.

**Today:** there are three maps: Traffic, Weather's rain map, and the pin picker on Welcome and Profile. They all use `useMapOptions()` in `frontend/src/components/map/maps.tsx`, which sets `scrollWheelZoom: false`. None of them has a search.

**Settle first:**
- **Scroll trap:** scroll zoom can trap page scrolling while the pointer is over a map. Common fixes are zooming with Ctrl or ⌘ plus scroll (with a short hint), or zooming only after the map has been clicked.
- **A first search with no outside service:** `GET /api/areas` already returns each town's name and coordinates, so a search box can jump the map to a town. Streets, barangays and landmarks need a geocoding service.
- **A geocoding service needs a decision:**
  - The docs disagree: `docs/handoffs/signup.md` says the browser must not call one, while `docs/api-contract.md` says the frontend geocodes addresses.
  - CLAUDE.md needs the team's agreement for any new call to an outside service that a user triggers.
  - The provider must be free with no card.
  - Results should stay inside the Cebu box from item 5.

## 3. Side panel labels

**Asked for:** hovering an icon in the side panel shows a label saying what it is, styled to match the theme.

**Today:** the rail's buttons only have a browser `title` (`frontend/src/components/layout/AppShell.tsx`). It shows late and can't follow the theme.

**Notes:**
- Show the label on keyboard focus too, not only on hover.
- Only the desktop rail needs it. The phone tab bar already shows labels.

## 4. Current time

**Asked for:** show what time it is now.

**Suggested:** a plain digital time beside the date in the page header, in Manila time, updating once a minute. It reads directly against "Leave by 6:43 AM". A clock face was the other option.

## 5. Keep the maps on Cebu

**Asked for:** if possible, the maps only show Cebu. This covers picking an address and the Traffic map. If it isn't possible, keep the maps as they are.

**It's possible:**
- Leaflet can keep a map inside a box (`maxBounds`, with `maxBoundsViscosity: 1` for a hard edge) and stop it zooming out past that box (`minZoom`).
- All three maps use `useMapOptions()`, so one change covers them.

**Settle first:**
- **Which box:**
  - The app covers Metro Cebu today: the 9 towns in `backend/src/config/areas.ts`, and `METRO_CEBU_BBOX` in `backend/src/integrations/tomtom.ts`, the box the TomTom job uses.
  - Saved places such as work or school can be outside Metro Cebu. The whole province, including Bantayan and Camotes, may be the safer box.
- **Greying out the rest:** shading everything outside Cebu needs Cebu's outline as a shape file, which the repo doesn't have. The box is the simple version.
- **The API:** it accepts a place anywhere in the world (`backend/src/schemas/location.schema.ts`). If places must be in Cebu, the API should reject points outside the box too, because a check in the browser can be skipped. Add the rule to `docs/api-contract.md` first.

## 6. A city to follow, not a home city

**Asked for:** sign-up and Profile ask for a "Home city" from a short list. Ask which city to follow instead, or similar wording, so people don't have to live in one of the listed towns.

**Today:**
- **The list:** it's the 9 towns in `backend/src/config/areas.ts`, the only towns the app collects weather for.
  - `PATCH /api/profile` refuses any other city.
  - The sign-up trigger (`supabase/migrations/0006_save_signup_details_on_profile.sql`) leaves any other city empty.
- **What the city does:** it only picks the weather and the sky. Class suspensions come from the separate "Mayor to follow" field.
- **The result:** someone who lives elsewhere, in Danao, Carcar or Toledo for example, has to pick a town they don't live in.

**Settle first:**
- **New wording only, or more towns too:**
  - **Wording only:** this is a frontend change to the label and hint on sign-up step 2 (`frontend/src/pages/HomePage.tsx`) and on Profile (`frontend/src/pages/ProfilePage.tsx`). The saved value stays the same, so the API and the database don't change. "City to follow" would match "Mayor to follow".
  - **More towns:** the app has to collect weather for them too:
    - Add them to `areas.ts` and to the copy in `frontend/src/lib/signupOptions.ts`.
    - Add them to the trigger's city list, in a new migration (`0006` is already applied).
    - Add them to the area list in `docs/api-contract.md`.
    - The quota allows it: each town uses about 720 WeatherAPI calls a month, out of the free 100,000 (`docs/data-sources.md`).
    - This is the same choice as item 5: Metro Cebu or the whole province.
- **The step's title:** step 2 is called "Where you live" ("Asa ka nagpuyo?"), and its address is the home address. With a city to follow, home and that city can be in different towns, so the title and the line under it need new wording.
- **One city or several:** following more than one city would turn the profile's `city` into a list. That's a database and API change.
