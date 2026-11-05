/**
 * Runs `work` once the page has had time to show its content: at least `floor` ms from now, then when the browser is
 * idle. For code a page doesn't need to appear, so it never competes with getting content on screen. Returns a cancel.
 */
export function whenSettled(work: () => void, floor = 1500): () => void {
  let idle: number | undefined;
  const timer = window.setTimeout(() => {
    if ('requestIdleCallback' in window) idle = window.requestIdleCallback(work, { timeout: 1500 });
    else work();
  }, floor);
  return () => {
    window.clearTimeout(timer);
    if (idle !== undefined) window.cancelIdleCallback(idle);
  };
}
