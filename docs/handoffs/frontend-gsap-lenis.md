# Frontend: GSAP animation and Lenis smooth scrolling

- **For:** the frontend team (@gnthril, @Tiamporado) and their AI coding agents
- **Builds on:** [`frontend.md`](frontend.md) (design system, performance budget, motion rules) and the UI on the
  `frontend/sinulog-ui` branch
- **Versions:** GSAP 3.15 (`gsap`) and Lenis 1.1.22 (`lenis`, held at 1.1)

This file explains how to add GSAP and Lenis to SugboNow without breaking the Sinulog design, the performance
budget or accessibility. It covers what each library is for, the setup code, the settings, which page gets which
effect, and how to check the result. `frontend.md` still applies; where this file is more specific about GSAP or
Lenis, this file wins. When rules clash, speed comes first, then accessibility, then looks.

## How to use it

Tell your agent:

> Read docs/handoffs/frontend-gsap-lenis.md and add GSAP and Lenis as it describes. Stop after the setup for my review.

The agent works through the [steps](#steps) in order and stops where they say.

## The short version

- **Lenis** smooths mouse-wheel and trackpad scrolling on desktop. Phones, tablets and anyone who prefers reduced
  motion keep native scrolling, and never download Lenis.
- **GSAP** fades in content as it scrolls into view (News cards, mayor posts) and draws the Weather chart. Everything
  else stays in CSS, as it is today.
- **Neither one may delay the page.** Both load in the background after the page has rendered, never in the
  first-load bundle.
- **Nothing on screen is ever hidden for an animation.** GSAP only touches elements that are still below the screen
  when it's ready. If it fails to load, everything simply stays visible.
- **Scrolling stays the user's.** No scroll-jacking, snapping, pinning or parallax.

## How motion should feel

The Sinulog look is festive, but its motion is calm: people check SugboNow quickly before they leave the house.

- Motion confirms what happened; it never decorates (`frontend.md`). If an animation doesn't explain something,
  leave it out.
- Small and quick: content rises 8px and fades in over 180 ms on the project's `--ease-out` curve, the same feel as
  the CSS `animate-fade-up` the Dashboard already uses.
- One reveal group and at most one featured animation per page (ui-ux-pro-max: animate one or two key elements per
  view).
- Nothing about alerts bounces or overshoots, and motion never carries meaning on its own (severity stays icon plus
  label).
- Colors never animate. They come from the theme tokens, so light and dark mode switch instantly.
- The base presets are ui-ux-pro-max's Subtle "Scroll Reveal" and "Stagger List" (search
  `"scroll reveal stagger" --domain gsap`). Keep their shape (a small rise, starting near the bottom of the screen, a
  tiny stagger, skipped for reduced motion) but use our timing tokens instead of their 250–400 ms and `power1.out`.
  Its Complex tier (SplitText, pinning, scrub) is out of scope.
- If your session uses the `motion` design skill, follow its general rules (transform and opacity only, short
  durations, reduced motion), but use this file's GSAP setup instead of Motion's APIs.

## Which tool does what

| Need | Use | In SugboNow |
| --- | --- | --- |
| Hover, press, focus, color changes, switches | CSS (Tailwind) | `Button`'s `active:scale-[0.97]`, nav links |
| Page enter, first-load stagger, toasts, sheets, skeletons, live values | CSS keyframes in `src/index.css` | `animate-page-in`, the Dashboard's `animate-fade-up`, `LiveValue` |
| Content that enters as you scroll down a list | GSAP, started by `IntersectionObserver` | News cards, mayor posts |
| SVG drawing and multi-step sequences | GSAP timeline | Weather's 24-hour chart |
| Smooth wheel and trackpad scrolling | Lenis, desktop only | the whole app |
| Scroll-linked effects: scrub, pin, parallax, progress bars | Ask first; ScrollTrigger if approved | none |

- Scroll-*triggered* effects (play once when something enters) are allowed by this file. Scroll-*linked* effects
  (progress follows the scrollbar) still need approval, as `frontend.md` says.
- Never animate one element with two tools (CSS and GSAP, or GSAP and Motion).
- `frontend.md` pre-approves Motion for exit animations and `height: auto` expanders. The UI on
  `frontend/sinulog-ui` doesn't use it (exits are done in CSS), so it isn't installed. Don't add it for anything in
  this table.

## Install

Pre-approved, on your feature branch:

```bash
npm --prefix frontend install gsap@^3.15.0 lenis@~1.1.22
```

- **`lenis@~1.1.22` keeps Lenis on 1.1.** 1.1.22 is the last 1.1 release; npm's latest is 1.3. Don't upgrade it
  without asking. Dependabot's monthly PR will try to move it to 1.3: drop that bump from the PR, or ask @En1gM-a to
  add an `ignore` rule for `lenis` in `.github/dependabot.yml`.
- **GSAP is free, plugins included,** under its "no charge" license, which only restricts building no-code animation
  tools that compete with Webflow. ScrollTrigger and the other plugins ship inside `gsap`, but only GSAP's core is
  used by default.
- **Don't add `@gsap/react`, `lenis/react` or the old `@studio-freight/*` packages.** `useGSAP` needs GSAP imported
  at the top of the component, which makes React wait for GSAP before showing the page; `gsap.context()` inside the
  lazy modules below gives the same cleanup. Lenis runs outside React, so it can switch on and off with the media
  query without re-mounting the app.

## Keep it out of the first load

The first visit may download at most 200 KB of JavaScript, gzipped (`frontend.md`). GSAP's core is about 28 KB,
ScrollTrigger about 18 KB and Lenis about 4 KB, gzipped.

- **Outside `src/lib/gsap/`, never import `gsap`, `lenis` or anything in `src/lib/gsap/` with a normal `import`.**
  Load them with `import()`: inside `useGsapEffect`, or in `initSmoothScroll()`. `import type` is fine, because it
  disappears at build time. The files inside `src/lib/gsap/` import `gsap` and each other normally.
- This matters on lazy pages too: a normal import in `NewsPage.tsx` would make React wait for GSAP before showing the
  page.
- If GSAP or Lenis fails to load (offline, or a deploy in between), nothing happens: the page is already fully
  visible and scrolls natively.
- Check after every build ([Verify](#verify)).

## Setup

Seven changes. Paths are under `frontend/src/` and match `frontend/sinulog-ui`.

### 1. Lenis: `lib/smoothScroll.ts`

```ts
// Smooth wheel and trackpad scrolling with Lenis 1.1, on desktop only. Phones, tablets and reduced-motion users
// keep native scrolling and never download Lenis. Lenis moves the real page scroll, so sticky headers,
// IntersectionObserver, content-visibility and find-in-page keep working.

import type Lenis from 'lenis';

const SMOOTH = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
let lenis: Lenis | null = null;

/** Call once after the first render. Turns Lenis on or off whenever the media query changes. */
export function initSmoothScroll() {
  const mq = window.matchMedia(SMOOTH);
  const sync = async () => {
    if (mq.matches && !lenis) {
      const [{ default: Lenis }] = await Promise.all([import('lenis'), import('lenis/dist/lenis.css')]);
      if (!mq.matches || lenis) return; // changed while loading
      lenis = new Lenis({
        lerp: 0.12,
        autoRaf: true,
        // Mostly-sideways trackpad swipes stay native, so chip rows and the hour strip still scroll.
        virtualScroll: ({ deltaX, deltaY }) => Math.abs(deltaY) >= Math.abs(deltaX),
      });
    } else if (!mq.matches && lenis) {
      lenis.destroy();
      lenis = null;
    }
  };
  const run = () => void sync().catch(() => {});
  mq.addEventListener('change', run);
  run();
}

/** Route changes: jump to the top at once, cancelling any smooth scroll still moving. */
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

/** In-page jumps. Keeps the target's scroll-margin-top (e.g. `scroll-mt-24`, which clears the sticky header). */
export function scrollToElement(el: HTMLElement, { immediate = false } = {}) {
  if (lenis) {
    lenis.scrollTo(el, { offset: -(parseFloat(getComputedStyle(el).scrollMarginTop) || 0), immediate });
    return;
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: immediate || reduce ? 'auto' : 'smooth', block: 'start' });
}
```

### 2. Start Lenis: `main.tsx`

```tsx
import { initSmoothScroll } from './lib/smoothScroll';

void enableMocks().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(/* unchanged */);
  // After the first render, when the browser is idle. Safari has no requestIdleCallback.
  if ('requestIdleCallback' in window) requestIdleCallback(initSmoothScroll);
  else setTimeout(initSmoothScroll, 200);
});
```

### 3. Route changes: `components/layout/AppShell.tsx`

In the route-change effect, replace `window.scrollTo(0, 0);` with `scrollToTop();`. Lenis ignores a plain
`window.scrollTo` while it is still easing from the last wheel turn, so the new page could drift back down.

### 4. In-page jumps: `DashboardPage.tsx` and `ProfilePage.tsx`

```ts
// DashboardPage: the high-alert button
function jump() {
  const target = document.getElementById('alerts');
  if (!target) return;
  scrollToElement(target);
  target.focus({ preventScroll: true });
}

// ProfilePage: the #places / #trips hash effect
const t = setTimeout(() => {
  const el = document.getElementById(hash.slice(1));
  if (el) scrollToElement(el, { immediate: true });
}, 300);
```

Anything new that scrolls the page from code goes through `scrollToTop()` or `scrollToElement()`. Don't add
`html { scroll-behavior: smooth }`, even though ui-ux-pro-max suggests it for anchor links: route changes must jump,
and Lenis already smooths the wheel.

### 5. Boxes that scroll on their own: `data-lenis-prevent`

Lenis handles wheel events for the whole page, so a box with its own scrollbar needs `data-lenis-prevent`, or the
wheel moves the page instead of the box.

- **`components/ui/Overlay.tsx`:** add it to the `Sheet`'s `<dialog>`, which covers the sheet body and its backdrop.
  Also add `overscroll-contain` to the body `div` (`flex-1 overflow-y-auto`), so reaching the end of a sheet doesn't
  scroll the page behind it.
- **`pages/TrafficPage.tsx`:** add it to both alert lists (the `<ul>`s with `overflow-y-auto`).
- **From now on:** add it to every element with `overflow-y-auto`, `overflow-y-scroll` or `overflow-auto`, and every
  `<dialog>`. Find them with `rg -n "overflow-(y-)?(auto|scroll)|<dialog" frontend/src`.
- **Not needed:** the sideways chip rows (News areas, Mayor LGUs), Weather's hour strip and `TableDisclosure`.
  The `virtualScroll` setting leaves mostly-sideways gestures to the browser, so they scroll natively.
- **Maps:** every map sets `scrollWheelZoom={false}`, so the wheel scrolls the page over a map. A map that turns
  wheel zoom on needs `data-lenis-prevent` on its container.

### 6. Printing: `index.css`

```css
/* Content still waiting for its scroll animation prints normally. */
@media print {
  [data-reveal] { opacity: 1 !important; transform: none !important; }
  [data-chart-bar] { transform: none !important; }
  [data-chart-line] { stroke-dasharray: none !important; stroke-dashoffset: 0 !important; }
}
```

### 7. GSAP: `lib/gsap/setup.ts` and `hooks/useGsapEffect.ts`

```ts
// lib/gsap/setup.ts
// GSAP with SugboNow's motion tokens. Code outside this folder loads it only with import().

import { gsap } from 'gsap';

/** The same curves as --ease-out and --ease-in in src/index.css. */
export const EASE = {
  out: 'power4.out', // cubic-bezier(0.22, 1, 0.36, 1) is easeOutQuint, which is GSAP's power4.out
  in: 'power2.in', // cubic-bezier(0.32, 0, 0.67, 0) is easeInCubic, which is GSAP's power2.in
} as const;

/** Seconds, matching the --duration-* tokens. Nothing runs longer than `max`. */
export const DUR = { press: 0.1, hover: 0.15, enter: 0.18, leave: 0.15, switch: 0.2, max: 0.4 } as const;

gsap.defaults({ duration: DUR.enter, ease: EASE.out });

export { gsap };
```

```ts
// hooks/useGsapEffect.ts (safe to import anywhere: GSAP only loads inside `load`)

import { useEffect, type DependencyList, type RefObject } from 'react';

/**
 * Runs a GSAP effect after the page has rendered. `load` must import() its module from lib/gsap/, so GSAP
 * downloads in the background and never delays the page. Skipped for reduced motion. If loading fails,
 * nothing changes. `deps` decides when it re-runs; `load` is usually an inline arrow.
 */
export function useGsapEffect<T extends Element>(
  ref: RefObject<T | null>,
  load: (el: T) => Promise<() => void>,
  deps: DependencyList,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let undo: (() => void) | undefined;
    let cancelled = false;
    load(el)
      .then((fn) => {
        if (cancelled) fn();
        else undo = fn;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      undo?.();
    };
  }, deps);
}
```

## Recipes

### Fade in content as it scrolls in: News and Mayor

```ts
// lib/gsap/reveal.ts
// Fades in [data-reveal] items as they scroll into view, in small staggered batches. Only items that start below
// the screen are hidden, so nothing the user can see ever blinks out. IntersectionObserver (not ScrollTrigger)
// decides when: it measures the real layout, so it works with content-visibility (.cv-auto), late images and
// refetches without any refresh calls.

import { DUR, gsap } from './setup';

export function revealOnEnter(root: Element): () => void {
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])')).filter(
    (el) => el.getBoundingClientRect().top >= window.innerHeight,
  );
  if (!items.length) return () => {};

  const ctx = gsap.context(() => {
    gsap.set(items, { opacity: 0, y: 8 });
  });
  const io = new IntersectionObserver(
    (entries) => {
      const batch = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
      if (!batch.length) return;
      for (const el of batch) {
        io.unobserve(el);
        el.dataset.revealed = ''; // never hidden again, even after a refetch
      }
      ctx.add(() => {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: DUR.enter,
          stagger: { amount: Math.min(0.15, 0.03 * (batch.length - 1)) }, // a whole batch finishes within 0.4 s
          clearProps: 'opacity,transform', // hand the element back to CSS
        });
      });
    },
    { rootMargin: '0px 0px -8% 0px' }, // starts about where the preset's "top 90%" does
  );
  items.forEach((el) => io.observe(el));

  return () => {
    io.disconnect();
    ctx.revert(); // puts every item back, mid-animation or not
  };
}
```

```tsx
// pages/NewsPage.tsx (MayorPage is the same, with [posts.data] and `i >= 2`)
const listRef = useRef<HTMLUListElement>(null);
useGsapEffect(listRef, async (el) => (await import('@/lib/gsap/reveal')).revealOnEnter(el), [news.data, shown]);

<ul ref={listRef} className={/* unchanged */}>
  {list.slice(0, shown).map((n, i) => (
    <li key={n.id} data-reveal className={i >= 6 ? 'cv-auto' : undefined}>
      <ArticleCard article={n} now={now} eager={i < 3} />
    </li>
  ))}
</ul>
```

- Put `data-reveal` on a plain wrapper such as the `<li>`. Never put it on `Card`, `Button` or anything with
  `transition-*` or `animate-*` classes: GSAP's inline transform would fight the CSS transition and override the
  press scale.
- Never hide content with CSS (`opacity-0`) while waiting for GSAP. GSAP sets the hidden state itself, so without
  GSAP everything is visible.
- Never use `autoAlpha` or `visibility: hidden`: they take items out of the tab order and away from screen readers.
- The dependencies must include whatever adds items (the query data, "Show more"), so new items are picked up. Items
  that already faded in keep `data-revealed` and are never hidden again.

### Draw the 24-hour chart: Weather

```ts
// lib/gsap/chart.ts
// Draws the 24-hour chart when it scrolls into view: the rain bars grow, then the temperature line draws across.
// Only if the chart starts below the screen; a chart that is already visible is left alone.

import { DUR, EASE, gsap } from './setup';

export function drawChartOnEnter(svg: SVGSVGElement): () => void {
  if (svg.getBoundingClientRect().top < window.innerHeight) return () => {};
  const bars = svg.querySelectorAll<SVGRectElement>('[data-chart-bar]');
  const line = svg.querySelector<SVGPathElement>('[data-chart-line]');
  const length = line?.getTotalLength() ?? 0;

  const ctx = gsap.context(() => {
    if (bars.length) gsap.set(bars, { scaleY: 0, transformOrigin: '50% 100%' });
    if (line) gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
  });
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      ctx.add(() => {
        // Everything finishes by 0.38 s.
        const tl = gsap.timeline({ defaults: { ease: EASE.out } });
        if (bars.length) tl.to(bars, { scaleY: 1, duration: DUR.enter, stagger: { amount: 0.12 }, clearProps: 'transform' }, 0);
        if (line) tl.to(line, { strokeDashoffset: 0, duration: 0.28, clearProps: 'strokeDasharray,strokeDashoffset' }, 0.1);
      });
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  io.observe(svg);

  return () => {
    io.disconnect();
    ctx.revert();
  };
}
```

In `HourlyChart`, add `const svgRef = useRef<SVGSVGElement>(null);`, call
`useGsapEffect(svgRef, async (svg) => (await import('@/lib/gsap/chart')).drawChartOnEnter(svg), [hours]);`, and put
`ref={svgRef}` on the `<svg>`, `data-chart-bar` on each rain `<rect>` and `data-chart-line` on the temperature
`<path>`.

### Scroll-linked effects, only if approved

ScrollTrigger isn't part of the setup. If the team approves a specific scroll-linked effect:

- Register ScrollTrigger in its own lazy module (for example `lib/gsap/scroll.ts`), never in `setup.ts`, so pages
  without it don't download its 18 KB.
- Lenis moves the real page scroll, so ScrollTrigger works with it as is.
- The Lenis README's GSAP recipe drives Lenis from `gsap.ticker` and turns off lag smoothing. Don't add it: here Lenis
  runs its own loop (`autoRaf: true`), and feeding `lenis.raf()` from two clocks makes scrolling jump.
- Never use ScrollSmoother (it does Lenis's job) or `ScrollTrigger.normalizeScroll()`, and remove `markers` before
  committing.

## Lenis settings

| Setting | Value | Why |
| --- | --- | --- |
| `lerp` | `0.12` | How quickly the page catches up with the wheel. A little snappier than the default 0.1, so scanning alerts never feels floaty. Tune only within 0.1–0.15. |
| `autoRaf` | `true` | Lenis runs its own frame loop, because GSAP isn't loaded on every page. |
| `virtualScroll` | mostly-vertical gestures only | Lenis 1.1 otherwise takes a sideways swipe with a little vertical drift and blocks the chip rows from scrolling. |
| `smoothWheel` | default, `true` | Smooths the mouse wheel and trackpad. |
| `syncTouch` | default, `false` | Touch scrolling stays native. Never turn it on: it fakes momentum and is unreliable on iOS. |
| `wheelMultiplier` | default, `1` | How far one wheel notch scrolls is the user's OS setting. Never change it. |
| `anchors` | default, `false` | The skip link and `#hash` links keep their native behavior, which moves focus correctly. |
| `autoResize` | default, `true` | Picks up height changes when data loads. |
| `prevent` | not used | Exceptions are marked in the markup with `data-lenis-prevent`, where they're easy to find. |

With Lenis on, keyboard scrolling (Space, Page Up/Down, the arrow keys, Home/End), scrolling to a focused element and
`ctrl` + wheel zoom stay native. Lenis 1.1's limits: no CSS scroll-snap on the page itself (sideways strips are
fine), no smooth scrolling over an iframe, and Safari caps it at 60 fps.

## Page by page

| Page | Lenis | GSAP |
| --- | --- | --- |
| Login, Sign up, Onboarding | On | None |
| Dashboard `/` | On | None: the CSS first-load stagger stays |
| News `/news` | On | Cards below the screen fade in as they scroll in |
| Mayor `/mayor` | On | Posts below the screen fade in as they scroll in |
| Weather `/weather` | On | The 24-hour chart draws in, if it starts below the screen |
| Traffic `/traffic` | On; both alert lists get `data-lenis-prevent` | None: the list is tied to the map, so nothing in it may be hidden |
| Profile `/profile` | On | None: forms must be usable at once |
| Sheets and dialogs | `data-lenis-prevent` on the `<dialog>` | None: CSS handles enter and leave |
| App shell (header, nav, ribbon, skip link) | On | Never animated with GSAP |

"On" means on for desktop mouse and trackpad users who haven't asked for reduced motion. A new GSAP effect must fit
this table's spirit (one reveal group or one featured animation per page); otherwise ask first.

## Don'ts

- Don't import GSAP or Lenis with a normal `import` outside `src/lib/gsap/` (`import type` is fine).
- Don't hide anything that is on screen, and don't hide anything with CSS while waiting for GSAP.
- Don't use `autoAlpha` or `visibility: hidden` for reveals, and don't animate a page's `h1`: focus moves there on
  every route change.
- Don't animate colors, shadows, filters, width, height, top or left. Transform and opacity only.
- Don't pin, scrub, parallax or snap, and don't use SplitText, Flip, Draggable, Observer or ScrollSmoother, without
  approval.
- Don't add `will-change` in CSS; GSAP promotes an element to its own layer only while it animates.
- Don't put `data-reveal` on an element whose React `style` prop sets `opacity` or `transform`.
- Don't turn on `syncTouch`, change `wheelMultiplier`, or call `lenis.raf()` yourself.
- Don't add `html { scroll-behavior: smooth }` or CSS scroll-snap on the page.

## Reduced motion

- Lenis is never created, so scrolling is native. If the setting changes while the app is open, Lenis switches off
  (or on) at once.
- `useGsapEffect` doesn't run, so nothing is hidden or animated and GSAP isn't downloaded. A change while the app is
  open applies from the next page.
- The CSS in `index.css` already covers everything else.

## Steps

1. Create a branch such as `frontend/gsap-lenis`. Base it on `frontend/sinulog-ui` until that branch is merged
   (the files in [Setup](#setup) are there), and on `main` after.
2. Install the two packages ([Install](#install)).
3. Make the seven [Setup](#setup) changes. Run the build and [Verify](#verify). **Stop and report** for review.
4. After approval, add the [recipes](#recipes): the News and Mayor reveals, then the Weather chart. Verify again.
5. Report what changed, the files touched, the bundle check, the Lighthouse Mobile scores and the manual checks you
   ran. Don't push or open a PR until asked (`frontend.md`).

## Verify

Build:

- `npm --prefix frontend run build` passes, and Vite's size report keeps the first load within 200 KB gzipped.
- Nothing loaded on the first visit contains GSAP or Lenis. `nullTargetWarn` only appears in GSAP's code and
  `lenisVersion` only in Lenis's. From the repo root, after the build:

  ```bash
  for f in $(grep -oE 'assets/[^"]+\.js' frontend/dist/index.html); do grep -qE 'nullTargetWarn|lenisVersion' "frontend/dist/$f" && echo "FAIL: $f has GSAP or Lenis"; done; echo "first-load check done"
  ```

- Lighthouse Mobile still meets `frontend.md`. Lenis loads only once the page is idle, and usually not at all under
  Lighthouse's phone emulation, so check desktop scrolling by hand.

Desktop, by hand (`npm --prefix frontend run preview`):

- Wheel and trackpad scrolling are smooth; `ctrl` + wheel and pinch still zoom; keyboard scrolling works.
- Click a nav link while the page is still gliding: the new page opens at the top and stays there.
- The Dashboard's high-alert button and `/profile#places` land just below the sticky header.
- A sheet's content scrolls with the wheel, and so do both Traffic lists. Sideways chip rows and the hour strip
  scroll with a sideways swipe or `shift` + wheel. Over a map, the wheel scrolls the page.
- `document.documentElement.classList.contains('lenis')` is `true` on desktop, and `false` after you switch DevTools
  to a phone (reload if it doesn't change) or turn on reduced motion.

Animations:

- Nothing on screen flickers on load, on "Show more" or after a refetch. Cards fade in once as you scroll down and
  stay put when you scroll back up.
- Find-in-page finds text in cards that haven't faded in yet, and print preview shows every card.
- With reduced motion on (Windows: Settings → Accessibility → Visual effects → Animation effects off; macOS: Reduce
  motion), scrolling is native, nothing fades and the chart is drawn at once.
- Switching between light and dark mode mid-animation changes colors instantly.
- In development (React StrictMode), go back and forth between News and the Dashboard a few times: no card is left
  invisible, and the console is clean.
- With the CPU throttled 6× in DevTools, scrolling and reveals still feel smooth, with no long tasks while scrolling.
