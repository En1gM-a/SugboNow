# Frontend handoff: pages, layout, design system, motion and performance

- **For:** the frontend team (@gnthril, @Tiamporado) and their AI coding agents
- **From:** @En1gM-a, October 2026
- **State:** the backend API is finished (PR #25); the frontend is still the scaffold. The first full build (PR #27) was closed: it had the right content on every page, but the pages were cluttered and the look felt generic.

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
`<design_system>`, speed rules in `<performance>`, animation in `<motion>` and scrolling in `<scrolling>`. When
they clash, speed comes first, then accessibility, then looks.

## What changed after PR 27

- **PR 27's content is the checklist.** Everything it showed on each page belongs in the app; each page in
  `<pages>` lists it under "Content". Its data layer (types, hooks, mocks) may be reused. Its look may not.
- **Less on each screen.** Every page has one main job. Details wait behind "Read more", tabs, sheets or another
  page, and lists stop at about five items.
- **A familiar layout.** News, Mayor, Weather, Traffic and Profile follow Facebook's layout: a top bar, a center
  column, side rails on desktop, and a bottom tab bar on phones. "Today" (the dashboard) gets its own calmer layout
  with one big answer at the top.
- **A less generic look.** The device's own font (nothing to download), a cool grey page, white cards only for
  feed items, and the Sinulog colors as accents, with the ribbon used once.
- **More interactive.** Motion page transitions that slide in the direction you tap, smooth auth transitions,
  sheets and expanders instead of modals, and rules for scrolling.

Related: data shapes are in [`docs/api-contract.md`](../api-contract.md), and the design skills are described
in [`docs/claude-code-skills.md`](../claude-code-skills.md). This is not
[`docs/claude-handoff.md`](../claude-handoff.md), which is a tool that moves a long Claude Code session into a
fresh one.

## The prompt

~~~text
<role>
You are a senior frontend engineer and product designer working on SugboNow, a Cebu daily-intelligence web app. You build calm, fast, accessible, mobile-first React interfaces that people trust at first sight.
</role>

<context>
- Stack (already set up in frontend/): React 19 + TypeScript (strict) + Vite, Tailwind CSS v4 (@tailwindcss/vite), React Router (data router), TanStack Query, Supabase Auth, Leaflet + react-leaflet, MSW.
- Existing files: src/lib/apiClient.ts (sends the Supabase token), src/lib/supabaseClient.ts, src/hooks/useLguPosts.ts, src/types/api.ts (only LGU post types so far), src/main.tsx (QueryClientProvider already wired). Empty stubs to fill in: src/context/AuthContext.tsx, src/mocks/handlers.ts, src/mocks/browser.ts, src/utils/format.ts. App.tsx is a placeholder.
- public/mockServiceWorker.js is from MSW 2.15.0, but the msw package is now 3.x. Regenerate it before wiring mocks (inside frontend/: `npx msw init public/ --save`) and use the MSW 3 API.
- The backend API is finished. Every endpoint and JSON shape is in docs/api-contract.md. Read it before building any page; it is the only source of truth for data.
- A first build, PR #27 (closed; branch frontend/sinulog-ui), had the right content on every page; <pages> lists that content under "Content" for each page. Its layout and look were rejected: don't copy its card grid, fonts, colors or page structure. You may reuse its data layer after checking it against docs/api-contract.md: src/types/api.ts, src/lib/apiClient.ts, src/lib/queries.ts, the hooks in src/hooks/, src/context/AuthContext.tsx, and the MSW handlers and fixtures in src/mocks/. Read them with `git fetch origin frontend/sinulog-ui` and `git show origin/frontend/sinulog-ui:frontend/<path>`.
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
- Work on one branch per chunk (e.g. frontend/design-system, frontend/auth, frontend/today).
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
When a skill disagrees with this prompt, this prompt wins. The <layout>, <design_system>, <performance>, <motion> and <scrolling> rules are decided: don't let a skill change the palette, the fonts or the layout, or add effects that break the performance budget.
</skills>

<layout>
SugboNow is a tool people check several times a day, often on a phone on the way somewhere. Every screen answers one question, and everything else waits behind a tap.

Hierarchy on every screen:
- One primary element: the answer to the page's question (e.g. "Leave by 6:55 AM"). It is the largest and comes first.
- A few secondary items, each readable at a glance.
- Everything else behind progressive disclosure: "Read more", tabs, a bottom sheet, or another page. Never show every detail at once.
- About five items per list before "See all" or "Show more".
- One primary button per screen; other actions are text or icon buttons.

App shell for signed-in pages, modeled on Facebook's layout (its structure, never its branding):
- Phones (< 768px): a slim navy top bar (logo, live status, profile avatar) that hides while scrolling down and returns on scrolling up; a bottom tab bar with 5 tabs: Today, News, Mayor, Weather, Traffic. Profile opens from the avatar. Content is one column.
- Tablets (768–1023px): the top bar stays visible and carries the 5 tabs; the bottom bar goes away; content is one centered column, max 680px.
- Desktop (≥ 1024px): the top bar has the logo on the left, the 5 tabs in the center (icon + label; the active tab is underlined in sinulog-red) and the avatar on the right. Below it, three columns: a left rail (240px, sticky) for the page's own navigation or filters, a center column (max 680px) for the page's main content, and a right rail (320px, sticky, from 1280px) with the "Right now" glance.
- "Right now" glance (right rail, on every page except Today): the next leave time, the current weather with the rain chance, and the number of high-severity alerts near the user's places, each linking to its page. Today doesn't show it, because Today is that content.
- Feed pages (News, Mayor): the center column is a single column of post cards, like a Facebook feed.
- Map pages (Traffic, and Weather's rain map): the map takes the center and right columns; its list sits in the left rail on desktop and in a bottom sheet on phones.
- Today has no rails: it uses its own two-column layout (see <pages>).
- Settings-style pages (Profile): the left rail lists the sections on desktop; phones show the list first and open each section as its own screen.
</layout>

<interaction>
The app should feel alive to the touch without slowing anything down.
- Every tap answers within 100 ms: press states on buttons, rows and cards (CSS), and the screen changes at once (cached data, optimistic updates).
- Details open in place: expanders for the brief, trip reasons and long captions; on phones, bottom sheets for alert details, filters and the area picker. No modal dialogs for these.
- Map and list stay in sync on Traffic and Weather: tapping a row highlights its marker, and tapping a marker highlights its row.
- Following a mayor, saving a place or a trip updates the screen first, then confirms with a toast that has Undo.
- Live data shows that it's live: "Updated 2 min ago", the live dot in the top bar, values that roll when they change, and "New stories" or "New alerts" pills.
- Use the browser's own pull-to-refresh; don't build a custom one.
</interaction>

<design_system>
Direction: an everyday tool for Cebuanos, as familiar as a feed app, with the Sinulog festival colors used sparingly so it stays recognizably SugboNow. It must look clearly different from our school's colors (CIT-U maroon and gold): never a two-tone maroon-and-gold look.

Color tokens (define with @theme in src/index.css):
| Token | Hex | Use |
| --- | --- | --- |
| page | #EEF1F4 | Page background: a cool light grey |
| surface | #FFFFFF | Feed cards, sheets, menus, inputs; hairline borders #E2E6EA |
| ink | #1C1E21 | Body text |
| muted | #5B6470 | Secondary text (5.3:1 on page, 6.0:1 on white) |
| mactan-sea | #0E7490 | Primary buttons, links, selected tabs and chips (white text 5.4:1) |
| mactan-navy | #14213D | Top bar and the phone tab bar (white text) |
| sinulog-red | #C8102E | Identity only: the logo and the active tab underline. NOT buttons or alert meaning |
| marigold | #F5A623 | Small highlights only, such as the "Naay klase?" chip. Dark text only, never white |
| status-high | #B91C1C | Severity high (white 6.5:1) |
| status-medium | #B45309 | Severity medium (white 5.0:1) |
| status-low | #475569 | Severity low and info (white 7.6:1) |
| status-ok | #15803D | Success and "all clear" (white 5.0:1) |
Sinulog ribbon: a 3px linear-gradient(90deg, #C8102E, #F5A623, #0E7490, #15803D) band under the top bar. Use it there only.

Typography: one family, the device's own UI font, so nothing downloads and text appears instantly: font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif. No web fonts.
- A fixed rem scale, not fluid: 12, 14, 16 (body), 20, 24, and 32 for the single hero value on a screen (e.g. the leave time). Weights 400, 600 and 700.
- Body at least 16px on phones, line-height 1.5; tabular-nums for times, temperatures and counts.
- Hierarchy comes from size, weight and space, not from extra colors or boxes.

Shape and depth: radius 8px for cards, sheets and inputs; fully round for chips and avatars. Cards on the grey page get a hairline border and no shadow; one soft shadow is reserved for sheets, menus and toasts.
Icons: one SVG set as inline components, 20px in content and 24px in the tab bar, one consistent stroke.

Avoid the generic AI-made look (Impeccable's critique and detector check this):
- Don't build pages out of same-size cards that each have an icon, a heading and a "See all →" link. Give each block the shape its content needs. On Today, separate sections with space and dividers; cards are for feed items.
- No staggered "everything fades up" page loads, gradient text, glass or blur, emoji icons, small labels above headings, colored left borders on cards or alerts, or decorative numbering.
- Write short copy in people's own words, with Cebuano touches where they fit: "Maayong buntag/hapon/gabii, {firstName}!", a "Naay klase?" chip on class advisories, and "Ingat sa dalan!" in the all-clear state.

UX rules (ui-ux-pro-max): 4.5:1 text contrast, visible focus rings, 44x44px touch targets, cursor-pointer and hover feedback on every clickable element, SVG icons only, severity shown as icon + label (never color alone), alt text on images, labeled form inputs. Responsive at 375, 768, 1024 and 1440px with no horizontal scroll.

NEVER use the Santo Niño's image, the CIT-U logo or seal, or official Sinulog Festival logos. Original abstract motifs only (e.g. the ribbon art on the login panel and the Mayor page cover).
</design_system>

<performance>
Performance is the top priority: information must be on screen almost instantly, even on a cheap Android phone on slow mobile data. When a visual idea costs speed, speed wins; accessibility comes second.

Targets (Lighthouse "Mobile" in Chrome DevTools, on the production build: `npm run build`, then `npm run preview`):
- Performance ≥ 90, Accessibility ≥ 95 and Best Practices ≥ 95 on Login, Today and News.
- LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms.
- JavaScript downloaded on the first visit (the entry chunk plus everything it imports) ≤ 200 KB gzipped. Vite prints gzip sizes after each build.

First paint:
- Put a static app shell inside #root in index.html (the navy top bar, the ribbon and a few grey skeleton blocks on the page color, in plain HTML and CSS), so a slow phone shows the layout before any JavaScript runs. React replaces it on mount.
- No splash screens, intro animations or full-page spinners.
- System fonts only, so there are no font files to download or swap.

Code loading:
- Split every route with React.lazy + Suspense, except Login, Sign up and Today. Sign up stays in the first download (about 1.5 KB) so the Login ↔ Sign up transition never waits for the network; load onboarding with a route-level lazy (see <motion>).
- Leaflet loads only on Traffic, when Weather's rain-map tab first opens, and for the Profile pin-drop. Today has no map. Draw alert dots as circle markers with preferCanvas.
- No heavy libraries: format dates with Intl.DateTimeFormat and Intl.RelativeTimeFormat (timeZone "Asia/Manila"); no moment, date-fns, lodash or UI kits; draw the weather chart in plain SVG unless a chart library is approved.
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
- Solid surfaces only: no backdrop-filter blur or glass effects, no background videos or large decorative images.
- The weather hour slider restyles the existing markers (it never re-creates the map) and uses useDeferredValue, so dragging stays smooth.

Test like a slow phone: Chrome DevTools with CPU throttling at 6x slowdown and the "Slow 4G" network preset, and on a real low-end Android phone over USB debugging if anyone has one.
</performance>

<motion>
Animation confirms what happened (feedback, a change of state, where something came from) and never makes anyone wait. Content is never hidden behind an animation or behind JavaScript. If an animation doesn't explain something, leave it out.

Which tool:
- CSS (Tailwind transitions and keyframes) for hover, press and focus states, color changes, switches and segmented controls, skeletons and spinners. It needs no JavaScript, so it works from the first frame.
- Motion for what CSS can't do: page transitions inside the app, onboarding steps, exit animations (sheets, toasts, menus) with AnimatePresence, height: "auto" expanders, and swapping a live value.
- The browser's View Transitions API (through React Router's viewTransition) for the auth flow, because those moves cross different layouts.
- Load Motion the light way: <LazyMotion features={loadFeatures} strict> with m components, where loadFeatures dynamically imports a file that exports domAnimation. The first render then carries about 5 KB of Motion instead of about 43 KB, and the 24 KB of features arrive after it. m components don't animate until the features load, so never use Motion for anything that must be visible on the first render (no initial={{ opacity: 0 }} on content).
- domAnimation covers everything in this spec. Ask first before using domMax, layout or layoutId animations, or drag.

Timing (put the easing and duration tokens in src/index.css):
- Ease-out cubic-bezier(0.22, 1, 0.36, 1) for entering and hover; ease-in cubic-bezier(0.32, 0, 0.67, 0) for leaving.
- Press 100 ms; hover and color 150 ms; switches 200 ms; entering 180–220 ms; leaving 120–150 ms; sheets up to 300 ms. Nothing runs longer than 400 ms except the skeleton pulse.
- Motion springs: { type: "spring", visualDuration: 0.3, bounce: 0 }. Nothing about alerts overshoots; playful bits like the success check may use bounce 0.15 at most.
- Animate only transform and opacity. Never animate width, height (except the small Motion expanders), top/left, margins, box-shadow, filter or backdrop-filter.

Page transitions (Motion, in the app shell):
- Only the content area moves; the top bar, tabs, rails and tab bar stay still.
- Direction follows the tab order Today, News, Mayor, Weather, Traffic: moving right, the new page slides in from 16px to the right while fading in; moving left, from the left. Profile and other pages without a tab just fade in.
- Enter: { type: "spring", visualDuration: 0.22, bounce: 0 }. Exit: opacity only, 120 ms ease-in.
- Wrap the routed content in <AnimatePresence mode="popLayout" initial={false} custom={direction}> inside a position: relative parent, keyed by pathname (not search params, so filter changes don't animate the page). Render the outlet through a small component that keeps the useOutlet() value it had when it mounted, so the leaving page keeps showing its own content.
- Never use mode="wait": the next page must never wait for the old one to leave.
- No animation on the first load (initial={false}).

Auth transitions (React Router's viewTransition; no JavaScript animation):
- Login ↔ Sign up: the form card slides out and the new one slides in (32px; old 160 ms ease-in, new 280 ms ease-out), moving forward to Sign up and back to Login; the login story panel and the phone top bar stay still.
- Signing in, and Sign up → onboarding → Today: the form card lifts away (16px up, scale 0.97, 200 ms), the logo glides into the app's top bar, and the app fades in.
- How: give the logo view-transition-name: brand on every page, the top bars app-header, and the form card auth-card; style ::view-transition-old/new(auth-card); tell the direction with :root:has([data-auth="login"]), and the exit from the auth pages with ::view-transition-old(auth-card):only-child.
- The destination must render immediately, or the transition captures a loading skeleton: keep Sign up in the first download, and load onboarding with a route-level `lazy` (not React.lazy), so the router loads its code before switching pages.
- Navigate into the app from an effect once the auth status becomes signedIn, so the protected route never sees a signed-out state.
- Browsers without the API just switch pages.
- Testing: a hidden or background tab draws no frames, so view transitions look stuck in automated runs. Check them with the window visible.

Onboarding steps: each step slides in the direction of travel (Next from the right, Back from the left), with the same timing as page transitions; the progress bar fills with transform: scaleX.

Buttons (one shared Button component with every state):
- Press: scale to 0.97 (active:scale-[0.97], 100 ms). It needs no JavaScript, so it works before Motion loads.
- Hover: one shade darker, 150 ms. Tailwind v4's hover: only applies on devices that can hover, so phones never get stuck hover states.
- Focus: a 2px ring with a 2px offset that appears instantly (marigold on the navy bars).
- Loading: keep the button's width, fade the label out and a small spinner in, set aria-busy, and disable the button until the request finishes.
- Success ("Saved"): the icon becomes a check that scales in from 0.85 with a fade (150 ms), then the button returns to normal after about 1.2 s.

Other components:
- Rows and feed cards that open something: on press, scale to 0.99; on hover (pointer devices), the background tints slightly. They never lift.
- Switches, tabs and segmented controls: the thumb or indicator slides with a CSS transform, 200 ms. Equal-width segments let the indicator move by translateX(index × 100%).
- Data that arrives after its skeleton fades in where the skeleton was (150 ms). Nothing staggers on page load.
- Live values: when a leave time, temperature or alert count changes on refetch, the old value slides up and out while the new one slides in (AnimatePresence initial={false} mode="popLayout", 4px, 150 ms, inside a position: relative parent). Use tabular-nums so digits don't jump.
- High-severity alerts: a soft marigold "candle glow" on a pseudo-element (opacity pulse), 2 cycles, then it stops. Never infinite. Only on the alert status line, not on every alert row.
- Expanders (the brief, leave-time reasons, "See more" captions): Motion height: "auto", 200 ms, small content only.
- Bottom sheets (phones) and toasts: enter with the spring above (sheets slide up from the bottom, toasts rise 16px) and leave with a 150 ms fade. Close a sheet with its handle button, the backdrop or Esc, and return focus to what opened it. Use a solid dim backdrop, never a blur.
- Skeletons: a soft opacity pulse, shaped exactly like the content they stand in for.

Reduced motion: wrap the app in <MotionConfig reducedMotion="user">, which turns off transform animations and keeps fades for people who ask for reduced motion. In CSS, use motion-reduce: variants to remove movement (keep short fades) and stop the skeleton pulse; view transitions become a 120 ms crossfade.
</motion>

<scrolling>
- Phones: the top bar hides while scrolling down and returns on scrolling up (translateY only). It's always shown at the top of the page and while a sheet is open. Use one passive scroll listener with requestAnimationFrame, or Motion's useScroll; never read layout on every scroll event.
- Sticky: chip rows and segmented controls stick under the top bar; desktop rails are position: sticky.
- Feeds (News, Mayor): reveal the next cards as the end comes into view (IntersectionObserver), with a visible "Show more" button as the fallback and for keyboard users. End with a clear message ("You're all caught up").
- New content after a refetch never moves what the reader is looking at: show a "New stories" or "New alerts" pill at the top; tapping it scrolls up and shows them.
- Horizontal rows (area chips, LGU avatars, the hourly strip): overflow-x: auto with scroll-snap and overscroll-behavior-x: contain, scrollbar hidden only where swiping is obvious, and every item still reachable by keyboard.
- A new page starts at the top; Back and Forward restore the scroll position (React Router's <ScrollRestoration />).
- Smooth scrolling only for in-page jumps (e.g. from the alert status line to the alerts section), and never with reduced motion on.
- Nothing appears on scroll: content is visible at rest, with no fade-ins as sections enter the viewport. No scroll-jacking or snap on the main page.
</scrolling>

<polish>
The premium feel comes from consistency and care, not from effects.
- One spacing scale (Tailwind's 4px steps), the radius rules in <design_system>, hairline borders in #E2E6EA, and one shadow for floating layers.
- Times, temperatures and counts use tabular-nums; brief text stays within about 70 characters per line.
- Every state is designed: skeletons match the final layout; empty states teach the next step with one action; errors use plain language and a Retry button; offline, a banner says "You're offline. Showing info from 7:42 AM." above the cached data.
- Live data always shows when it was updated ("Updated 3 min ago").
- Prefer an undo toast to a confirmation dialog for reversible actions.
- Add a skip-to-content link, and move focus to the page's h1 on every route change.
- Phone details: <meta name="theme-color" content="#14213D"> so the browser bar matches the top bar, and viewport-fit=cover in the viewport meta so the bottom tab bar can pad itself with env(safe-area-inset-bottom).
</polish>

<pages>
Routes: /login, /signup, /welcome (onboarding), then the protected pages / (Today), /news, /mayor, /weather, /traffic and /profile. Signed-out users are redirected to /login. Add an AuthContext and a ProtectedRoute. Keep filters, tabs and sections in the URL (e.g. /news?area=cebu_city&alerts=1, /weather?tab=map, /traffic?view=all, /profile?section=trips) so they survive a refresh and can be shared.

Each page lists its Content (everything PR #27 had, which is correct) and then how to arrange it.

1. Login (/login)
   Content: a story panel (desktop) with the logo, "Cebu, right now, for you." and three selling points (a leave time for every trip, class suspensions from your mayor, hour-by-hour rain chances); the form: "Welcome back", email, password with show/hide, "Forgot password?" (Supabase reset email), "Sign in", and "Create an account". With mocks on, a note explains demo sign-in.
   Layout: desktop splits the story panel (left, navy, original ribbon art) and the form (right). Phones show only the form under a slim navy bar with the logo. "Sign in" is the only primary button.

2. Sign up (/signup)
   Content: name, email, password (at least 8 characters) and confirm; "Create account"; a "Sign in" link back; a "check your email" state when confirmation is required.
   Layout: same as Login; the form card slides between the two (see <motion>).

3. Onboarding (/welcome)
   Content: a skippable 3-step setup with a progress bar: (1) first name and home city, from GET /api/areas; (2) which mayor to follow, from GET /api/lgu-sources, explaining that Cebu City, Mandaue and Lapu-Lapu decide their own class suspensions and every other town follows the Province of Cebu; (3) home/school/work places and a first weekly trip. Saves with PATCH /api/profile, POST /api/locations and POST /api/schedule.
   Layout: one step per screen, one question at a time, "Next" as the only primary button and "Skip for now" always visible in the top bar.

4. Today (/), the dashboard: "Do I need to change my plans today?"
   Content: the greeting with the date; the alert status (high-severity alerts near the user's places, with "Naay klase?" on class advisories); leave times for today's trips (leave by, route, arrive-by, distance, usual time, delay, and why); the Cebu Daily Brief (brief.content, labeled "AI summary"); the weather now with the rain chance for the next 6 hours; alerts near the user's places; the mayor's latest post; top Cebu news; and a first-run setup prompt. On sign-in, call POST /api/lgu-posts/refresh once.
   Changes from PR #27: the mini map is gone (it lives on Traffic, so Today loads no map); alerts show the top 3, not 5; the mayor section shows 1 post; news is 3 compact rows; the brief shows its first 3 lines with "Read the full brief"; only the next trip is large.
   Order (phones, top to bottom):
   1. Greeting and date on one small line.
   2. The alert status line: "All clear near your places · Ingat sa dalan!" or "3 high alerts near you" (tapping it scrolls to the alerts section). Class advisories add "Naay klase?".
   3. The next trip, the primary element: "Leave by 6:55 AM" at 32px, then "Classes · Home → School · arrive 7:30" and a "+20 min" delay chip that expands the reasons. Under it, "Later today" rows for the other trips (name and leave time).
   4. Weather now: temperature, condition, one line of advice from the hourly rain chance ("Rain likely from 9 PM. Bring an umbrella." when an hour in the next 12 reaches 70%; otherwise "No rain expected for the next 12 hours."), and a compact 6-hour rain strip.
   5. Today's brief: the first 3 lines, "Read the full brief" (expander), the "AI summary" label, and the note that it's written automatically.
   6. Near your places: 3 alerts as compact rows (severity, type, title, distance), then "See all on the traffic map".
   7. From your mayor: the latest post as a preview (avatar, LGU, time, 2-line caption), linking to /mayor.
   8. Top Cebu news: 3 compact rows (headline, source, time, small thumbnail), linking to /news.
   Desktop: a centered container (max 1080px) with two columns: the main column (items 2, 3 and 5) and a side column (items 4, 6, 7 and 8). At 1440×900, the alert status, the next trip, the brief preview, the weather and the 3 alerts are all visible without scrolling.
   Empty states: with no trips, the next-trip slot becomes "Add your weekly trips to get a leave time" with one button; an incomplete profile shows one setup prompt at the top, not several.

5. News (/news), a feed: "What's happening in Cebu?"
   Content: stories from GET /api/news (SunStar, Cebu Daily News, GNews; last 3 days): source, time, area, an alert badge when isAlert (then the alert type), headline, summary, image, and "Read on [source]" (opens in a new tab; no full article text is stored); an area filter; an "Alerts only" toggle; the updated time.
   Layout: desktop left rail: an "Areas" list (All Cebu plus the towns from GET /api/areas, the active one highlighted) and the "Alerts only" switch. Phones and tablets: the areas become a sticky horizontal chip row under the top bar, with "Alerts only" as its first chip. The center is one column of story cards. Right rail: "Right now".
   Story card: a source mark (initials in a circle) with the source name · time · area; the headline (bold, at most 2 lines); the summary (at most 2 lines); the image (16:9) when there is one; a footer with the alert chip (if any) and "Read on SunStar ↗". The headline and image open the article.
   Fetch limit=50 once and show 10 at a time (see <scrolling>); end with "You're all caught up · stories from the last 3 days".

6. Mayor (/mayor), a page like a Facebook Page: "What did my mayor post?"
   Content: the followed LGU (name, official and title, link to the official page); the note that Cebu City, Mandaue and Lapu-Lapu decide their own class suspensions and other towns follow the Province; posts from GET /api/lgu-posts/latest?limit=10 with caption ("See more"), images or video (thumbnail with a play icon, linking to Facebook), time, reaction/comment/share counts and a category badge ("Class suspension", "Traffic", …); a switcher for the other LGUs (their posts are mock for now); "Make this my mayor" (PATCH /api/profile with subscribedMayor).
   Layout: a page header with a navy cover band (original ribbon art), the LGU's initials avatar overlapping it, the LGU name and official, and one primary button: "Make this my mayor", or a quiet "Following" state (optimistic, with an Undo toast). LGU switcher: a horizontal row of round avatars under the header on phones; the left rail list on desktop, above an "About" card with the class-suspension note. Right rail: "Right now".
   Post card (Facebook's anatomy): avatar, LGU name and time, category chip; the caption clamped to 4 lines with "See more" (expander); media (1 image full width, 2 side by side, 3 or more as one large plus smaller ones with "+N"); counts as quiet text ("4.8K reactions · 1.9K comments · 685 shares"); "View on Facebook ↗".
   End of the feed: "That's the latest 10 posts · See more on Facebook ↗".

7. Weather (/weather): "Will it rain where I'm going?"
   Content: an area picker; current conditions (temperature, condition, feels like, rain chance, humidity, wind, observed time); the next 24 hours (temperature and rain chance) with a table alternative; a rain map with an hour slider (per-area temperature and rain %) with a table alternative; weather and flood alerts (GET /api/alerts?type=weather,flood); a "PAGASA forecast & advisories" panel (tonight and tomorrow, thunderstorm advisories for Cebu towns, a 5-day outlook) that is mock for now.
   Layout: one view at a time.
   - The top shows "Now" for the chosen area: the temperature at 32px, the condition, feels like, and the advice line from Today; rain, humidity and wind as one small row; the area picker as a compact control (a sheet on phones, the left rail list on desktop).
   - Below it, tabs: Hourly · Rain map · Advisories.
     - Hourly: a horizontal hour strip (scroll-snap) with temperature and rain %, then the 24-hour chart and "Show as a table".
     - Rain map: the map with the hour slider; Leaflet loads when this tab first opens; on desktop the map spans the center and right columns.
     - Advisories: the weather and flood alerts, then the PAGASA panel (marked "Sample" until the backend provides it) with the 5-day outlook.
   - Desktop right rail (on Hourly): the weather and flood alerts, top 3.

8. Traffic (/traffic): "What's in my way?"
   Content: "My commute": a trip picker, origin and destination markers with a dashed line labeled "approximate route", the leave time with reasons, and alerts on the way (GET /api/alerts?relevant=true) with their distance. "All Cebu": type and severity filters, a map with markers colored by severity and a legend, a list synced with the map, and a "busiest areas" ranking (alerts counted per areaName). Attribution: "© OpenStreetMap contributors" and "Traffic data © TomTom".
   Layout: a segmented control at the top: My commute · All Cebu.
   - Phones: the map fills the screen under the top bar; a bottom sheet peeks at about 35% height with the leave time and alerts on the way (My commute) or the alert list (All Cebu), and expands to full height. Filters open from a "Filters" button in their own sheet.
   - Desktop: the map spans the center and right columns; the left rail holds the list and, on All Cebu, the filters and "Busiest areas" (top 5, collapsible).
   - Selecting an alert, in the list or on the map, highlights both and shows its details (title, type, severity, area, time, source and the nearby places) in the sheet or the rail, not in a modal. Use the list's data or GET /api/alerts/:id.

9. Profile (/profile), settings: "Is my info right?"
   Content: your details (first name, display name, home city, address, the mayor to follow with the same class-suspension note, and the usual commute from/to); saved places (list with a kind icon; add and edit with a map pin-drop; delete, with a friendly message when a trip uses the place, the API's 409); weekly trips (title, day chips, arrive-by time, origin and destination); sign out. Show API validation errors next to the matching field (error.details[].path).
   Layout: one section at a time: Your details, Saved places, Weekly trips, Sign out.
   - Phones: a settings list; each row opens its section as its own screen (slide in, Back returns).
   - Desktop: the left rail lists the sections; the center shows the selected one.
   - Each section saves on its own with one "Save" button. Places and trips are edited in place or in a sheet, never in a modal.

Every page needs loading skeletons, empty states that teach the next step, and error states with a Retry button.
</pages>

<steps>
1. First, set up the skills (<skills>). Then build the foundation only: tokens in src/index.css, the static app shell in index.html, QueryClient defaults, route-level code splitting, the app shell (top bar, tabs, rails, phone tab bar with hide-on-scroll), MotionConfig + LazyMotion with the page transitions, the auth view transitions, and the core components (Button with every state, Chip, SeverityBadge, feed Card, Avatar, Sheet, Tabs and SegmentedControl, Skeleton, Toast). Also write a one-line layout sketch for each page. Then STOP and wait for my approval.
2. After approval, build in this order: auth (Login, Sign up, onboarding) → Today → News → Mayor → Weather → Traffic → Profile.
3. After each page, run the ui-ux-pro-max pre-delivery checklist, an Impeccable critique and detector scan, and a Lighthouse Mobile check, then output: ✅ what was built, files changed, the Lighthouse scores, and how you verified it.
</steps>

<done_when>
- `npm --prefix frontend run build` passes, within the <performance> JavaScript budget.
- Every page renders correctly at 375px, 768px, 1024px and 1440px with VITE_USE_MOCKS=true, with no horizontal scroll.
- Every item under "Content" in <pages> is present and reachable.
- Lighthouse Mobile meets the <performance> targets on Login, Today and News.
- The ui-ux-pro-max checklist passes, and Impeccable's detector reports nothing on any page.
- No files outside frontend/ have changed.
Stop and report if the build fails twice in a row.
</done_when>
~~~
