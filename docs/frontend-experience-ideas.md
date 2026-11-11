# Frontend look and feel: ideas to try

A list of possible improvements to how SugboNow looks and feels. Nothing here is decided or scheduled. Each idea is small enough to try on its own branch and judge on a preview.

Functional gaps (password rules, map search, routes, the bell's pop-up, the dark map) are in `docs/future-improvements.md`. This file only points to them where they affect the look.

## How this was checked

- **What:** `main` at `fa1d25c` (after #68), run locally with sample data (`VITE_USE_MOCKS=true`), on 2026-11-12.
- **Pages:** the landing page, sign in, Today, News, Mayor, Weather, Traffic and Profile.
- **Sizes and modes:** 1440 × 900 and 375 × 812, in dark and light mode.
- **Conditions:** night, with rain, because that's what the clock and the sample weather gave.

**Not checked:** see the last section. In short: daytime and clear skies, anything that moves, onboarding, and real data.

## How to read each idea

- **Size:** S is under a day, M is a few days, L is a week or more.
- **Fits the spec:** it stays inside `docs/handoffs/frontend.md`.
- **Needs the team's OK:** it changes something that handoff decided (a token, a layout rule, a motion rule), or adds a dependency.
- **Needs the backend:** it needs an API or contract change first.

## The five to try first

These give the most for the least work:

1. A shorter header on phones (idea 1).
2. A brief that reads as a list, not a block of text (idea 6).
3. Compact news rows when a story has no picture (idea 10).
4. A map credit that doesn't cover the map on phones (idea 16).
5. A countdown on the next trip (idea 7).

## Every page

### 1. A shorter header on phones

- **Now:** at 375px wide the header is 158px tall: the title, then the place and date, then "Updated just now", then a row with the weather chip, the bell, the theme switch and the avatar. On News, the filter row sits under it, so the first story starts 265px down an 812px screen. A third of the screen is gone before any content.
- **Try:** one row for the title and the three round buttons, with the weather chip reduced to its icon and temperature. Put the place, the date and "Updated" on one small line under it. That would be about 90px.
- **Size:** S. **Fits the spec** if the contents stay the same; the handoff lists what the header holds, not its height.

### 2. The phone's status bar follows the sky

- **Now:** `index.html` sets one fixed `theme-color`, `#1A5DBF`, the midday blue. At night the browser bar is bright blue above a nearly black sky.
- **Try:** set `theme-color` to the sky's top color, from the same inline script that sets `data-time`, and update it when the sky changes.
- **Size:** S. **Fits the spec.**

### 3. An icon for the home screen

- **Now:** there's no web app manifest and no touch icon, so "Add to Home Screen" gives a blank or screenshot icon, and the app opens with the browser's bars.
- **Try:** a manifest with the logo mark as the icon, the app's name, and `display: standalone`. No service worker is needed for this part.
- **Size:** S. **Fits the spec.** Offline support would be a separate, larger idea.

### 4. Glass that looks more like glass

- **Now:** in dark mode the panels are 72% opaque over a dark sky, so they read as flat dark rectangles and the rain barely shows through. In light mode at night they read as flat grey slabs.
- **Try:** a thin lighter line along each panel's top edge, like light catching the rim, and test a slightly lower opacity in dark mode. Check text contrast again at every sky.
- **Size:** S to try, M to tune. **Needs the team's OK:** the handoff fixes the glass tokens and says the only shadow is `glass-shadow`.

### 5. A small buzz on taps (Android)

- **Now:** nothing uses `navigator.vibrate`.
- **Try:** a very short buzz when the tab changes, a switch flips, or a place or trip saves. Off in still mode. iPhones ignore it, so nothing breaks there.
- **Size:** S. **Needs the team's OK:** it's a new kind of feedback the handoff doesn't mention.

## Today

### 6. A brief that reads as a list

- **Now:** the brief is one block of plain text (`BriefCard` prints `content` as is). Trips and warnings are lines that start with "▪", all in the same weight. The leave times, which matter most, don't stand out.
- **Try:** split the text into lines in the frontend. Show the weather line with its live icon, each trip as a row with its leave time in bold tabular numbers, and each warning as a row that links to its alert. Keep "Read the full brief".
- **Size:** S in the frontend only. **Needs the backend** for the solid version, where the API returns the brief in parts instead of one string.

### 7. A countdown on the next trip

- **Now:** the hero says "Leave by 6:43 AM". How long that leaves is for the user to work out.
- **Try:** within an hour of leaving, add "in 23 min" beside it, on a number reel that ticks down each minute. Under 10 minutes, the chip turns mango. After the time passes, say "You should be on your way".
- **Size:** S to M. **Fits the spec:** reels and live values are already in the motion rules.

### 8. Something in the hero when the day's trips are over

- **Now:** after the last trip, the hero card says "No more trips today." and "Tomorrow's leave times are ready by 5:30 AM." in an otherwise empty dark card, the largest card on the page.
- **Try:** show tomorrow's first trip with its usual leave time, marked "usual, not today's". Or shrink the card and let the weather card move up.
- **Size:** S. **Fits the spec.**

### 9. "Updated" as a refresh button

- **Now:** "Updated just now" in the header is only text. To refresh, people reload the page.
- **Try:** make it a button that refetches the page's data, with the live dot sending out its ring when new data lands.
- **Size:** S. **Fits the spec.**

## News

### 10. Compact rows for stories with no picture

- **Now:** a story with no image gets a full-size gradient block, about 170px tall on a phone, with a small icon in the middle. On a phone, one such story fills the screen, and the block says nothing.
- **Try:** stories with a real image keep the large picture. Stories without one become a compact row: source, headline, two lines of summary, and the gradient as a small square at the side.
- **Size:** S to M. **Needs the team's OK** if the handoff's News page fixes the card's shape.

### 11. The first story larger than the rest

- **Now:** every story card has the same shape and weight.
- **Try:** the newest story that's tagged as an alert gets a wider picture and a larger headline. The rest follow in the compact form.
- **Size:** M. **Fits the spec:** the handoff asks for cards sized by their content.

## Mayor

### 12. A cover for each LGU

- **Now:** the cover is the same three stripes for every mayor (one `.cover` style).
- **Try:** keep the stripe idea, but change the order, angle or count per LGU, so Cebu City, Mandaue, Lapu-Lapu and the Province each look like their own page. No seals or official logos, as the handoff says.
- **Size:** S. **Fits the spec.**

### 13. Class suspensions that can't be missed

- **Now:** a class suspension is a normal post with a small mango "Class suspension" tag.
- **Try:** when today's newest post is a suspension, show one clear line above the feed: "Walay klase karon: all levels, public and private", with the post under it.
- **Size:** M. **Needs the backend** if the level and scope have to come from the API instead of the caption.

## Weather

### 14. The sky shows the hour you pick

- **Now:** picking an hour (#65) moves the strip, the chart and the rain map. The sky behind the page stays on the present. Only the landing page calls `controlSky`.
- **Try:** while an hour is selected, ease the sky to that hour's time of day and weather, and back to now when the page closes. Pick 3 PM tomorrow and the page turns to a bright afternoon.
- **Size:** S to M. **Needs the team's OK:** the handoff says the sky's time always comes from the device clock.

### 15. Rain as heavy as the forecast

- **Now:** the sky has two rain levels: rain and storm.
- **Try:** let the number of streaks follow the forecast, from a drizzle to a downpour.
- **Size:** M. **Needs the team's OK:** the handoff fixes the amounts at 65% and 100%.

## Traffic

### 16. A map credit that doesn't cover the map on phones

- **Now:** at 375px the credit ("© OpenStreetMap contributors · Traffic data © TomTom") wraps to three lines in a 190 × 54px box at the top of the map. It covered the Home pin in the check.
- **Try:** a shorter credit on small screens ("© OSM · TomTom"), or one small "i" button that opens it. Read OpenStreetMap's and TomTom's credit rules before choosing.
- **Size:** S. **Fits the spec** as long as the credit is still shown.

### 17. More map on phones

- **Now:** on a phone, the header and the tabs take the top 275px and the sheet starts at 528px. About 250px of map is visible.
- **Try:** on Traffic only, let the map fill the screen behind a compact header, with the sheet at three heights: a peek with the leave time, half, and full.
- **Size:** M to L. **Needs the team's OK:** it changes the page's layout on phones.

### 18. A legend people can read

- **Now:** the legend (High, Medium, Low, and the note about the dashed line) is one 12px line under the map, at the fold on a laptop.
- **Try:** put it inside the map, in a corner, as three labeled dots.
- **Size:** S. **Fits the spec.** The dashed-line note goes away with #67's review.

### 19. The dark map

- **Now:** dark mode flips the light map's colors, which turns it muddy brown and green.
- **Try:** see item 8 in `docs/future-improvements.md`, which already lists the choices.

## Profile

### 20. See the change before saving

- **Now:** Profile is a plain form.
- **Try:** a small preview beside the form: the greeting as it will read ("Maayong buntag, Thea") and, when the home city changes, that city's weather chip.
- **Size:** S to M. **Fits the spec.**

### 21. Saved places on a small map

- **Now:** saved places are a list. A map only appears while adding or editing one.
- **Try:** a small map above the list with a pin for each place, which highlights as you hover or tap a row, the same way Traffic does.
- **Size:** M. **Fits the spec.**

## The landing page and sign in

### 22. Sign in gets to the form sooner

- **Now:** `/login` repeats the landing page's headline, lede and example strip beside the form. The landing page at `/` now makes that pitch in full.
- **Try:** on `/login` and `/signup`, keep one short line and the form. Returning users are there to sign in.
- **Size:** S to M. **Needs the team's OK:** the handoff describes this page's left side.

### 23. Photos behind the landing page

- **Now:** PR 69 is an open sample that replaces the landing page's sky with photos of Cebu.
- **Try:** nothing new here. The team's decision on that PR settles it.

## Loading and waiting

### 24. The last visit's data on screen at once

- **Now:** a reload starts every page from skeletons.
- **Try:** save the query cache in the browser, so a repeat visit shows the last data at once with "Updated 12 min ago", then refreshes. Clear it on sign-out.
- **Size:** M. **Needs the team's OK:** it needs a new dependency, which the handoff already says to ask about.

### 25. A line when the phone is offline

- **Now:** with no connection, requests fail and each card shows its own error.
- **Try:** one quiet line under the header: "You're offline. Showing what we had at 6:12 AM."
- **Size:** S on its own, M together with idea 24.

## Not checked

These need another look before anyone relies on this list:

- **Daytime and clear weather.** Everything was seen at night in the rain. Text on the sky and the light glass need checking at midday with a clear sky.
- **Motion.** The entrances, the jeepney ride, the reels and the page transitions were not judged. The tool used for these checks runs the sky too slowly to tell.
- **Onboarding (`/welcome`) and the new-password page.**
- **Real data.** Real headlines, real post photos and real captions will fit differently from the samples.
- **Tablet width (768px), Firefox and Safari.**
- **Loading and error states,** beyond reading their code.
