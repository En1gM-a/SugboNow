# Sugbo Now UI: design principles and decisions

This file explains how the frontend applies the seven UI design principles from the course guide
("From Wireframe to High-Fidelity Prototype", UI/UX Essentials), and which design-skill guidance shaped it.
The source of truth for tokens, motion and performance is still [`docs/handoffs/frontend.md`](../docs/handoffs/frontend.md).

## The seven principles, in this app

| Principle | Where you can see it |
| --- | --- |
| **1. Hierarchy** | Each screen has one largest thing: the Daily Brief tile (biggest bento tile), "Leave by 6:55 AM" (28px, the largest text in its tile), the current temperature on Weather. Headings use Poppins 600/700; body uses Open Sans 400 at 16px+. Size and weight carry the hierarchy, not extra colors. |
| **2. Progressive disclosure** | Onboarding is three short steps with a progress bar, and can be skipped. Leave-time reasons hide behind "Why the extra time?". Long mayor posts use "See more". News shows 20 stories, then "Show more". Charts and maps hide their data tables behind "Show as table". |
| **3. Consistency** | One shared `Button` (every state), `Card`, `Badge`, `SeverityBadge` and form controls. One spacing scale (4px steps), one radius scale (cards 16px, inputs 12px, chips full), two shadow levels, one 24px icon set. Every page uses the same header, loading skeletons, empty states and "Retry" errors. |
| **4. Contrast** | All text meets WCAG 4.5:1 in both themes (muted text #57534E is 7.2:1 on ivory; #B3ACA4 is 7.4:1 on the dark surface). The primary action is the only solid Mactan-sea button on a screen; secondary actions are outlined; destructive "Sign out" is red-outlined. High-severity alerts get red badges plus a strip above the grid. |
| **5. Accessibility** | Skip link, visible focus rings, focus moves to each page's h1 (and to each onboarding step's heading). All targets are at least 44x44px. Severity is always icon + label, never color alone. Forms show errors on blur, link them with `aria-describedby`, and focus the first invalid field. Alerts are announced with `aria-live`. Charts and maps have table alternatives. Reduced-motion users get fades instead of movement. |
| **6. Proximity** | Related things sit together and unrelated things are separated: a trip's leave time, route and delay form one block; each tile groups one topic; form fields that belong together (commute From/To) sit in one group; dividers, not boxes, separate items inside a tile. |
| **7. Alignment** | A bento grid: 1 column on phones, 2 on tablets, 3 on desktop, all on one container width (`max-w-6xl`) with 16/24/32px side padding. Text, badges and numbers share left edges; times and temperatures use tabular figures so digits line up. |

## Design skills used

- **UI UX Pro Max** (`ui-ux-pro-max`): its data supports this spec's choices: the "Real-Time Monitoring" and "Bento Grid"
  styles, the "Modern Professional" font pairing (Poppins + Open Sans), and the Government/Public Service palette
  (navy plus a blue call to action). Its UX, React and Tailwind rules drove the inline form validation, keyboard support
  for the segmented control, 44px map controls, data-table alternatives, deep links (`?view=`, `?area=`, `?lgu=`),
  `touch-action: manipulation`, the z-index scale, and the live/offline status in the header. Its generated
  "design system" (a scroll-story landing page, OLED dark mode, Cinzel) did not fit an app dashboard and was not used.
- **Impeccable** (`impeccable`): its quality floor removed nested cards (items inside tiles are now separated by
  dividers), small labels above headings, and rounded icon tiles on list rows; and it themed browser details (caret,
  scrollbars, selection, link underlines, balanced headings).
- **Motion** (`motion`): its "CSS or Motion" guidance confirmed CSS for this app: transitions for color and state,
  keyframes for mount fades and skeletons, a short fixed CSS stagger, no overshoot, 150–300 ms timings.

### Intentional exceptions

Impeccable's detector reports three style warnings that the spec overrides on purpose ("the brief wins"):

- `overused-font` for Open Sans (twice): the spec pins Poppins + Open Sans.
- `cream-palette` for the #FFF8EC page background: the spec's Candle Ivory token.

## Light and dark themes

- A moon/sun button in every header switches themes. The first visit follows the device's setting; the choice is then
  saved in that browser. A small script in `index.html` applies it before the first paint, so dark mode never flashes light.
- Every color is a token in `src/index.css`. The dark "Sinulog night" palette (midnight navy, per UI UX Pro Max's dark-mode
  guidance) overrides them under `[data-theme="dark"]`. Text on colored backgrounds uses the `on-*` tokens
  (`text-on-sea`, `text-on-status`, `text-on-selected`, `text-on-accent`), so every pair stays at 4.5:1 or better in both themes.
- Maps: the tiles get a static dark filter in dark mode; labels, zoom buttons, tooltips and the route line follow the theme.

## Performance (Lighthouse Mobile)

Median of 3 runs on the production build, served locally. The API was the app's own mock handlers running as a local
server with their 250–700 ms response delay, and sign-in used a placeholder Supabase session.

| Page | Performance | Accessibility | Best Practices | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| Login | 94 | 100 | 100 | 3.0 s | 50 ms | 0 |
| Dashboard | 95 | 100 | 100 | 2.8 s | 60 ms | 0 |
| News | 92 | 100 | 100 | 3.3 s | 40 ms | 0 |

What got it there: the app's CSS is inlined into `index.html` at build time; web fonts apply after the page loads
(metric-matched fallbacks prevent shifts); Supabase loads on demand; signed-in pages read the stored session instead of
waiting for supabase-js; the Dashboard's alert strip and brief keep a fixed height while loading. JavaScript on first
load is about 133 KB gzipped (budget: 200 KB).

Still open: LCP is 2.8–3.3 s against the 2.5 s target. The main content is drawn by React, so it waits for the app's
JavaScript on Lighthouse's slow-phone simulation. Getting under 2.5 s would need prerendering the pages to HTML, or
moving the Dashboard out of the first download, which frontend.md asks us not to do. Re-measure against the real backend
before deciding.

## z-index scale

`0` maps · `10` inside components · `40` top and bottom nav bars · `50` toasts and the skip link. Dialogs use the
browser's top layer (`<dialog>`), so they need no z-index.
