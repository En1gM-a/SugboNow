/**
 * Scrolls a sideways row just enough to show one of its items, centred, and only when the item is out of view.
 * Smooth unless still mode is on (handoff <scrolling>: smooth only for in-page jumps, never in still mode).
 */
export function revealSideways(scroller: HTMLElement | null, item: Element | null, still: boolean) {
  if (!scroller || !item || scroller.scrollWidth <= scroller.clientWidth) return;
  const s = scroller.getBoundingClientRect();
  const r = item.getBoundingClientRect();
  if (r.left >= s.left && r.right <= s.right) return;
  const left = scroller.scrollLeft + (r.left - s.left) - (scroller.clientWidth - r.width) / 2;
  scroller.scrollTo({ left, behavior: still ? 'auto' : 'smooth' });
}
