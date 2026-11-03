// The jeepney's cartoon exhaust (rebuilt from `smoke` in docs/handoffs/frontend-sample.html). Flat puffs with one
// hard shade and one bumpy outline around the whole cloud. They never fade: they pop in and pop away by scale.
// Plain elements and the Web Animations API, so the browser runs them on the compositor and there is no draw loop.

const POP = 'cubic-bezier(.34,1.7,.64,1)';
const rand = (a: number, b: number) => a + Math.random() * (b - a);

// A small lumpy tailpipe puff: an outline pass, then the shade and the fill on top, so only the outer edge gets a line.
const LUMPS: Array<[number, number, number]> = [[22, 37, 14], [35, 24, 15], [47, 38, 12.5], [33, 43, 13]];
const lumps = (fill: string, grow: number, dx: number, dy: number, k: number) =>
  LUMPS.map(([x, y, r]) => `<circle cx="${x + dx}" cy="${y + dy}" r="${r * k + grow}" style="fill:var(${fill})"/>`).join('');
const BLOB = `<svg viewBox="0 0 64 64" aria-hidden="true">${lumps('--puff-line', 2.8, 0, 0, 1)}${lumps('--puff-shade', 0, 0, 0, 1)}${lumps('--puff', 0, -1.4, -2, 0.92)}</svg>`;

/** The area to cover, in viewport pixels, and how many puffs it takes (34 for the card, 56 for the screen). */
export interface CoverArea {
  x: number;
  y: number;
  w: number;
  h: number;
  n: number;
}

interface Puff {
  dd: number;
  ink: HTMLElement;
  fill: HTMLElement;
}

export function createSmoke(host: HTMLElement) {
  let cloud: Puff[] = [];

  function make(x: number, y: number, r: number, className: string, inner?: string) {
    const el = document.createElement('i');
    el.className = className;
    el.style.cssText = `left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;font-size:${r}px`;
    if (inner) el.innerHTML = inner;
    host.append(el);
    return el;
  }

  /** One puff from the tailpipe: pops out, drifts back and up, shrinks away and removes itself. */
  function puff(x: number, y: number, r: number) {
    const el = make(x, y, r, 'puff-blob', BLOB);
    const dx = rand(18, 54);
    const dy = -rand(14, 40);
    const spin = `rotate(${Math.round(rand(0, 360))}deg)`;
    el.animate(
      [
        { transform: `translate(0,0) ${spin} scale(0)`, easing: POP },
        { transform: `translate(${dx * 0.3}px,${dy * 0.3}px) ${spin} scale(1)`, offset: 0.28, easing: 'ease-in' },
        { transform: `translate(${dx}px,${dy}px) ${spin} scale(0)` },
      ],
      { duration: rand(420, 640) },
    ).onfinish = () => el.remove();
  }

  /**
   * Big puffs pop open in a wave from the tailpipe (ox, oy) until the area is covered, and the promise resolves the
   * moment it is. Grid step d with radius at least .92d and jitter at most .12d leaves no gap. Every puff has an
   * outline circle under all the fills, so the whole cloud gets one bumpy outline and no lines inside it.
   */
  function cover(area: CoverArea, ox: number, oy: number, seconds: number): Promise<void> {
    const n = document.documentElement.dataset.lite === 'on' ? area.n * 0.6 : area.n;
    const d = Math.sqrt((area.w * area.h) / n);
    const m = d * 0.5;
    const cols = Math.ceil((area.w - 2 * m) / d) + 1;
    const rows = Math.ceil((area.h - 2 * m) / d) + 1;
    const spots: Array<{ x: number; y: number; r: number; dd: number }> = [];
    for (let i = 0; i < cols; i++) {
      for (let k = 0; k < rows; k++) {
        const x = area.x + m + (i * (area.w - 2 * m)) / Math.max(1, cols - 1) + rand(-0.12, 0.12) * d;
        const y = area.y + m + (k * (area.h - 2 * m)) / Math.max(1, rows - 1) + rand(-0.12, 0.12) * d;
        spots.push({ x, y, r: rand(0.92, 1.2) * d, dd: Math.hypot(x - ox, y - oy) });
      }
    }
    // Farthest first, so the puffs nearer the tailpipe sit in front and the shading bulges outward.
    spots.sort((p, q) => q.dd - p.dd);
    const far = spots[0]?.dd || 1;
    const pop = Math.min(220, seconds * 600);
    const inks = spots.map((p) => make(p.x, p.y, p.r + 3.5, 'puff-ink'));
    const fills = spots.map((p) => make(p.x, p.y, p.r, 'puff'));
    cloud = spots.map((p, i) => ({ dd: p.dd, ink: inks[i], fill: fills[i] }));
    const animations = cloud.flatMap((p) =>
      [p.ink, p.fill].map((el) =>
        el.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], {
          duration: pop,
          delay: (p.dd / far) * (seconds * 1000 - pop),
          easing: POP,
          fill: 'both',
        }),
      ),
    );
    return Promise.all(animations.map((a) => a.finished)).then(() => undefined);
  }

  /** The whole cloud pops away in the same wave, then its elements are removed. */
  function clear(): Promise<void> {
    const list = cloud;
    cloud = [];
    const far = list.reduce((max, p) => Math.max(max, p.dd), 1);
    return Promise.all(
      list.flatMap((p) =>
        [p.ink, p.fill].map(
          (el) =>
            el.animate(
              [{ transform: 'scale(1)' }, { transform: 'translateY(-6%) scale(1.06)', offset: 0.3 }, { transform: 'translateY(-26%) scale(0)' }],
              { duration: 220, delay: (p.dd / far) * 140, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' },
            ).finished,
        ),
      ),
    )
      .catch(() => undefined)
      .then(() => list.forEach((p) => (p.ink.remove(), p.fill.remove())));
  }

  return { puff, cover, clear };
}
