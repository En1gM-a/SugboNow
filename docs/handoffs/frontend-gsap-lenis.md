# Frontend: GSAP and Lenis (not used)

- **Status:** on hold. The frontend doesn't use GSAP or Lenis.
- **Decided by:** the reworked frontend spec in [`frontend.md`](frontend.md) (PR #29), October 2026
- **Replaces:** the GSAP and Lenis integration guide from PR #30

Don't install `gsap` or `lenis`, and don't add GSAP animations or smooth wheel scrolling. Animation and scrolling
follow `frontend.md`:

- **`<scrolling>`:** native scrolling. Smooth scrolling only for in-page jumps (for example, from the alert status
  line to the alerts section), and never with reduced motion on. Nothing appears on scroll: content is visible at
  rest, with no fade-ins as sections enter the viewport.
- **`<motion>`:** CSS for states, Motion for page transitions, onboarding steps, exit animations, `height: auto`
  expanders and live values, and the View Transitions API for the auth flow.

## Why not

- **GSAP:** the guide gave it two jobs, fading cards in as they scroll into view and drawing the Weather chart as it
  enters. Both are "appears on scroll" effects, which `<scrolling>` rules out. Everything else GSAP could do, Motion
  already does, so a second animation library would add about 28 KB (gzipped) for nothing.
- **Lenis:** it smooths ordinary wheel and trackpad scrolling, which `<scrolling>` rules out. In-page jumps don't
  need it: `scrollIntoView({ behavior: 'smooth' })` with `scroll-margin-top` on the target does the job.
- **The old guide is out of date:** it was written against the UI in PR #27, which was closed and whose look was
  rejected.

## If the team wants them later

Change `<scrolling>` and `<motion>` in `frontend.md` first, then write a new guide for the current layout. These
findings were checked against Lenis 1.1.22 and GSAP 3.15 in October 2026:

- **Versions:** Lenis 1.1.22 is the last 1.1 release (pin `lenis@~1.1.22`; npm's latest is 1.3, which Dependabot
  will propose). GSAP is free, plugins included.
- **Size:** GSAP's core is about 28 KB, ScrollTrigger about 18 KB and Lenis about 4 KB (gzipped). Load them with
  `import()` after the page renders, never in the first-load bundle.
- **Desktop only:** create Lenis only for
  `(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)`, and keep touch scrolling native
  (`syncTouch: false`).
- **Programmatic scrolling:** Lenis ignores `window.scrollTo` while it's still gliding, so route changes and
  `<ScrollRestoration />` would need `lenis.scrollTo(y, { immediate: true, force: true })`. `lenis.scrollTo(element)`
  ignores `scroll-margin-top`; pass it as `offset`.
- **Nested scrolling:** Lenis 1.1 has no `allowNestedScroll`. Every box with its own scrollbar, and every `<dialog>`,
  needs `data-lenis-prevent`. Sideways swipes with a little vertical drift get blocked unless the `virtualScroll`
  option hands mostly-horizontal gestures back to the browser.
- **GSAP with Lenis:** with `autoRaf: true`, don't also drive `lenis.raf()` from `gsap.ticker`. Don't use ScrollSmoother
  or `ScrollTrigger.normalizeScroll()` alongside Lenis.
- **Scroll reveals, if they're ever allowed:** trigger them with IntersectionObserver, which handles
  `content-visibility` lists that ScrollTrigger measures wrongly. Hide only what starts below the screen, and never
  use `visibility: hidden`.

The full guide is in the history:
[`frontend-gsap-lenis.md` at `a3cff74`](https://github.com/En1gM-a/SugboNow/blob/a3cff74/docs/handoffs/frontend-gsap-lenis.md).
