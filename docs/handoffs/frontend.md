# Frontend handoff: pages, layout, design system, motion and performance

- **For:** the frontend team (@gnthril, @Tiamporado) and their AI coding agents
- **From:** @En1gM-a, updated November 2026
- **State:** the backend API is finished (PR #25); the frontend is still the scaffold. The first full build (PR #27) was closed: it had the right content on every page, but the pages were cluttered and the look felt generic. This version sets the new design, "Glass": a live Cebu sky behind glass panels.
- **See it working:** open [`frontend-sample.html`](frontend-sample.html) in a browser. It shows the look, colors and motion on sample data and calls no APIs.

This is the spec for SugboNow's frontend: what every page contains, how each page is laid out, the design system, the performance budget, and the motion and scrolling rules. The API is done, so every page can be built now on mock data (`VITE_USE_MOCKS=true`) and switched to the real API later.

## How to use it

**With an AI agent.** Pull `main`, open the repo in Claude Code (or another coding agent) and say:

> Read docs/handoffs/frontend.md and follow the prompt in it.

Or paste the prompt below directly. It is written for Claude Code and works with other agents too.

**Design skills.** The first time, the agent sets up three design skills in your own user folder:
[UI UX Pro Max](https://uupm.cc), [Impeccable](https://github.com/pbakaus/impeccable) and
[Motion](https://motion.dev). It installs the first two itself. For Motion, it asks you to run one command,
because Motion's installer needs a terminal. It also asks you whenever it can't run an installer. Nothing in
the repo changes. After that, it uses all three on every frontend task, even if you forget to ask. `CLAUDE.md`
repeats this rule, so it also applies in later sessions that never open this file.

**Reading it yourself.** The prompt doubles as the spec: what each page contains and how it's arranged is in
`<pages>`, the shared app layout in `<layout>`, how it should feel to use in `<interaction>`, colors and type in
`<design_system>`, icons in `<icons>`, speed rules in `<performance>`, animation (including the jeepney sign-in
and sign-up transition) in `<motion>` and scrolling in `<scrolling>`. When they clash, accessibility comes first,
then the speed targets, then looks. The speed targets are a budget, not a ban: a rich effect is fine when it stays
inside them and has a fallback.

## What changed after PR 27

- **PR 27's content is the checklist.** Everything it showed on each page belongs in the app; each page in
  `<pages>` lists it under "Content". Its data layer (types, hooks, mocks) may be reused. Its look may not.
- **Less on each screen.** Every page has one main job. Details wait behind "Read more", tabs, sheets or another
  page, and lists stop at about five items.
- **The Glass look.** A live Cebu sky that follows the time of day and the weather, with glass panels floating on
  it. Light and dark modes, with a switch that spreads out from the button.
- **Cebu colors.** Mango is the accent, with Sinulog red for urgent alerts and azure blue for links. One font:
  Plus Jakarta Sans.
- **A home page with the login beside it.** Sign in and sign up are two forms in one card on the home page, not
  separate pages.
- **The jeepney.** It appears only when you press the button, then drives off. Its cartoon exhaust fills the card
  when you switch forms, and the whole screen when you log in.
- **Motion with character.** The first time a page opens, words rise, numbers roll and count up, and charts draw
  themselves.
- **One icon system.** Icons that show a condition (weather, alert types) are flat cartoon drawings that loop on
  one shared beat. Navigation and buttons use still line icons. The bell rings only when a new alert arrives.
- **Speed rules relaxed, not dropped.** The Lighthouse targets stay. Glass, one web font and longer animations are
  now allowed, with a Lite mode for weak phones and a "Reduce animations" switch.

Related: data shapes are in [`docs/api-contract.md`](../api-contract.md), and the design skills are described
in [`docs/claude-code-skills.md`](../claude-code-skills.md). This is not
[`docs/claude-handoff.md`](../claude-handoff.md), which is a tool that moves a long Claude Code session into a
fresh one.

## The prompt

~~~text
<role>
You are a senior frontend engineer and product designer working on SugboNow, a Cebu daily-intelligence web app. You build fast, accessible, mobile-first React interfaces with real character, which people trust at first sight.
</role>

<context>
- Stack (already set up in frontend/): React 19 + TypeScript (strict) + Vite, Tailwind CSS v4 (@tailwindcss/vite), React Router (data router), TanStack Query, Supabase Auth, Leaflet + react-leaflet, MSW.
- Existing files: src/lib/apiClient.ts (sends the Supabase token), src/lib/supabaseClient.ts, src/hooks/useLguPosts.ts, src/types/api.ts (only LGU post types so far), src/main.tsx (QueryClientProvider already wired). Empty stubs to fill in: src/context/AuthContext.tsx, src/mocks/handlers.ts, src/mocks/browser.ts, src/utils/format.ts. App.tsx is a placeholder.
- public/mockServiceWorker.js is from MSW 2.15.0, but the msw package is now 3.x. Regenerate it before wiring mocks (inside frontend/: `npx msw init public/ --save`) and use the MSW 3 API.
- The backend API is finished. Every endpoint and JSON shape is in docs/api-contract.md. Read it before building any page; it is the only source of truth for data.
- Design reference: docs/handoffs/frontend-sample.html is a working sample of this design (plain HTML with Motion from a CDN, sample data, no API calls). Open it in a browser to see the target, and read its code wherever this prompt names one of its functions. Rebuild that behavior in React; don't import or copy the file as it is. When the sample and this prompt differ, this prompt wins: the sample shows the look and the motion, while <pages> decides what each page contains. These parts of the sample are not part of the app: the "Preview" bar at the top (Time, Weather, Lite mode, Replay intro, New alert, All icons), the read-only inputs, the placeholder text and "Trending in Cebu".
- A first build, PR #27 (closed; branch frontend/sinulog-ui), had the right content on every page; <pages> lists that content under "Content" for each page. Its layout and look were rejected: don't copy its card grid, fonts, colors or page structure. You may reuse its data layer after checking it against docs/api-contract.md: src/types/api.ts, src/lib/apiClient.ts, src/lib/queries.ts, the hooks in src/hooks/, src/context/AuthContext.tsx, and the MSW handlers and fixtures in src/mocks/. Read them with `git fetch origin frontend/sinulog-ui` and `git show origin/frontend/sinulog-ui:frontend/<path>`.
- Design skills: set up and use ui-ux-pro-max, impeccable and motion as described in <skills>, before anything else.
</context>

<glossary>
These words mean exactly this everywhere in this prompt:
- Sky: the animated canvas fixed behind the whole app.
- Glass panel: a translucent, blurred surface floating on the sky.
- Dark glass: the darker version of a glass panel, used for the nav rail, the hero card on Today and the example strip on the home page.
- Home page: the signed-out page at /login and /signup: hero copy on the left, the auth card on the right.
- Auth card: the one glass card that holds both the sign-in form and the sign-up form.
- Jeepney ride: the transition in <motion> where a jeepney pulls in, drives off and its exhaust covers the auth card or the whole screen.
- Live icon: a flat cartoon icon that shows a condition, such as the weather or an alert type (see <icons>).
- Control icon: a still Phosphor line icon, used for navigation and buttons (see <icons>).
- Beat: 1.6 s. Every live icon loop lasts ½, 1, 2 or 4 beats.
- First open: the first time a page opens since the user signed in. Later visits to that page are not first opens.
- Lite mode: cheaper visuals for weak phones (see <performance>).
- Still mode: no movement. It's on when the device asks for reduced motion or when the user turns on "Reduce animations" in Profile.
- Mock for now: the API doesn't provide this yet, so it uses mock data.
</glossary>

<rules>
- Only create or edit files inside frontend/. NEVER change backend/, supabase/, docs/, .github/ or root config.
- The browser MUST NOT call outside data sources (news sites, PAGASA, TomTom, Facebook, Google Maps). All data comes from the SugboNow API (/api/...) via TanStack Query hooks in src/hooks/. Only exceptions: Supabase Auth, OpenStreetMap map tiles (with attribution), and showing the image URLs the API returns (news thumbnails, Facebook post media) in <img> tags.
- Fonts and libraries come from npm, never from a CDN. The sample uses CDNs only because it's a single standalone file.
- Data access lives in hooks, never directly in components.
- Add the missing TypeScript types to src/types/api.ts, mirroring docs/api-contract.md exactly.
- Build MSW handlers and fixtures (src/mocks/handlers.ts, src/mocks/data/) matching the contract, so every page works with VITE_USE_MOCKS=true. Where the API doesn't offer something yet (marked "mock for now" below), design it with mock data only.
- Motion (formerly Framer Motion) is pre-approved: add it with `npm --prefix frontend install motion` on your first branch, and import from `motion/react` and `motion/react-m`. Never install or import `framer-motion`.
- The font is pre-approved: add it with `npm --prefix frontend install @fontsource-variable/plus-jakarta-sans` on your first branch.
- Installing the three skills in <skills> is pre-approved. They go in your user folder (~/.claude/skills), not the project, and they are not dependencies of frontend/.
- Stop and ask before adding any OTHER npm dependency (e.g. an icon package, a chart library, a query-cache persister), touching anything outside frontend/, or pushing or opening a PR.
- Work on one branch per chunk (e.g. frontend/design-system, frontend/home-page, frontend/today).
</rules>

<skills>
Three design skills are required for all frontend work:
- ui-ux-pro-max (https://uupm.cc): design-system search, UX rules and the pre-delivery checklist.
- impeccable (https://github.com/pbakaus/impeccable): critique, audit and polish, plus a detector for generic "AI-looking" UI.
- motion (https://motion.dev): animation and animation-performance rules.

Setup, first thing in the session (pre-approved, don't ask):
1. Check your available skills and skip any you already have from your user folder or a plugin. The repo's .claude/skills/ui-ux-pro-max is an old copy, so install the current one anyway unless ~/.claude/skills/ui-ux-pro-max already exists.
2. Install what's missing at user level, so nothing in the repo changes:
   - ui-ux-pro-max: `npx --yes -p ui-ux-pro-max-cli uipro init --ai claude --global`
   - impeccable: `npx --yes impeccable install --providers=claude --scope=global --yes`. This also adds Impeccable's design hook, which checks every UI file you edit.
   - motion: its installer only runs in an interactive terminal, so you can't run it. Ask the user to run `npx motion-ai` in their own terminal and choose Global, then Claude Code. It also adds Motion's free docs-search server.
3. ui-ux-pro-max's search scripts need Python 3. If `python --version` fails, ask the user to install Python; don't install it yourself.
4. New skills usually appear right away. If one doesn't, ask the user to run /reload-skills or start a new session.
5. If you can't run an installer (it needs a terminal, your permissions block it, or it fails), ask the user to run that command in their own terminal. Carry on with the rules in this prompt until they have.

On every frontend task, invoke all three skills before you design, build, review or fix anything in frontend/, even if the user doesn't mention them. This is the step people forget, so never wait to be asked.
- ui-ux-pro-max: design decisions, UX checks and its pre-delivery checklist, adapted to React + Tailwind.
- impeccable: critique and polish your pages, and scan each finished page with its detector while the dev server runs (`npx --yes impeccable detect http://localhost:5173/<route>`). Don't run its init or document commands, and don't create PRODUCT.md or DESIGN.md: this prompt is the product and design brief.
- motion: anything that moves.
When a skill disagrees with this prompt, this prompt wins. The <layout>, <design_system>, <icons>, <performance>, <motion> and <scrolling> rules are decided. The skills warn against glass, endless icon loops and long animations in general; here they are deliberate choices, within the limits this prompt sets. Don't let a skill change the palette, the fonts, the layout or these animations, or add effects that break the performance budget.
</skills>

<layout>
SugboNow is a tool people check several times a day, often on a phone on the way somewhere. Every screen answers one question, and everything else waits behind a tap.

Hierarchy on every screen:
- One primary element: the answer to the page's question (e.g. "Leave by 6:55 AM"). It is the largest and comes first.
- A few secondary items, each readable at a glance.
- Everything else behind progressive disclosure: "Read more", tabs, a bottom sheet, or another page. Never show every detail at once.
- About five items per list before "See all" or "Show more".
- One primary button per screen; other actions are text or icon buttons.

The signed-out home page has its own layout: see page 1 in <pages>.

App shell for signed-in pages. Everything floats on the sky, and nothing touches the screen edge:
- Header (all sizes): a glass panel at the top of the content column, radius 22px, padding 14px 16px. Left: the page title (h1) and, under it, the location, the date and "Updated 2 min ago". On Today, the title is the greeting. Right: the weather chip (still live icon, temperature, one-word condition; links to /weather), the bell (see <icons>), the theme switch and the avatar (opens /profile). It scrolls away with the page.
- Phones and tablets (< 1024px): a floating glass tab bar, fixed 10px above the bottom edge plus env(safe-area-inset-bottom) and 12px from the sides, radius 24px, padding 6px. 5 tabs: Today, News, Mayor, Weather, Traffic, each a control icon above a label, at least 52px tall. A mango pill sits behind the active tab. Page padding: 16px 12px 110px.
- Desktop (≥ 1024px): a floating dark glass nav rail, fixed 16px from the left edge and vertically centered, fully rounded, padding 12px 8px. From top to bottom: the logo mark, the 5 tabs as 48px round icon buttons (control icons with an aria-label and a title), a thin divider and a Sign out button. A mango circle sits behind the active tab. Page padding: 18px 18px 28px 104px.
- Content: a centered column, max-width 1200px, with a 14px gap between rows. From 720px it's a 12-column grid (gap 14px); below 720px it's one column.
- The tab bar, the nav rail and everything else in the shell stay still. There are only three exceptions: the pill slides when the tab changes (see <motion>), the bell rings on a new alert, and the live dot sends out one ring on new data (see <icons>).
- Side column: on feed and map pages, the main content takes 8 columns and the side column 4. It's position: sticky on desktop, and it moves below the main content under 720px.
- "Right now" glance (side column, on every page except Today): the next leave time, the current weather with the rain chance, and the number of high-severity alerts near the user's places, each linking to its page. Today doesn't show it, because Today is that content.
- Feed pages (News, Mayor): the main column is a single column of post cards.
- Map pages (Traffic, Weather's rain map): the map sits in a glass card in the main column, with its list in the side column on desktop and in a bottom sheet on phones.
- Today has no side column: it uses its own grid (see <pages>).
- Settings-style pages (Profile): the sections are listed in the side column on the left on desktop (4 columns) with the selected section beside them (8 columns); phones show the list first and open each section as its own screen.
</layout>

<interaction>
The app should feel alive to the touch without slowing anything down.
- Every tap answers within 100 ms: press states on buttons, rows and cards (CSS), and the tab pill moves at once. Cached data and optimistic updates mean a new screen never waits on the network.
- Details open in place: expanders for the brief, trip reasons and long captions; on phones, bottom sheets for alert details, filters and the area picker. No modal dialogs for these.
- Map and list stay in sync on Traffic and Weather: tapping a row highlights its marker, and tapping a marker highlights its row.
- Following a mayor, saving a place or a trip updates the screen first, then confirms with a toast that has Undo.
- Live data shows that it's live: "Updated 2 min ago", the live dot in the header, values that roll when they change, the bell, and "New stories" or "New alerts" pills.
- Use the browser's own pull-to-refresh; don't build a custom one.
</interaction>

<design_system>
Direction: Glass on a live Cebu sky. An everyday tool for Cebuanos: the sky is what makes it unmistakably SugboNow, glass panels keep the information readable on top of it, and small cartoon touches (the jeepney, its smoke, the live icons) give it a friendly local character. It must look clearly different from our school's colors (CIT-U maroon and gold): never a two-tone maroon-and-gold look.

Color tokens (define them as CSS variables in src/index.css, with the dark values under :root[data-mode="dark"], and map them to Tailwind with @theme):
| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| ink | #0E1726 | #EEF3FA | Text on glass panels |
| muted | #465467 | #B3BFCE | Secondary text on glass panels |
| line | rgba(14,23,38,.10) | rgba(255,255,255,.10) | Hairlines and input borders |
| chip | rgba(14,23,38,.06) | rgba(255,255,255,.08) | Inputs, chips, icon buttons, the track of a segmented control |
| glass | rgba(255,255,255,.74) | rgba(9,14,28,.72) | Glass panel background |
| glass-line | rgba(255,255,255,.72) | rgba(255,255,255,.10) | Glass panel border (1px) |
| glass-shadow | 0 12px 32px -14px rgba(14,23,38,.35) | 0 12px 32px -14px rgba(0,0,0,.7) | Glass panel shadow |
| glass-solid | #F4F7FB | #111A2B | Glass panels in Lite mode and under reduced transparency |
| night | rgba(9,14,28,.74) | rgba(3,6,14,.8) | Dark glass background. Its text is #EEF3FA in both modes, and secondary text is #C8D5E6 |
| night-line | rgba(255,255,255,.10) | rgba(255,255,255,.10) | Dark glass border (1px) |
| blue | #1E5AA8 | #8DB8FF | Links and text buttons |
| mango | #FFC233 | #FFC233 | Primary buttons, active pills, tags, highlights. Text on mango is always #0E1726 (11.1:1) |
| on-sky | #EEF3FA | #EEF3FA | Secondary text directly on the sky (home page only). Headings there are #FFFFFF |
| status-high | #C8102E | #C8102E | Severity high, the bell's badge (white text 5.9:1) |
| status-medium | #B45309 | #B45309 | Severity medium (white text 5.0:1) |
| status-low | #0E7C74 | #0E7C74 | Severity low, success and "all clear" (white text 5.0:1) |
| puff | #F7F9FC | #5A6983 | Jeepney smoke: fill |
| puff-shade | #CCD7E6 | #414E66 | Jeepney smoke: hard shade |
| puff-line | #0E1726 | #0A0F1C | Jeepney smoke: outline |
When the sky is dark and the mode is light, raise the light glass so text keeps its contrast: :root[data-mode="light"][data-tone="dark"] sets glass to rgba(255,255,255,.86) and glass-line to rgba(255,255,255,.5). The sky sets data-tone="dark" when its middle color's luminance is under 0.42.

Where the color goes: mango is the only accent; use it for the one thing that needs attention, such as the primary button, the active pill or the delay chip. Red only means high severity. Don't introduce other accent colors, and keep teal and purple out of every gradient.

Gradients: only the sky, the logo mark, the rain bars and image placeholders. No gradient text.
- Logo mark: a 22px circle, background linear-gradient(180deg, #FFC233 0 52%, #2F7BE0 52% 100%), with inset 0 0 0 2px rgba(255,255,255,.85). It stands for the sun over the sea. Next to it, "SugboNow" in weight 800.
- Image placeholders: linear-gradient(135deg, #1E5AA8, #5AA2F5), (135deg, #B45309, #FFC233), (135deg, #0E7C74, #3FB8A8) or (135deg, #14213D, #2F4E8A), with a white control icon in the middle.
- Rain bars: linear-gradient(180deg, #5AA2F5, #1E5AA8).
- Mayor cover art: navy #14213D with three diagonal stripes in #C8102E, #FFC233 and #2F7BE0 (see .cover in the sample).

The sky (src/components/Sky.tsx; rebuild `sky` from the sample, which has every exact value):
- One <canvas> behind the app (position: fixed, z-index: -1), with no React state in its drawing loop. It's a vertical gradient with stops at 0%, 55% and 100%, chosen by the time in Asia/Manila:
  | Name | Time | Top | Middle | Bottom |
  | buntag | 05:00–09:59 | #2B5296 | #7FA6E0 | #FFDCA0 |
  | udto | 10:00–15:59 | #1A5DBF | #4E9BEA | #BFE3FF |
  | hapon | 16:00–18:29 | #22468F | #6C8ED6 | #FFC774 |
  | gabii | 18:30–04:59 | #060B1C | #0D1C42 | #1E3A6E |
- Weather blends each stop toward these colors (at gabii, use 45% of the amount):
  | Weather | Top | Middle | Bottom | Amount |
  | clear | none | none | none | 0% |
  | cloudy | #5A7090 | #8EA3BE | #C9D5E3 | 35% |
  | rain | #334155 | #4B5A6E | #6E7E92 | 60% |
  | storm | #151B26 | #232D3B | #36424F | 82% |
- Layers, back to front: gradient, stars (gabii only), sun or moon with a soft glow (the disc fades as the weather worsens), drifting clouds (3 clear, 9 cloudy, 10 rain, 12 storm), rain streaks (none, none, 65%, 100% of the maximum), small drops beading on the "glass" when it rains, and lightning (storm only).
- Lightning: one flash and one bolt at most every 4.2–8.2 s, with the flash at no more than 28% opacity. Never faster or brighter, for people sensitive to flashing.
- Changes in time or weather ease in over about a second (the sample's 1 - exp(-dt * 2.2)), never a jump.
- What drives it: time always comes from the device clock in Asia/Manila. Signed out, the weather is clear, because /api/weather needs a token and the browser may not call outside sources. Signed in, the weather comes from GET /api/weather/:area for the user's home city, using the icon number table in <icons>: clear → clear; partly cloudy, cloudy and fog → cloudy; rain → rain; thunderstorm → storm. If the city or the weather isn't available, use clear.
- Pause it when the tab is hidden. In still mode draw one frame and redraw only when the time or weather changes. See <performance> for Lite mode.

Glass surfaces:
- Glass panel: background glass, backdrop-filter blur(18px) saturate(1.5), 1px solid glass-line, box-shadow glass-shadow.
- Dark glass: background night, backdrop-filter blur(18px) saturate(1.3), 1px solid night-line.
- Lite mode and prefers-reduced-transparency: no backdrop-filter. Glass panels use glass-solid and dark glass uses #0D1526.
- Never put a glass panel inside a glass panel. Inside a panel, use chip for fills and line for dividers.
- At most one large dark glass card per page (the hero on Today); dark glass is otherwise only for the nav rail and the home page's example strip.

Modes: data-mode="light" or "dark" on <html>. The first default is dark if the device prefers dark or the time is gabii, otherwise light. The user's choice from the theme switch is saved in localStorage and wins from then on.

Typography: one family, Plus Jakarta Sans (variable, weights 400 to 800), self-hosted through @fontsource-variable/plus-jakarta-sans: font-family: "Plus Jakarta Sans Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif.
| Use | Size | Weight | Line height | Tracking |
| Home page headline | clamp(2.3rem, 5.6vw, 4.2rem), max-width 13ch, text-wrap: balance | 800 | 1.04 | -0.035em |
| Hero value (the leave time) | clamp(2.4rem, 7vw, 3.4rem) | 800 | 1 | -0.03em |
| Temperature | 2.4rem (3rem on the Weather page) | 800 | 1 | -0.02em |
| Page title (h1 in the header) | 1.45rem | 800 | 1.15 | -0.015em |
| Form title (h2 in the auth card) | 1.65rem | 800 | 1.15 | -0.02em |
| Card title (h3) | 1rem | 700 | 1.4 | 0 |
| Body | 1rem (16px) | 400 | 1.55 | 0 |
| Small text and labels | 0.85rem; never under 0.75rem (12px) | 400 to 700 | 1.4 | 0 |
Use tabular-nums for times, temperatures and counts. Hierarchy comes from size, weight and space, not from extra colors or boxes.

Shape and depth:
- Radius: cards 24px, the auth card 28px, the header 22px, the tab bar 24px, inputs 14px, image placeholders 12–18px; chips, buttons, avatars and the nav rail are fully round.
- Buttons: primary is mango with #0E1726 text, weight 800, at least 48px tall, fully round. Secondary is transparent with a 1.5px currentColor border, at least 44px tall. Icon buttons are 44px circles with a chip background.
- Inputs: chip background, 1px line border, radius 14px, at least 46px tall, with a visible label above.
- Cards: padding 18px. The only shadow is glass-shadow.

Avoid the generic AI-made look (Impeccable's critique and detector check this):
- Don't build pages out of same-size cards that each have an icon, a heading and a "See all →" link. Give each card the size and shape its content needs, as the Today grid in <pages> does.
- No gradient text, emoji icons, small labels above headings, colored left borders on cards or alerts, or decorative numbering.
- Write short copy in people's own words, with Cebuano touches where they fit: "Maayong buntag/udto/hapon/gabii, {firstName}", "Maayong pagbalik!", "Bag-o ka diri?", a "Naay klase?" chip on class advisories, and "Ingat sa dalan!" in the all-clear state.

UX rules (ui-ux-pro-max): 4.5:1 text contrast, visible focus rings, 44x44px touch targets, cursor-pointer and hover feedback on every clickable element, SVG icons only, severity shown as a colored chip with its label (never color alone), alt text on images, labeled form inputs. Responsive at 375, 768, 1024 and 1440px with no horizontal scroll.

NEVER use the Santo Niño's image, the CIT-U logo or seal, or official Sinulog Festival logos. Original abstract motifs only (e.g. the stripe art on the Mayor page cover).
</design_system>

<icons>
There is one icon system with two families, and one rule decides which to use: if it shows a condition, it's a live icon; if you press it or navigate with it, it's a control icon. Keep this consistent everywhere: never mix the two styles within one kind of thing, and never give a control icon a loop.

Control icons (still):
- Use for the tab bar, nav rail, header buttons, the location pin, buttons, inputs, chevrons, close, filters, external links and image placeholders.
- Every icon is an inline SVG React component: no icon fonts and no image files. Use Phosphor (MIT). Copy the SVGs you need into src/components/icons/ as components, with Phosphor's license file next to them, instead of installing a package. Regular weight only.
- Sizes are tokens in src/index.css: 20px in content, 22px in the tab bar and nav rail.
- The active tab has the mango pill behind it, and its icon and label turn #0E1726. The icon itself doesn't change or move.
- Icons beside visible text get aria-hidden="true". Icon-only buttons (close, filters, the avatar) get an aria-label and a 44×44px hit area, even when the icon is 20px.
- No colored rounded squares around icons.

The bell (a control icon that reacts):
- It stays still until a new alert arrives. Then it rings once: rotate through 0°, 18°, -16°, 11°, -8°, 4°, 0° over 1 s, ease-in-out, pivoting at the top (transform-origin 50% 8%). See RING and ringBell in the sample.
- A badge shows the number of unread alerts: status-high with white text, at least 19px tall, at the bell's top right. It pops in from scale 0.4 with ease-pop over 400 ms whenever the bell rings, and it's hidden at zero.
- Unread means alerts from GET /api/alerts?relevant=true whose ids aren't in the seen list, which is saved in localStorage.
- It rings 1.1 s after sign-in if anything is unread, and whenever an alerts refetch brings a new unread alert. It never rings on a timer or just because a page opened.
- Tapping it opens /traffic and marks everything as seen.
- Accessibility: its aria-label says "Alerts, 3 new". When the count rises, one visually hidden <span role="status" aria-atomic="true"> announces "1 new alert near your places". Never put a live region on the bare number.
- In still mode, the badge changes but nothing moves.

Live icons (src/components/LiveIcon.tsx, with a kind prop). The drawings and parts are in WI in the sample; open "All icons" in its Preview bar to see every one moving.
- One drawing style: a 64×64 viewBox, a #0E1726 outline 2.4 wide with round joins, flat fills from the colors below and one hard-edged shade. No gradients, no glows, no line-only drawings. The jeepney and its smoke use the same style.
- One rhythm: every loop lasts ½, 1, 2 or 4 beats (--beat: 1.6s) and never stops while visible. Each icon has one main idea, so the page moves together instead of jittering.
- This is the full list. Don't add other kinds or change these motions:
  | Kind | Use | Colors | Loop |
  | clear-day | Clear, day | Sun #FFC233, shade #F5A300, rays #FF9F1C | The sun jumps with squash and stretch (1 beat) while its rays turn (4 beats per turn), and a shadow under it shrinks as it rises |
  | clear-night | Clear, night | Moon #F6D978, stars #FFE9A8 | The moon rocks ±12° (1 beat each way); two stars twinkle (1 beat) |
  | partly-day | Partly cloudy, day | Small sun behind a white cloud | The sun bobs up behind the cloud (1 beat each way); the cloud floats (1 beat each way) |
  | partly-night | Partly cloudy, night | Small moon behind a white cloud | The moon rocks; the cloud floats |
  | cloudy | Cloudy | White cloud #FFFFFF, shade #CFDBEA, and a small cloud behind it #DDE6F1 | The two clouds float in opposite directions |
  | fog | Fog, haze, smoke, dust | White cloud and two lines #E8EEF6 | The cloud floats; the lines slide in opposite directions |
  | rain2, rain3, rain4 | Rain: 2, 3 or 4 drops, by how heavy | White cloud, drops #3E8BE8 | The cloud bobs (1 beat); the drops fall from behind it (½ beat each, staggered) |
  | storm | Thunderstorm | Cloud #7B8AA3, shade #5B6980, bolt #FFC233, two drops | The bolt flashes twice while the cloud shakes (2 beats); the drops fall |
  | flood | Flood alerts | Waves #8FC2F5 and #3E8BE8 | The two waves slosh in opposite directions (1 beat each way) |
  | closure | Road closure alerts | Striped board #FFC233 and #C8102E, posts #9AA7B8, lamps #FF6B4A | The two lamps blink in turn (1 beat) |
  | traffic | Traffic alerts, the weather delay on the home page | Car #FFC233, shade #F5A300, windows #1F2A3A | The car bobs (1 beat); its wheels turn (1 beat per turn) |
  | power | Power interruption alerts | Plug #EEF3F8, shade #C9D3DF, spark #FFC233 | The spark blinks (1 beat) |
  | water | Water interruption alerts | Drop #3E8BE8, shade #2F6FC0 | The drop jumps like the sun, with its shadow (1 beat) |
  | typhoon | Typhoon alerts | Arms and eye wall #5B7FB5, white eye | The whole symbol turns (2 beats per turn) |
  | class | Class suspension alerts | Backpack #2F7BE0, shade #1E5AA8, pocket #FFC233 | The backpack jumps like the sun, with its shadow (1 beat) |
  | clock | The leave time on the home page | White face, red minute hand #C8102E | The minute hand turns (2 beats per turn) |
- Alert icons from the API's type: flood → flood, closure → closure, traffic → traffic, power → power, water → water, advisory → class, weather → rain3, or typhoon when the title mentions a typhoon or a storm signal. Show the icon next to the title, and show severity with the colored chip and its label.
- Where they move:
  - Looping: Today's "Weather now" (64px), the Weather page's "Now" (92px), alert rows on Today, Weather and Traffic and in alert details (40px), and the home page's example strip (36px).
  - Still, using the same drawing with the loop turned off (the sample's wi(kind, true)): the header weather chip (22px), the hour strip (30px) and the "Right now" glance (24px). These are small or repeated, and a row of 12 moving icons would only distract.
  - The Weather tab in the tab bar and nav rail is a control icon (CloudSun), like every other tab.
- Weather icons: pick the kind from the number at the end of the API's iconUrl, and day or night from its path (".../night/116.png" is partly cloudy at night). Show cloudy when iconUrl is null or its number isn't listed (WeatherAPI's snow and sleet codes don't happen in Cebu). Never display the iconUrl image itself: it's an extra request from the user's phone to WeatherAPI, and it wouldn't match the app.
  | Kind | WeatherAPI icon numbers |
  | clear-day or clear-night | 113 |
  | partly-day or partly-night | 116 |
  | cloudy | 119, 122 |
  | fog | 143, 248, 260, and 125–161 (haze, smoke, dust) |
  | rain2 | 176, 263, 266, 293, 296, 353 |
  | rain3 | 299, 302, 356 |
  | rain4 | 305, 308, 359 |
  | storm | 200, 386, 389 |

How live icons are built:
- Plain CSS @keyframes on transform and opacity, inside @media (prefers-reduced-motion: no-preference), and turned off by :root[data-still] and by the still prop. The keyframes are the w-* ones in the sample.
- Each moving part is its own small <svg> inside an absolutely positioned <span>. Animate the <span>, never a <g> or <path> inside an SVG: the browser runs transform and opacity animations of HTML elements on the compositor, while animations of SVG elements run on the main thread (the motion skill's performance rule). That's what makes endless loops cheap on a phone. Don't use Lottie, SMIL or an animated icon library, because they animate inside the SVG.
- The rest frame looks complete (drops showing, bolt showing), because it's also what still mode shows.
- Beside text they're decorative (aria-hidden="true"). In the hour strip, give each one role="img" and an aria-label such as "Light rain".
- All live icons together stay under about 12 KB before gzip.

Other touches:
- The live dot in the header sends out one ring (it scales up and fades, 400 ms) when new data arrives. It never pulses on its own.
- Empty states: two small drawings (about 96px) in the live icon style, without loops: a calm sea and sun for "All clear" and a jeepney for "Add your weekly trips". Other empty states are one sentence and one action. No 3D, blob or stock illustrations.
</icons>

<performance>
Information must be on screen almost instantly, even on a cheap Android phone on slow mobile data. Speed is a budget, not a ban: an effect is allowed when the targets below still pass and it has its fallback (Lite mode, still mode or reduced transparency). When an effect can't meet the targets, cut the effect. Accessibility comes before all of this.

Targets (Lighthouse "Mobile" in Chrome DevTools, on the production build: `npm run build`, then `npm run preview`):
- Performance ≥ 90, Accessibility ≥ 95 and Best Practices ≥ 95 on the home page, Today and News.
- LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms.
- JavaScript downloaded on the first visit (the entry chunk plus everything it imports) ≤ 200 KB gzipped. Vite prints gzip sizes after each build.

First paint:
- A tiny inline script in the <head> of index.html sets data-time (from the Asia/Manila clock), data-mode (from localStorage or the device) and data-lite and data-still (from localStorage) on <html>, before anything paints. CSS then paints the matching sky gradient on <body>, so there's no flash of the wrong mode or sky.
- Put a static shell inside #root in index.html (the logo and a few plain glass blocks, in plain HTML and CSS), so a slow phone shows the layout before any JavaScript runs. React replaces it on mount.
- Start the sky's canvas after the first paint (requestIdleCallback, with a timeout fallback).
- No splash screens or full-page spinners. The entrances in <motion> don't count as these: they start in the first frames and never block input.
- One web font only, loaded with font-display: swap over the system-ui fallback.

Code loading:
- Split every route with React.lazy + Suspense, except the home page and Today. The home page holds both forms, so switching between them never waits for the network; load onboarding with a route-level lazy (see <motion>).
- Load the jeepney ride's code with a dynamic import after the first paint, and await it if someone presses the button first.
- Leaflet loads only on Traffic, when Weather's rain-map tab first opens, and for the Profile pin-drop. Today has no map. Draw alert dots as circle markers with preferCanvas.
- No heavy libraries: format dates with Intl.DateTimeFormat and Intl.RelativeTimeFormat (timeZone "Asia/Manila"); no moment, date-fns, lodash or UI kits; draw charts in plain SVG unless a chart library is approved.
- Sheet, tab and expander content mounts when it first opens, not on page load.

Data (TanStack Query; set the defaults in src/main.tsx):
- Set staleTime from the "Data freshness" table in docs/api-contract.md, so the app never refetches faster than the backend updates: alerts and the brief 5 min (leave times are recomputed from current alerts), weather 15 min, news and mayor posts 10 min. Profile, places and trips never go stale on their own; invalidate them after your own edits. Refetch alerts every 5 minutes while the tab is visible.
- Every section on Today runs its own query, in parallel, with its own skeleton and error state, so one slow endpoint never holds back the others. No request waterfalls.
- Feeds load once and reveal more as you scroll: News fetches limit=50 (the API's maximum) and shows 10 at a time; Mayor fetches limit=10 (its maximum). Scrolling never waits on the network.
- After the first load, never blank a screen: keep showing cached data while refetching, use placeholderData: keepPreviousData for filters, and show "Updated 3 min ago" instead of a spinner.
- When a tab is hovered, focused or touched, preload that page's chunk and prefetch its main query (queryClient.prefetchQuery), so the page opens with its data.
- Use optimistic updates for following a mayor and for profile, place and trip edits; roll back with a toast if the API refuses.
- Persisting the query cache for instant repeat visits would need a new dependency (a TanStack Query persister): ask first. If it's approved, clear the cache on sign-out.

Rendering:
- Images: fixed aspect-ratio boxes (no layout shift), loading="lazy" below the fold, decoding="async", a neutral placeholder, and an onError fallback (Facebook media URLs expire).
- Give feed cards and list items below the fold content-visibility: auto with a contain-intrinsic-size.
- backdrop-filter only on glass panels and dark glass, never on anything inside them. No background videos or large decorative images.
- The sky's canvas never exceeds a device pixel ratio of 1.5, and the jeepney's smoke exists in the DOM only during a ride.
- The weather hour slider restyles the existing markers (it never re-creates the map) and uses useDeferredValue, so dragging stays smooth.

Lite mode (data-lite="on" on <html>):
- It turns on by itself when navigator.hardwareConcurrency ≤ 4, navigator.deviceMemory ≤ 4 or navigator.connection.saveData is true. A switch in Profile overrides this, and the choice is saved in localStorage.
- Glass: no backdrop-filter, solid surfaces (see <design_system>). Sky: half the stars, raindrops and beads, device pixel ratio 1, at most 30 frames per second. Smoke: 60% of the puffs. No blur in page exits and entrances.
- Everything else stays, including the live icon loops, which run on the compositor and cost almost nothing.

Test like a slow phone: Chrome DevTools with CPU throttling at 6x slowdown and the "Slow 4G" network preset, and on a real low-end Android phone over USB debugging if anyone has one.
</performance>

<motion>
Motion gives SugboNow its character, and it also confirms what happened. It never blocks anyone: controls respond at once, and content is readable within the timings below. Every animation has a still-mode version.

Which tool:
- CSS (Tailwind transitions and @keyframes): hover, press and focus states, color changes, switches, skeletons, spinners, live icon loops, page entrances and number reels. It needs no JavaScript, so it works from the first frame, and content can't get stuck hidden if JavaScript is slow.
- Motion: page exits, onboarding steps, exit animations (sheets, toasts, menus) with AnimatePresence, and height: "auto" expanders.
- The Web Animations API (element.animate): the smoke and the bell. These are one-shot effects outside React's rendering.
- `animate` from the motion package: the jeepney's movement, as in the sample, inside the dynamically imported ride code.
- The browser's View Transitions API: the theme switch only.
- Load Motion the light way: <LazyMotion features={loadFeatures} strict> with m components, where loadFeatures dynamically imports a file that exports domAnimation. m components don't animate until the features load, so never use Motion for anything that must be visible on the first render (no initial={{ opacity: 0 }} on content).
- domAnimation covers everything in this spec. Ask first before using domMax, layout or layoutId animations, or drag.

Timing tokens (put them in src/index.css):
| Token | Value | Use |
| ease-out | cubic-bezier(0.22, 1, 0.36, 1) | Entering, hover, sliding pills |
| ease-in | cubic-bezier(0.32, 0, 0.67, 0) | Leaving |
| ease-settle | cubic-bezier(0.3, 1.25, 0.5, 1) | Cards and words: a small overshoot, then rest |
| ease-pop | cubic-bezier(0.34, 1.56, 0.64, 1) | Chips, avatars, bars, badges: a clear pop |
- Press 100 ms; hover and color 150 ms; switches 200 ms; sheets up to 300 ms. The only longer animations are the ones named in this section and the live icon loops in <icons>.
- The sample uses Motion springs for its entrances. The CSS eases in this section give the same look without depending on JavaScript, so use them.
- Motion springs: { type: "spring", visualDuration: 0.3, bounce: 0 }.
- Animate transform and opacity. clip-path is allowed for the sliding pills, the cover wipe and the theme reveal; filter: blur is allowed only where this section names it, and never in Lite mode. Never animate width, height (except the small Motion expanders), top/left, margins, box-shadow or backdrop-filter.

The jeepney ride, sign in ↔ sign up. This is the signature moment. Rebuild it in src/lib/ride.ts from jeepSmoke, jeepIn, jeepRev, jeepOut, pose, switchForm and smoke in the sample, with the same timings. It must stay fast: the new form is usable 0.6 s after the press.
The jeepney is hidden until the press. There is no road and no parked jeepney under the form.
| Time | What happens |
| 0 s | The user presses "Sign up" (or "Sign in" on the sign-up form). The auth card goes inert. The jeepney appears just off the right edge of the screen. Its wheels sit on the card's bottom edge (clamped to 8px above the bottom of the screen), and it faces left. Scale 1.3 at ≥ 900px, 1 on phones |
| 0–0.3 s | It pulls in, moving left, ease cubic-bezier(.16,1,.3,1). At ≥ 900px it passes behind the glass card, so you see it blurred through the glass, and stops 18px left of the card. On phones it drives in front of the card and stops in the center of the screen |
| 0.3 s | It moves in front of the smoke. The smoke's cover starts from its tailpipe (see below) |
| 0.3–0.44 s | The stop: the nose dips 2.4° and returns, the body shakes by up to 1.2px and the shake dies away, and three small puffs come out of the tailpipe |
| 0.44–0.84 s | It floors it to the left and off the screen, ease cubic-bezier(.5,0,.9,.4). The nose lifts 2.2° over the first 180px, and it leaves one small puff every 46px of road. The wheels' rotation and the body's small bounce follow the distance traveled |
| 0.6 s | The card is fully covered. Swap the form and the URL (/login ↔ /signup, with no view transition), remove inert, and move focus to the new form's h2 |
| 0.6–0.96 s | The cloud pops away, and the new form enters at the same time (see "Home page entrance": only the h2 words and the form rows, starting 40 ms in) |
The hero copy on the left doesn't change or move during any of this: only the card area is covered.

The jeepney ride, logging in. It only starts after sign-in succeeds, and then the same ride covers the whole screen.
| Step | What happens |
| Press | "Sign in" or "Create account" shows its loading state (see Buttons). The Supabase request runs, and nothing else moves yet |
| Failure | Show the error next to the field or under the form. No jeepney, no smoke |
| Success | The ride runs as above, but the cover area is the whole viewport and it takes 0.42 s, so the screen is covered 0.72 s after the jeepney starts |
| Under the smoke | Navigate to the destination: / (Today), or /welcome after a new sign-up. Await the navigation and wait for the page's first frame. The smoke holds until then, so it never reveals a blank page |
| Clear | The cloud pops away (0.36 s) while the destination plays its first-open entrance, starting at 80 ms |
- If sign-up needs email confirmation, there's no session yet: show the "check your email" state inside the auth card, with no ride.
- Navigate into the app from an effect once the auth status becomes signedIn and the screen is covered, so the protected route never sees a signed-out state. A session restored on page load goes straight to Today with no ride.
- Back and Forward between /login and /signup, and opening either URL directly, show the right form with no ride.
- Keep the home page's URL in step with the form, and keep both forms mounted (see page 1 in <pages>).
- Still mode: no jeepney and no smoke. Forms swap with a 120 ms crossfade, and logging in goes straight to the destination.

The cartoon smoke (src/lib/smoke.ts; rebuild `smoke` from the sample). It must look like a cartoon, not like real smoke:
- Flat fills only: puff with one hard-edged puff-shade crescent at the lower right. No blur, no gradients, no transparency.
- One bumpy puff-line outline around the whole cloud, and no lines inside it. To get this, each puff is two round elements: a puff-line circle 3.5px larger in radius, placed under all the fills, and the fill itself (background puff, box-shadow: inset -.16em -.2em 0 puff-shade, with font-size set to the radius).
- Puffs never fade. They pop in and out by scale, with the overshoot of cubic-bezier(.34,1.7,.64,1).
- Cover: puffs sit on a jittered grid. Step d = sqrt(area width × area height / n), with n = 34 for the card and 56 for the whole screen (60% of that in Lite mode). The first row and column are d/2 inside the edges, each position is jittered by up to ±0.12d, and each radius is 0.92d to 1.2d. Those numbers leave no gaps. On the card, the cloud is not clipped: its bumpy edge spills past the card by about 30–50px, which is correct.
- Wave: farthest puffs are placed first, so the nearer ones sit in front. Each puff pops in over 180 ms (card) or 220 ms (whole screen), with a delay of (its distance from the tailpipe ÷ the largest distance) × (cover duration − pop duration).
- Clear: each puff goes from scale 1 to translateY(-6%) scale(1.06) at 30%, then to translateY(-26%) scale(0), over 220 ms with cubic-bezier(.5,0,.75,0), and a delay of (distance ÷ largest distance) × 140 ms. Then remove the elements.
- Tailpipe puffs: small lumpy blobs (four overlapping circles, drawn as an outline pass and then a fill pass, see BLOB in the sample) with a random rotation. Radius 9–13px at the stop and 12–22px on the road, times the jeepney's scale. Each pops to full size in the first 28% of its 420–640 ms life, drifts 18–54px right and 14–40px up, shrinks to nothing and removes itself.
- Layers: mount the smoke layer and the jeepney at the app root, outside the routes, both position: fixed, so they survive the route change. Set these z-index values, from back to front: sky and home page shade -1, hero copy auto, jeepney 1 while pulling in (3 on phones), auth card 2 (position: relative), smoke 80, jeepney 90 after it stops. Don't set z-index, transform, opacity or filter on any ancestor of the auth card or the jeepney, because a new stacking context would break this order and stop the card's blur from showing the jeepney. The sample moves the jeepney in the DOM to do this; in React, change its z-index instead. Both layers are pointer-events: none and aria-hidden, and the smoke layer is overflow: hidden.
- The jeepney is the SVG in JEEP in the sample, which faces left and has the same outline as the icons. The tailpipe is at (150, 53) in its 150×64 drawing, and its route sign reads "TALAMBAN".
- A new ride cancels the old one: a second press during the clear starts a new ride at once, and the old jeepney and puffs stop (see j._run in the sample).

Home page entrance (rebuild `playScreen` from the sample, in CSS). It plays when the page loads and after sign-out. Times are when each part starts:
| Part | From | Duration and easing | Starts at |
| Headline words | Masked below the line: translateY(110%), opacity 0, rotate(6deg) | 700 ms ease-settle, 70 ms between words | 0 |
| Auth card | opacity 0, translateY(26px), scale(.97) | 600 ms ease-settle | 120 ms |
| Form title words | Masked: translateY(110%), opacity 0 | 420 ms ease-settle, 35 ms between words | 300 ms |
| Form rows | opacity 0, translateY(10px) | 300 ms ease-out, 35 ms apart | 340 ms |
| Lede, example strip, facts line | opacity 0, translateY(18px), blur(6px) | 600 ms ease-out, 90 ms apart | 350 ms |
| Example strip icons | opacity 0, scale(.4) | 450 ms ease-pop, 80 ms apart | 550 ms |
| Number reels and count-ups | From 0 (see below) | See below | 550 ms |

First-open entrance on signed-in pages (rebuild `playPage` from the sample, in CSS). The times below are for card number i, counting from 0, and d = 120 ms + i × 65 ms:
| Part | From | Duration and easing | Starts at |
| Page title words | Masked: translateY(110%), opacity 0 | 420 ms ease-settle, 35 ms between words | 0 |
| Card | opacity 0, translateY(28px), scale(.96) | 600 ms ease-settle | i × 65 ms |
| Number reels | From 0 | See below | d + 50 ms |
| Count-ups | From 0 | See below | d + 150 ms |
| Rows (list rows, hour cells, news rows) | opacity 0, translateX(-16px) | 450 ms ease-out, 50 ms apart | d + 120 ms |
| Chips and avatars | opacity 0, scale(.5) | 450 ms ease-pop, 50 ms apart | d + 200 ms |
| Rain bars | scaleY(0) from the bottom | 550 ms ease-pop, 50 ms apart | d + 200 ms |
| Chart line and map roads | stroke-dashoffset 1 → 0 with pathLength="1" and stroke-dasharray="1" (roads 120 ms apart) | 900 ms ease-out | d + 200 ms |
| Chart area | opacity 0 | 600 ms | d + 500 ms |
| Chart peak dot and label, map dots | opacity 0, scale(0), with transform-box: fill-box | 400 ms ease-pop | d + 800 ms |
| Mayor cover art | clip-path: inset(0 100% 0 0) | 800 ms ease-out | d + 100 ms |
- Later visits to the same page: the title words still rise, and the cards use opacity 0, translateY(12px), 350 ms ease-out, 35 ms apart. Everything else just appears. Keep the set of first-opened pages in memory, and clear it on sign-out.
- Reels and count-ups wait for their data: they start when their card has entered and the value is known, whichever is later. Skeletons sit inside the cards until then.
- The entrance plays for the whole page when it opens, including cards below the fold. Nothing is triggered by scrolling.

Numbers:
- Number reels (src/components/RollNumber.tsx; see wheelTo in the sample): for the leave time, the temperature and other big values. Each digit is a 1em-tall window with overflow hidden, holding a strip of 0–9 twice, moved with translateY in em. On first open each digit starts at 0 and makes one full turn before stopping on its value. Column n (counting from 0, left to right) takes 900 ms + n × 100 ms with ease-settle and starts n × 70 ms late, so the last digit lands last. Other characters (":", "°") don't move. Screen readers get one visually hidden copy of the real value, and the strips are aria-hidden.
- Count-ups (src/hooks/useCountUp.ts; see countTo in the sample): for small stats such as 4.8K reactions, 1.8 km and 88%. Use requestAnimationFrame to go from 0 to the value over 1.1 s with cubic-bezier(.16,1,.3,1), and tabular-nums so nothing jumps. It doesn't need Motion.
- Live values: when a leave time, temperature or alert count changes on refetch, the reel rolls straight from the old digit to the new one (600 ms ease-settle), and a count-up runs from the old value to the new one (700 ms).

Words (src/components/RiseWords.tsx; see words and rise in the sample): render each word as <span class="w"><span>word</span></span> with real spaces between them, so the text stays selectable and readable by screen readers. The outer span is an inline-block with overflow: hidden and just enough padding (with matching negative margin) to keep descenders. The inner span moves. Use it for the home headline, the form titles and the page title.

Page transitions (Motion, in the app shell; see go in the sample):
- Only the content area moves; the header, tabs, rail and tab bar stay still. The pill moves and the URL changes at once on tap.
- Exit: opacity 0, scale(.985), blur(8px), 200 ms ease-in (no blur in Lite mode). Then the new page mounts and plays its entrance.
- Wrap the routed content in <AnimatePresence mode="wait" initial={false}>, keyed by pathname (not search params, so filter changes don't animate the page). Render the outlet through a small component that keeps the useOutlet() value it had when it mounted, so the leaving page keeps showing its own content.
- No exit animation on the first load.

Stretchy pills (tab bar, nav rail, segmented controls; see slidePill in the sample): the mango pill is a full-size element clipped with clip-path: inset(... round ...). When it moves, the leading edge arrives first (360 ms) and the trailing edge catches up (550 ms), both ease-out, so it stretches and then settles.

Theme switch (see toggleTheme in the sample): it's on the home page's nav and in the header. The new mode spreads out from the button in a circle: document.startViewTransition with animation: none on the old and new root snapshots, and clip-path: circle(0 at the button) to circle(R at the button) on ::view-transition-new(root), 720 ms ease-out, where R reaches the farthest corner. The sun and moon icons swap with a 450 ms rotate and fade. Browsers without the API and still mode just switch.

Onboarding steps: each step slides in the direction of travel (Next from the right, Back from the left), 16px with a fade, { type: "spring", visualDuration: 0.22, bounce: 0 }; the progress bar fills with transform: scaleX.

Buttons (one shared Button component with every state):
- Press: scale to 0.97 (active:scale-[0.97], 100 ms). It needs no JavaScript, so it works before Motion loads.
- Hover: one shade brighter, 150 ms. Tailwind v4's hover: only applies on devices that can hover, so phones never get stuck hover states.
- Focus: a 2px mango ring with a 2px offset that appears instantly.
- Loading: keep the button's width, fade the label out and a small spinner in, set aria-busy, and disable the button until the request finishes.
- Success ("Saved"): the icon becomes a check that scales in from 0.85 with a fade (150 ms), then the button returns to normal after about 1.2 s.

Other components:
- Rows and feed cards that open something: on press, scale to 0.99; on hover (pointer devices), the background tints slightly. They never lift.
- Switches: the thumb slides with a CSS transform, 200 ms.
- Data that arrives after its skeleton fades in where the skeleton was (150 ms).
- High-severity alerts: a soft mango "candle glow" on a pseudo-element (opacity pulse), 2 cycles, then it stops. Only on the alert status line, not on every alert row.
- Expanders (the brief, leave-time reasons, "See more" captions): Motion height: "auto", 200 ms, small content only.
- Bottom sheets (phones) and toasts: glass panels. They enter with the spring above (sheets slide up from the bottom, toasts rise 16px) and leave with a 150 ms fade. Close a sheet with its handle button, the backdrop or Esc, and return focus to what opened it. The backdrop is a solid dim rgba(6,10,20,.4), never a blur.
- Skeletons: a soft opacity pulse, shaped exactly like the content they stand in for.

Still mode: it's on when prefers-reduced-motion: reduce matches, or when data-still is set on <html> by Profile's "Reduce animations" switch (saved in localStorage). In it:
- No live icon loops, no entrances, no reels or count-ups (values just show), no jeepney, no smoke, no bell ring, no theme circle.
- The sky draws one still frame.
- Keep short fades (120 ms). Wrap the app in <MotionConfig reducedMotion={still ? "always" : "user"}>, and use motion-reduce: variants in CSS.
</motion>

<scrolling>
- The header scrolls away with the page. The tab bar and the nav rail stay fixed. Don't build hide-on-scroll.
- Sticky: filter cards (chip rows and segmented controls) stick 8px below the top of the screen; the desktop side column is position: sticky (top 18px).
- Feeds (News, Mayor): reveal the next cards as the end comes into view (IntersectionObserver), with a visible "Show more" button as the fallback and for keyboard users. End with a clear message ("You're all caught up").
- New content after a refetch never moves what the reader is looking at: show a "New stories" or "New alerts" pill at the top; tapping it scrolls up and shows them.
- Horizontal rows (area chips, LGU avatars, the hourly strip): overflow-x: auto with scroll-snap and overscroll-behavior-x: contain, scrollbar hidden only where swiping is obvious, and every item still reachable by keyboard.
- A new page starts at the top; Back and Forward restore the scroll position (React Router's <ScrollRestoration />).
- Smooth scrolling only for in-page jumps (e.g. from the alert status line to the alerts section), and never in still mode.
- Nothing appears on scroll: content is visible at rest, with no fade-ins as sections enter the viewport. No scroll-jacking or snap on the main page.
</scrolling>

<polish>
The premium feel comes from consistency and care.
- One spacing scale (Tailwind's 4px steps), the radius rules in <design_system>, hairlines in line, and one shadow (glass-shadow).
- Times, temperatures and counts use tabular-nums; brief text stays within about 70 characters per line.
- Every state is designed: skeletons match the final layout; empty states teach the next step with one action; errors use plain language and a Retry button; offline, a banner says "You're offline. Showing info from 7:42 AM." above the cached data.
- Live data always shows when it was updated ("Updated 3 min ago").
- Prefer an undo toast to a confirmation dialog for reversible actions.
- Add a skip-to-content link, and move focus to the page's h1 on every route change (the form's h2 on the home page).
- Text selection is mango with #0E1726 text. Dark mode in the map: the OpenStreetMap tiles get filter: invert(1) hue-rotate(180deg) brightness(.9) on the tile pane only.
- Phone details: keep <meta name="theme-color"> equal to the sky's current top color, and use viewport-fit=cover in the viewport meta so the tab bar can pad itself with env(safe-area-inset-bottom).
</polish>

<pages>
Routes: /login and /signup (the home page), /welcome (onboarding), then the protected pages / (Today), /news, /mayor, /weather, /traffic and /profile. Signed-out users are redirected to /login. Add an AuthContext and a ProtectedRoute. Keep filters, tabs and sections in the URL (e.g. /news?area=cebu_city&alerts=1, /weather?tab=map, /traffic?view=all, /profile?section=trips) so they survive a refresh and can be shared.

Each page lists its Content (everything PR #27 had, which is correct) and then how to arrange it. All copy in quotes is exact.

1. Home page with sign in (/login)
   Content: the logo and the theme switch; the headline; a one-line description; an example of the product; the auth card with the sign-in form: "Sign in", "Maayong pagbalik! Use your SugboNow account.", email, password with show/hide, "Forgot password?" (Supabase reset email), the "Sign in" button, and "New to SugboNow?" with a "Sign up" button. With mocks on, a note explains demo sign-in.
   Layout:
   - Top row: the logo mark and "SugboNow" in white on the left; the theme switch on the right (a 44px circle, background rgba(9,14,28,.38), border rgba(255,255,255,.22), white icon).
   - Below it, centered in the rest of the viewport height and at most 1200px wide: at ≥ 900px, two columns, minmax(0, 1fr) and minmax(360px, 440px), gap 56px, with the hero copy on the left and the auth card on the right. Under 900px, one column, with the hero copy first.
   - Hero copy, in order: the headline "Know when to leave, rain or shine."; the line "SugboNow checks Cebu traffic, weather, floods and your mayor's posts, then tells you when to leave for every trip."; the example strip; the line "Traffic checked every 15 min · Your brief is ready by 5:30 AM".
   - Example strip (dark glass, radius 20px, marked with a mango "Example" tag): live icon clock with "Leave by 6:43 AM"; live icon rain3 with "Talamban 25° Rain"; live icon traffic with "Weather delay +12 min". The values are fixed example text and call no API.
   - Shade for contrast: the hero copy sits directly on the sky, so a fixed layer behind it darkens that side. At ≥ 900px: linear-gradient(90deg, rgba(5,10,24,.64), rgba(5,10,24,.62) 50%, rgba(5,10,24,.2) 78%, rgba(5,10,24,.06)). Under 900px: linear-gradient(180deg, rgba(5,10,24,.64), rgba(5,10,24,.6) 58%, rgba(5,10,24,.4)). That keeps white and on-sky text above 4.5:1 even over the brightest sky and a passing cloud.
   - Auth card: a glass panel, radius 28px, max-width 440px, right-aligned at ≥ 900px. Both forms sit in the same grid cell (grid-area: 1 / 1), vertically centered. The inactive form has visibility: hidden and inert. That way the card keeps the taller form's height and never jumps when the forms swap. "Sign in" is the only primary button.

2. Sign up (/signup)
   Content: the same page and hero as page 1, with a 2-step sign-up form in the auth card (how it saves: see signup.md in this folder). Step 1: "Create your account", "Bag-o ka diri? Next you tell us where you live and which mayor to follow.", first name, email, password (at least 8 characters) and confirm; a "Next" button; "Already riding with us?" with a "Sign in" button. Step 2: "Where you live", "Asa ka nagpuyo? This sets your weather and whose class suspensions you see.", home city, address ("A barangay or street is enough."), and the mayor to follow, with the note that Cebu City, Mandaue and Lapu-Lapu decide their own class suspensions and every other town follows the Province of Cebu; a "Back" button and the "Create account" button. A "check your email" state when confirmation is required.
   Layout: as page 1. The forms switch with the jeepney ride (see <motion>). The two steps share one grid cell, so the card never jumps, and they move like onboarding steps, with no jeepney.

3. Onboarding (/welcome)
   Content: a skippable setup with a progress bar: home/school/work places (each with a map pin, and Home's address starts from profile.addressText), then a first weekly trip. The name, city, address and mayor are already saved at sign-up. Saves with POST /api/locations, POST /api/schedule and PATCH /api/profile (the commute, from the first trip).
   Layout: one glass card centered on the sky (max-width 520px), one step and one question at a time, "Next" as the only primary button and "Skip for now" always visible at the top of the card.

4. Today (/), the dashboard: "Do I need to change my plans today?"
   Content: the greeting with the date; the alert status (high-severity alerts near the user's places, with "Naay klase?" on class advisories); leave times for today's trips (leave by, route, arrive-by, distance, usual time, delay, and why); the Cebu Daily Brief (brief.content, labeled "AI summary"); the weather now with the rain chance for the next 6 hours; alerts near the user's places; the mayor's latest post; top Cebu news; and a first-run setup prompt. On sign-in, call POST /api/lgu-posts/refresh once.
   Changes from PR #27: the mini map is gone (it lives on Traffic, so Today loads no map); alerts show the top 3, not 5; the mayor section shows 1 post; news is 3 compact rows; the brief shows its first 3 lines with "Read the full brief"; only the next trip is large.
   Order (phones, top to bottom):
   1. Header: "Maayong buntag/udto/hapon/gabii, {firstName}" as the title (by the sky's time name), with the location and date under it.
   2. The alert status line, a slim glass strip: "All clear near your places · Ingat sa dalan!" or "3 high alerts near you" (tapping it scrolls to the alerts section). Class advisories add a "Naay klase?" chip.
   3. The next trip, the primary element, a dark glass card: the title "Your next trip", a mango delay chip ("+20 min · rain"; it expands the reasons), "Leave by 6:55 AM" as number reels at the hero size, then "Classes · Home → School · arrive 7:30". Under it the trip chart (see below), then "Later today" rows for the other trips (name and leave time).
   4. Weather now, a glass card: the looping live icon (64px), the temperature, the condition, one line of advice from the hourly rain chance ("Rain likely from 9 PM. Bring an umbrella." when an hour in the next 12 reaches 70%; otherwise "No rain expected for the next 12 hours."), and rain bars for the next 6 hours.
   5. Today's brief, a glass card: the first 3 lines, "Read the full brief" (expander), the "AI summary" label, and the note that it's written automatically.
   6. Near your places, a glass card: 3 alerts as compact rows (live icon, title, distance, severity chip), then "See all on the traffic map".
   7. This week, a small glass card (see below).
   8. From your mayor, a glass card: the latest post as a preview (avatar, LGU, time, 2-line caption, counts), linking to /mayor.
   9. Top Cebu news, a glass card: 3 compact rows (headline, source, time, small thumbnail), linking to /news.
   Desktop grid (12 columns): the alert status line spans 12. Next: next trip 7 and weather 5. Next: brief 7 and near your places 5. Next: this week 3, mayor 4 and news 5. Without the This week card, mayor takes 5 and news 7. At 1440×900, the alert status, the next trip, the weather, the brief preview and the 3 alerts are all visible without scrolling.
   Trip chart (mock for now): a line of today's travel time against the usual time across the morning (see drawTripChart in the sample), in plain SVG. The API only gives baseMinutes and delayMinutes for each trip, not a series over time, so build it on mock data and render it only when VITE_USE_MOCKS=true. With the real API, leave it out and show "Usually 35 min · today 47 min" as text from those two fields.
   This week (mock for now): a ring showing "4/5 trips on time" and one line of explanation. The backend doesn't track this, so build it on mock data and render it only when VITE_USE_MOCKS=true.
   Empty states: with no trips, the next-trip slot becomes "Add your weekly trips to get a leave time" with one button; an incomplete profile shows one setup prompt at the top, not several.

5. News (/news), a feed: "What's happening in Cebu?"
   Content: stories from GET /api/news (SunStar, Cebu Daily News, GNews; last 3 days): source, time, area, an alert badge when isAlert (then the alert type), headline, summary, image, and "Read on [source]" (opens in a new tab; no full article text is stored); an area filter; an "Alerts only" toggle; the updated time.
   Layout: a sticky glass filter card on top: an "Alerts only" toggle chip, then a segmented control with the stretchy mango pill, holding "All Cebu" and the towns from GET /api/areas, scrolling sideways. Below it, a main column of story cards (8 columns) and the "Right now" glance in the side column (4 columns).
   Story card (a glass panel): a source mark (initials in a circle) with the source name · time · area; the headline (bold, at most 2 lines); the summary (at most 2 lines); the image (16:9) when there is one; a footer with the alert chip (if any) and "Read on SunStar ↗". The headline and image open the article.
   Fetch limit=50 once and show 10 at a time (see <scrolling>); end with "You're all caught up · stories from the last 3 days".

6. Mayor (/mayor), a page like a Facebook Page: "What did my mayor post?"
   Content: the followed LGU (name, official and title, link to the official page); the note that Cebu City, Mandaue and Lapu-Lapu decide their own class suspensions and other towns follow the Province; posts from GET /api/lgu-posts/latest?limit=10 with caption ("See more"), images or video (thumbnail with a play icon, linking to Facebook), time, reaction/comment/share counts and a category badge ("Class suspension", "Traffic", …); a switcher for the other LGUs (their posts are mock for now); "Make this my mayor" (PATCH /api/profile with subscribedMayor).
   Layout: a glass page header spanning 12 columns: the cover art (see <design_system>), the LGU's initials avatar overlapping it, the LGU name and official, one primary button: "Make this my mayor", or a quiet "Following" state (optimistic, with an Undo toast), and the LGU switcher as a horizontal row of round avatars. Below it, the feed (8 columns) and the side column (4 columns) with an "About" card (the class-suspension note) and the "Right now" glance.
   Post card (a glass panel, in Facebook's anatomy): avatar, LGU name and time, category chip; the caption clamped to 4 lines with "See more" (expander); media (1 image full width, 2 side by side, 3 or more as one large plus smaller ones with "+N"); counts as quiet text ("4.8K reactions · 1.9K comments · 685 shares"); "View on Facebook ↗".
   End of the feed: "That's the latest 10 posts · See more on Facebook ↗".

7. Weather (/weather): "Will it rain where I'm going?"
   Content: an area picker; current conditions (temperature, condition, feels like, rain chance, humidity, wind, observed time); the next 24 hours (temperature and rain chance) with a table alternative; a rain map with an hour slider (per-area temperature and rain %) with a table alternative; weather and flood alerts (GET /api/alerts?type=weather,flood); a "PAGASA forecast & advisories" panel (tonight and tomorrow, thunderstorm advisories for Cebu towns, a 5-day outlook) that is mock for now.
   Layout: one view at a time.
   - Top row: "Now" for the chosen area in a glass card (5 columns): the looping live icon (92px), the temperature, the condition, feels like and the advice line from Today; rain, humidity and wind as one small row with count-ups; the area picker as a compact control (a sheet on phones). Beside it (7 columns), the hour strip in a glass card: a horizontal row (scroll-snap) with a still live icon, temperature and rain %.
   - Below it, a glass card (12 columns) with tabs: 24-hour chart · Rain map · Advisories.
     - 24-hour chart: the chart and "Show as a table".
     - Rain map: the map with the hour slider; Leaflet loads when this tab first opens.
     - Advisories: the weather and flood alerts as rows, then the PAGASA panel with the 5-day outlook. Until the backend provides PAGASA data, the panel shows only with mock data (`VITE_USE_MOCKS=true`), marked "Sample", and the alerts take the full width without it.

8. Traffic (/traffic): "What's in my way?"
   Content: "My commute": a trip picker, origin and destination markers with a dashed line labeled "approximate route", the leave time with reasons, and alerts on the way (GET /api/alerts?relevant=true) with their distance. "All Cebu": type and severity filters, a map with markers colored by severity and a legend, a list synced with the map, and a "busiest areas" ranking (alerts counted per areaName). Attribution: "© OpenStreetMap contributors" and "Traffic data © TomTom".
   Layout: a segmented control at the top: My commute · All Cebu.
   - Phones: the map in a glass card fills the screen above the tab bar; a bottom sheet peeks at about 35% height with the leave time and alerts on the way (My commute) or the alert list (All Cebu), and expands to full height. Filters open from a "Filters" button in their own sheet.
   - Desktop: the map in a glass card takes 8 columns; the side column (4 columns) holds the list and, on All Cebu, the filters and "Busiest areas" (top 5, collapsible).
   - Alert rows: live icon, title, "Adds about 9 min" or the distance, severity chip.
   - Selecting an alert, in the list or on the map, highlights both and shows its details (title, type, severity, area, time, source and the nearby places) in the sheet or the side column, not in a modal. Use the list's data or GET /api/alerts/:id.

9. Profile (/profile), settings: "Is my info right?"
   Content: your details (first name, display name, home city, address, the mayor to follow with the same class-suspension note, and the usual commute from/to); saved places (list with a kind icon; add and edit with a map pin-drop; delete, with a friendly message when a trip uses the place, the API's 409); weekly trips (title, day chips, arrive-by time, origin and destination); display settings ("Lite mode" and "Reduce animations" switches, saved in localStorage); sign out. Show API validation errors next to the matching field (error.details[].path).
   Layout: one section at a time: Your details, Saved places, Weekly trips, Display, Sign out.
   - Phones: a settings list; each row opens its section as its own screen (slide in, Back returns).
   - Desktop: the section list in a glass card (4 columns); the selected section in a glass card (8 columns).
   - Each section saves on its own with one "Save" button. Places and trips are edited in place or in a sheet, never in a modal.

Every page needs loading skeletons, empty states that teach the next step, and error states with a Retry button.
</pages>

<steps>
1. First, set up the skills (<skills>) and open docs/handoffs/frontend-sample.html in a browser. Then build the foundation only: tokens and the font in src/index.css, the inline script and static shell in index.html, QueryClient defaults, route-level code splitting, Sky, Lite mode and still mode, the theme switch, the app shell (header, nav rail, tab bar, stretchy pills, the bell), MotionConfig + LazyMotion with the page transitions, and the core components (Button with every state, Chip, SeverityBadge, Card, Avatar, Sheet, Tabs and SegmentedControl, Skeleton, Toast, LiveIcon, RollNumber, RiseWords). Also write a one-line layout sketch for each page. Then STOP and wait for my approval.
2. After approval, build in this order: home page with the jeepney ride (sign in, sign up), onboarding → Today → News → Mayor → Weather → Traffic → Profile.
3. After each page, run the ui-ux-pro-max pre-delivery checklist, an Impeccable critique and detector scan, and a Lighthouse Mobile check, then output: ✅ what was built, files changed, the Lighthouse scores, and how you verified it.
</steps>

<done_when>
- `npm --prefix frontend run build` passes, within the <performance> JavaScript budget.
- Every page renders correctly at 375px, 768px, 1024px and 1440px with VITE_USE_MOCKS=true, in light and dark mode, with no horizontal scroll.
- Every item under "Content" in <pages> is present and reachable.
- Lighthouse Mobile meets the <performance> targets on the home page, Today and News.
- Switching between sign in and sign up matches the first ride table in <motion>: the jeepney is hidden until the press, the smoke is cartoon style and stays on the card, the hero doesn't move, and the new form is usable 0.6 s after the press.
- A successful log-in covers the whole screen with the same smoke and clears onto the destination. A failed log-in shows an error with no jeepney.
- The only icons that loop are the ones listed as looping in <icons>. The tab bar, nav rail and header don't move; the bell rings only when a new alert arrives. No live icon repaints on every frame while it loops (Chrome DevTools → Rendering → Paint flashing).
- In still mode, both from the device setting and from Profile's switch, nothing moves and every value and icon is complete.
- The sky changes with the Manila time and the user's weather, and pauses when the tab is hidden.
- The ui-ux-pro-max checklist passes, and Impeccable's detector reports nothing on any page. One known exception: the detector can't see the sky, so it may report white hero text as low contrast on the home page. Check that text by hand against the shade in <pages>.
- No files outside frontend/ have changed.
Stop and report if the build fails twice in a row.
</done_when>
~~~
