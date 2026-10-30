# Frontend handoff: pages, design system, motion and performance

- **For:** the frontend team (@gnthril, @Tiamporado) and their AI coding agents
- **From:** @En1gM-a, October 2026
- **State:** the backend API is finished (PR #25); the frontend is still the scaffold.

This is the spec for SugboNow's frontend: every page, the "Sinulog" design system, the performance budget
and the motion rules. The API is done, so every page can be built now on mock data (`VITE_USE_MOCKS=true`)
and switched to the real API later.

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

**Reading it yourself.** The prompt doubles as the spec: pages are in `<pages>`, colors and fonts in
`<design_system>`, speed rules in `<performance>`, animation rules in `<motion>` and finishing details in
`<polish>`. When they clash, speed comes first, then accessibility, then looks.

Related: data shapes are in [`docs/api-contract.md`](../api-contract.md), and the design skills are described
in [`docs/claude-code-skills.md`](../claude-code-skills.md). This is not
[`docs/claude-handoff.md`](../claude-handoff.md), which is a tool that moves a long Claude Code session into a
fresh one.

## The prompt

~~~text
<role>
You are a senior frontend engineer and UI designer working on SugboNow, a Cebu daily-intelligence web app. You build polished, accessible, fast, mobile-first React interfaces.
</role>

<context>
- Stack (already set up in frontend/): React 19 + TypeScript (strict) + Vite, Tailwind CSS v4 (@tailwindcss/vite), React Router, TanStack Query, Supabase Auth, Leaflet + react-leaflet, MSW.
- Existing files: src/lib/apiClient.ts (sends the Supabase token), src/lib/supabaseClient.ts, src/hooks/useLguPosts.ts, src/types/api.ts (only LGU post types so far), src/main.tsx (QueryClientProvider already wired). Empty stubs to fill in: src/context/AuthContext.tsx, src/mocks/handlers.ts, src/mocks/browser.ts, src/utils/format.ts. App.tsx is a placeholder.
- public/mockServiceWorker.js is from MSW 2.15.0, but the msw package is now 3.x. Regenerate it before wiring mocks (inside frontend/: `npx msw init public/ --save`) and use the MSW 3 API.
- The backend API is finished. Every endpoint and JSON shape is in docs/api-contract.md. Read it before building any page; it is the only source of truth for data.
- Design skills: set up and use ui-ux-pro-max, impeccable and motion as described in <skills>, before anything else.
</context>

<rules>
- Only create or edit files inside frontend/. NEVER change backend/, supabase/, docs/, .github/ or root config.
- The browser MUST NOT call outside data sources (news sites, PAGASA, TomTom, Facebook, Google Maps). All data comes from the SugboNow API (/api/...) via TanStack Query hooks in src/hooks/. Only exceptions: Supabase Auth, OpenStreetMap map tiles (with attribution), and showing the image URLs the API returns (news thumbnails, Facebook post media) in <img> tags.
- Data access lives in hooks, never directly in components.
- Add the missing TypeScript types to src/types/api.ts, mirroring docs/api-contract.md exactly.
- Build MSW handlers and fixtures (src/mocks/handlers.ts, src/mocks/data/) matching the contract, so every page works with VITE_USE_MOCKS=true. Where the API doesn't offer something yet (marked "mock for now" below), design it with mock data only.
- Motion (formerly Framer Motion) is pre-approved: add it with `npm --prefix frontend install motion` on your first branch, and import from `motion/react` and `motion/react-m`. Never install or import `framer-motion`.
- Installing the three skills in <skills> is pre-approved. They go in your user folder (~/.claude/skills), not the project, and they are not dependencies of frontend/.
- Stop and ask before adding any OTHER npm dependency (e.g. lucide-react for icons, a chart library, a query-cache persister), touching anything outside frontend/, or pushing or opening a PR.
- Work on one branch per chunk (e.g. frontend/design-system, frontend/auth, frontend/dashboard).
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
When a skill disagrees with this prompt, this prompt wins. The <design_system>, <performance> and <motion> rules are decided: don't let a skill change the palette, the fonts or the Sinulog look, or add effects that break the performance budget.
</skills>

<design_system>
Theme: "Sinulog". Festive, warm and unmistakably Cebuano, inspired by the Sinulog festival and the Santo Niño. It must look clearly different from our school's colors (CIT-U maroon and gold): a multi-color festival palette, never a two-tone maroon-and-gold look.

Style (from ui-ux-pro-max): real-time monitoring dashboard on a bento grid of rounded cards. Clear status indicators, scannable, generous but efficient spacing, cards stack on mobile.

Color tokens (define with @theme in src/index.css):
| Token | Hex | Use |
| --- | --- | --- |
| brand / sinulog-red | #C8102E | Identity only: logo, Sinulog ribbon, active nav indicator, brief accent. NOT buttons or alert meaning |
| secondary / marigold | #F5A623 | Highlights, badges, festive accents. Dark text only, never white |
| cta / mactan-sea | #0E7490 | Primary buttons and links (white text 5.4:1) |
| surface-dark / mactan-navy | #14213D | Header and nav bars (white text) |
| background / candle-ivory | #FFF8EC | Page background |
| surface | #FFFFFF | Cards; borders #E7E5E4 |
| text | #1C1917 | Body text; muted text #57534E (7.2:1 on ivory) |
| status-high | #B91C1C | Severity high (white 6.5:1) |
| status-medium | #B45309 | Severity medium (white 5.0:1) |
| status-low | #475569 | Severity low and info (white 7.6:1) |
| status-ok | #15803D | Success (white 5.0:1) |
Sinulog ribbon: a 4px linear-gradient(90deg, #C8102E, #F5A623, #0E7490, #15803D) band on the header and featured cards.

Typography (ui-ux-pro-max "Modern Professional"; Google Fonts link in index.html, no npm package): headings Poppins 600/700, body Open Sans 400/600, body at least 16px, line-height 1.5–1.75, tabular figures for times and temperatures.

UX rules (ui-ux-pro-max): 4.5:1 text contrast, visible focus rings, 44x44px touch targets, cursor-pointer and hover feedback on every clickable element, SVG icons only (no emoji icons), severity shown as icon + label (never color alone), alt text on images, labeled form inputs. Responsive at 375, 768, 1024 and 1440px with no horizontal scroll: bottom tab bar on phones, top nav on desktop.

Cebuano touches: "Maayong buntag/hapon/gabii, {firstName}!" greeting; a "Naay klase?" chip on class advisories.

NEVER use the Santo Niño's image, the CIT-U logo or seal, or official Sinulog Festival logos. Original abstract motifs only.
</design_system>

<performance>
Performance is the top priority: information must be on screen almost instantly, even on a cheap Android phone on slow mobile data. When a visual idea costs speed, speed wins; accessibility comes second.

Targets (Lighthouse "Mobile" in Chrome DevTools, on the production build: `npm run build`, then `npm run preview`):
- Performance ≥ 90, Accessibility ≥ 95 and Best Practices ≥ 95 on Login, Dashboard and News.
- LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms.
- JavaScript downloaded on the first visit (the entry chunk plus everything it imports) ≤ 200 KB gzipped. Vite prints gzip sizes after each build.

First paint:
- Put a static app shell inside #root in index.html (the navy header, the Sinulog ribbon and a few grey skeleton blocks, in plain HTML and CSS), so a slow phone shows the layout before any JavaScript runs. React replaces it on mount.
- No splash screens, intro animations or full-page spinners.
- Fonts: preconnect to fonts.googleapis.com and fonts.gstatic.com (crossorigin), load only Poppins 600/700 and Open Sans 400/600 with display=swap, and set a system-font fallback so text shows at once.

Code loading:
- Split every route with React.lazy + Suspense, except Login and Dashboard.
- Leaflet loads only on Traffic, Weather and the Profile pin-drop, and on the Dashboard mini map once it scrolls into view (show a placeholder until then). Draw alert dots as circle markers with preferCanvas.
- No heavy libraries: format dates with Intl.DateTimeFormat and Intl.RelativeTimeFormat (timeZone "Asia/Manila"); no moment, date-fns, lodash or UI kits; draw the weather chart in plain SVG unless a chart library is approved.

Data (TanStack Query; set the defaults in src/main.tsx):
- Set staleTime from the "Data freshness" table in docs/api-contract.md, so the app never refetches faster than the backend updates: alerts and the brief 5 min (leave times are recomputed from current alerts), weather 15 min, news and mayor posts 10 min. Profile, places and trips never go stale on their own; invalidate them after your own edits. Refetch alerts every 5 minutes while the tab is visible.
- Every Dashboard tile runs its own query, in parallel, with its own skeleton and error state, so one slow endpoint never holds back the others. No request waterfalls.
- After the first load, never blank a screen: keep showing cached data while refetching, use placeholderData: keepPreviousData for filters, and show "Updated 3 min ago" instead of a spinner.
- When a nav link is hovered, focused or touched, preload that page's chunk and prefetch its main query (queryClient.prefetchQuery), so the page opens with its data.
- Use optimistic updates for profile, place and trip edits; roll back with a toast if the API refuses.
- Persisting the query cache for instant repeat visits would need a new dependency (a TanStack Query persister): ask first. If it's approved, clear the cache on sign-out.

Rendering:
- Images: fixed aspect-ratio boxes (no layout shift), loading="lazy" below the fold, decoding="async", a neutral placeholder, and an onError fallback (Facebook media URLs expire).
- Long lists render about 20 items with "Show more"; give list items below the fold content-visibility: auto with a contain-intrinsic-size.
- Solid surfaces only: no backdrop-filter blur or glass effects, no background videos or large decorative images.
- The weather hour slider restyles the existing markers (it never re-creates the map) and uses useDeferredValue, so dragging stays smooth.

Test like a slow phone: Chrome DevTools with CPU throttling at 6x slowdown and the "Slow 4G" network preset, and on a real low-end Android phone over USB debugging if anyone has one.
</performance>

<motion>
Animation confirms what happened (feedback, a change of state, where something came from) and never makes anyone wait. Content is never hidden behind an animation or behind JavaScript. If an animation doesn't explain something, leave it out.

Which tool:
- CSS (Tailwind transitions and keyframes) for hover, press and focus states, color changes, switches and segmented controls, content fading in on mount, the first-load stagger, skeletons and spinners. It needs no JavaScript, so it works from the first frame.
- Motion only where CSS can't do the job: exit animations (toasts, sheets, dialogs, menus) with AnimatePresence, height: "auto" expanders, and swapping a live value.
- Load Motion the light way: <LazyMotion features={loadFeatures} strict> with m components, where loadFeatures dynamically imports a file that exports domAnimation. The first render then carries about 5 KB of Motion instead of about 43 KB, and the 24 KB of features arrive after it. m components don't animate until the features load, so never use Motion for anything that must be visible on the first render (no initial={{ opacity: 0 }} on content).
- Ask first before using domMax, layout or layoutId animations, drag, scroll-linked effects or parallax.

Timing (put the easing and duration tokens in src/index.css):
- Ease-out cubic-bezier(0.22, 1, 0.36, 1) for entering and hover; ease-in cubic-bezier(0.32, 0, 0.67, 0) for leaving.
- Press 100 ms; hover and color 150 ms; switches 200 ms; entering 180–200 ms; leaving 150 ms; sheets and dialogs up to 300 ms. Nothing runs longer than 400 ms except the skeleton pulse.
- Motion springs: { type: "spring", visualDuration: 0.3, bounce: 0 }. Nothing about alerts overshoots; playful bits like the success check may use bounce 0.15 at most.
- Animate only transform and opacity. Never animate width, height (except the small Motion expanders), top/left, margins, box-shadow, filter or backdrop-filter.

Buttons (one shared Button component with every state):
- Press: scale to 0.97 (active:scale-[0.97], 100 ms). It needs no JavaScript, so it works before Motion loads.
- Hover: one shade darker, 150 ms. Tailwind v4's hover: only applies on devices that can hover, so phones never get stuck hover states. The primary button also fades in a soft shadow: put the shadow on a pseudo-element and animate its opacity, never box-shadow itself.
- Focus: a 2px ring with a 2px offset that appears instantly (marigold on the navy bars).
- Loading: keep the button's width, fade the label out and a small spinner in, set aria-busy, and disable the button until the request finishes.
- Success ("Saved"): the icon becomes a check that scales in from 0.85 with a fade (150 ms), then the button returns to normal after about 1.2 s.
- Arrow links ("See all"): the arrow moves 2px to the right on hover.

Other components:
- Clickable cards: on hover, the border tints and the shadow fades in (pseudo-element opacity); on press, scale to 0.99. They never lift on touch screens.
- Switches and segmented controls ("Alerts only", "My commute / All Cebu", day chips): the thumb or indicator slides with a CSS transform, 200 ms. With equal-width segments the indicator just moves by translateX(index × 100%).
- Page change: the new page fades in with a 6px rise, 180 ms, using CSS keyframes. Enter only: no exit animation, and never AnimatePresence mode="wait" between routes, because it holds the next page back.
- First Dashboard load: tiles fade up 30 ms apart (CSS animation-delay), at most 6 tiles, and only the first time the Dashboard mounts in a session. Data that arrives later fades in where its skeleton was (150 ms).
- Live values: when a leave time, temperature or alert count changes on refetch, the old value slides up and out while the new one slides in (AnimatePresence initial={false} mode="popLayout", 4px, 150 ms, inside a position: relative parent). Use tabular-nums so digits don't jump.
- New alerts fade in at the top of the list and are announced with aria-live="polite".
- High-severity alerts: a soft marigold "candle glow" on a pseudo-element (opacity pulse), 2 cycles, then it stops. Never infinite.
- Expanders (leave-time reasons, "See more" captions): Motion height: "auto", 200 ms, small content only.
- Toasts, sheets and dialogs: enter with the spring above (toasts rise 16px, sheets slide up from the bottom) and leave with a 150 ms fade. Use a solid dim overlay, never a blur.
- Skeletons: a soft opacity pulse, shaped exactly like the content they stand in for.

Reduced motion: wrap the app in <MotionConfig reducedMotion="user">, which turns off transform animations and keeps fades for people who ask for reduced motion. In CSS, use motion-reduce: variants to remove movement (keep short fades) and stop the skeleton pulse.
</motion>

<polish>
The premium feel comes from consistency and care, not from effects.
- One spacing scale (Tailwind's 4px steps), one radius scale (cards rounded-2xl, buttons and inputs rounded-xl, chips and badges rounded-full), two shadow levels, and hairline borders in #E7E5E4.
- Headings use tracking-tight; times, temperatures and counts use tabular-nums; brief text stays within about 70 characters per line; hierarchy comes from size and weight, not extra colors.
- Every state is designed: skeletons match the final layout; empty states have helpful copy, an action and a small original illustration (abstract ribbon motif); errors use plain language and a Retry button; offline, a banner says "You're offline. Showing info from 7:42 AM." above the cached data.
- Live data always shows when it was updated ("Updated 3 min ago").
- Prefer an undo toast to a confirmation dialog for reversible actions.
- Add a skip-to-content link, and move focus to the page's h1 on every route change.
- Phone details: <meta name="theme-color" content="#14213D"> so the browser bar matches the header, and viewport-fit=cover in the viewport meta so the bottom tab bar can pad itself with env(safe-area-inset-bottom).
</polish>

<pages>
Routes: /login, /signup, then protected pages / (Dashboard), /news, /mayor, /weather, /traffic, /profile. Signed-out users are redirected to /login. Add an AuthContext and a ProtectedRoute.

1. Login (/login): email and password (Supabase Auth), show/hide password, inline errors, "Forgot password?" (Supabase reset email), link to Sign Up.

2. Sign Up (/signup): name, email, password and confirm. Show a "check your email" state if confirmation is required. Then a skippable 3-step onboarding:
   (1) first name and home city, from GET /api/areas;
   (2) which mayor to follow, from GET /api/lgu-sources. Explain that Cebu City, Mandaue and Lapu-Lapu decide their own class suspensions, and every other town follows the Province of Cebu;
   (3) add home/school/work places and a first weekly trip.
   Saves with PATCH /api/profile, POST /api/locations and POST /api/schedule.

3. Dashboard (/): a bento grid summarizing every section.
   - Cebuano greeting, date, and a current-weather chip.
   - "Cebu Daily Brief" card (the largest tile) showing brief.content from GET /api/brief/today, as plain text with line breaks. Label it "AI summary".
   - Leave-time cards from leaveTimes, e.g. "Leave by 6:50 AM for School (arrive 7:30) · +20 min traffic near Home", with the reasons expandable.
   - "Alerts near you": the top 5 from the brief's alerts, with severity badges.
   - Weather snapshot: now, plus the next 6 hours of rain chance.
   - A mini map of the user's places and nearby alerts, linking to /traffic. It loads Leaflet only when it scrolls into view.
   - "From your mayor": the latest 1–2 posts, linking to /mayor.
   - "Top Cebu news": 3 items from GET /api/news?limit=3, linking to /news.
   - On sign-in, call POST /api/lgu-posts/refresh once.
   - Empty states for new users (no places or trips yet) with buttons to set them up.

4. Cebu News (/news): headlines from GET /api/news (SunStar, Cebu Daily News, GNews).
   - Each card: image, title, short summary, source badge, area, "2h ago".
   - Filter by area; an "Alerts only" toggle (isAlert).
   - "Read on [source]" opens the article in a new tab. No full article text is stored.

5. Mayor FB (/mayor): the followed mayor's last 10 posts from GET /api/lgu-posts/latest?limit=10.
   - Header card: official name and title, page link, avatar using initials.
   - Each post: caption with "See more", media grid (images; video thumbnails with a play icon, linking to Facebook), time, reaction/comment/share counts, and a category badge ("Class suspension", "Traffic", …).
   - A switcher (Cebu City, Lapu-Lapu, Mandaue, Province) to browse other mayors; their posts are mock for now.
   - "Make this my mayor" calls PATCH /api/profile with subscribedMayor.

6. Weather (/weather): in-depth weather from GET /api/weather (9 Metro Cebu areas, current conditions plus 24 hourly forecasts).
   - "Your area": a large current-conditions card, plus a 24-hour chart (temperature line, rain-chance bars). Ask before adding a chart library, or build it with plain SVG.
   - PAGASA-style Cebu map: Leaflet map with a marker per area showing an icon, temperature and rain chance, colored by rain chance. An hour slider over the next 24 hours answers "when will it rain where?".
   - Weather and flood alerts: GET /api/alerts?type=weather,flood.
   - A "PAGASA forecast & advisories" panel (tonight/tomorrow forecast, 5-day outlook, thunderstorm advisories for Cebu towns): mock for now.

7. Traffic Map (/traffic): Leaflet + OpenStreetMap, no Google Maps. Show attribution for "© OpenStreetMap contributors" and "Traffic data © TomTom".
   - "My commute" view: origin and destination markers (from the profile's commute places, or a chosen trip), a dashed straight line labeled "approximate route", alerts near those places (GET /api/alerts?relevant=true) in a side list, and the leave-time summary.
   - "All Cebu" view: traffic, closure and flood alerts (GET /api/alerts?type=traffic,closure,flood) as markers colored by severity, with a legend, type/severity filters, and a list synced with the map. Add a "busiest areas" ranking that counts alerts per areaName.

8. Profile (/profile):
   - Edit display name, first name, home city, address, followed mayor (with the same HUC explanation), and commute origin/destination: GET/PATCH /api/profile.
   - Saved places manager: list, add and edit with a map pin-drop for coordinates, plus a kind icon (home/school/work/other). Uses /api/locations.
   - Weekly trips manager: title, day chips, arrive-by time, origin/destination dropdowns. Uses /api/schedule.
   - Sign out.
   - Show API validation errors next to the matching field (error.details[].path). A 409 when deleting a place used by a trip shows a friendly message.

Every page needs loading skeletons, empty states and error states with a Retry button.
</pages>

<steps>
1. First, set up the skills (<skills>). Then build the foundation only: tokens in src/index.css, fonts, the static app shell in index.html, QueryClient defaults, route-level code splitting, MotionConfig + LazyMotion, and the core components (Button with every state, Card, Badge, SeverityBadge, SinulogRibbon, Skeleton, Toast, AppShell with nav). Also write a one-line layout sketch for each page. Then STOP and wait for my approval.
2. After approval, build in this order: auth (Login, Sign Up, onboarding) → Dashboard → Cebu News → Mayor FB → Weather → Traffic Map → Profile.
3. After each page, run the ui-ux-pro-max pre-delivery checklist, an Impeccable critique and detector scan, and a Lighthouse Mobile check, then output: ✅ what was built, files changed, the Lighthouse scores, and how you verified it.
</steps>

<done_when>
- `npm --prefix frontend run build` passes, within the <performance> JavaScript budget.
- Every page renders correctly at 375px and 1440px with VITE_USE_MOCKS=true.
- Lighthouse Mobile meets the <performance> targets on Login, Dashboard and News.
- The ui-ux-pro-max checklist passes, and Impeccable's detector flags nothing except what this spec requires (such as Open Sans and the ivory background).
- No files outside frontend/ have changed.
Stop and report if the build fails twice in a row.
</done_when>
~~~
