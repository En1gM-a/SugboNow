// Cubic-bezier easing for the few JavaScript tweens (stretchy pills, count-ups), matching the CSS timing tokens.

export function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      const slope = slopeX(t);
      if (Math.abs(err) < 1e-5 || slope === 0) break;
      t -= err / slope;
    }
    return sampleY(Math.min(1, Math.max(0, t)));
  };
}

/** --ease-out: entering, hover, sliding pills. */
export const easeOut = bezier(0.22, 1, 0.36, 1);
/** Count-ups (handoff: cubic-bezier(.16,1,.3,1)). */
export const easeCount = bezier(0.16, 1, 0.3, 1);

/** Tweens a number on requestAnimationFrame, after `delay` ms. Returns a function that stops it. */
export function tween(from: number, to: number, ms: number, ease: (t: number) => number, onUpdate: (value: number) => void, delay = 0): () => void {
  let raf = 0;
  let start = -1;
  const step = (now: number) => {
    if (start < 0) start = now + delay;
    const t = Math.min(1, Math.max(0, (now - start) / ms));
    onUpdate(from + (to - from) * ease(t));
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
