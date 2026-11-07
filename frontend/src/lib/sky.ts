// The live Cebu sky (rebuilt from `sky` in docs/handoffs/frontend-sample.html, which has every exact value): one canvas
// behind the app, drawn with no React state. The gradient follows the Manila time; the weather blends it darker and adds
// clouds, rain streaks, drops beading on the glass and, in storms, lightning. Changes ease in over about a second.

import type { TimeName } from './time';

export type SkyWeather = 'clear' | 'cloudy' | 'rain' | 'storm' | 'haze';

type RGB = [number, number, number];
type Stops = [string, string, string];

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Top, middle and bottom stops (0%, 55%, 100%) for each time of day.
const PALETTE: Record<TimeName, Stops> = {
  buntag: ['#2B5296', '#7FA6E0', '#FFDCA0'],
  udto: ['#1A5DBF', '#4E9BEA', '#BFE3FF'],
  hapon: ['#22468F', '#6C8ED6', '#FFC774'],
  gabii: ['#060B1C', '#0D1C42', '#1E3A6E'],
};
// The weather pulls each stop toward its own color by this amount (45% of it at night).
const BLEND: Record<Exclude<SkyWeather, 'clear'>, [Stops, number]> = {
  cloudy: [['#5A7090', '#8EA3BE', '#C9D5E3'], 0.35],
  rain: [['#334155', '#4B5A6E', '#6E7E92'], 0.6],
  storm: [['#151B26', '#232D3B', '#36424F'], 0.82],
  haze: [['#6E6252', '#A8947A', '#DCC39A'], 0.62],
};
const WEATHER: Record<SkyWeather, { clouds: number; rain: number; storm: number; sunVis: number; haze: number }> = {
  clear: { clouds: 3, rain: 0, storm: 0, sunVis: 1, haze: 0 },
  cloudy: { clouds: 9, rain: 0, storm: 0, sunVis: 0.45, haze: 0 },
  rain: { clouds: 10, rain: 0.65, storm: 0, sunVis: 0.12, haze: 0 },
  storm: { clouds: 12, rain: 1, storm: 1, sunVis: 0.12, haze: 0 },
  haze: { clouds: 2, rain: 0, storm: 0, sunVis: 0.75, haze: 0.8 },
};
// Where the sun (or the moon at gabii) sits, as a fraction of the width and height.
const SUN: Record<TimeName, [number, number]> = { buntag: [0.18, 0.34], udto: [0.64, 0.14], hapon: [0.82, 0.3], gabii: [0.8, 0.16] };

interface SkyState {
  cols: RGB[];
  clouds: number;
  rain: number;
  storm: number;
  night: number;
  sun: [number, number];
  sunVis: number;
  haze: number;
}
/** Overrides for one weather's numbers, for a sky that moves between weathers (a landing page scene's dial). */
export type SkyMix = Partial<Pick<SkyState, 'clouds' | 'rain' | 'storm' | 'sunVis' | 'haze'>>;
interface Star { x: number; y: number; r: number; ph: number; sp: number }
interface Cloud { x: number; y: number; s: number; v: number; a: number; i: number }
interface Drop { x: number; y: number; l: number; v: number }
interface Bead { x: number; y: number; r: number; v: number; stick: number }

export interface SkyHandle {
  setTarget(time: TimeName, weather: SkyWeather, mix?: SkyMix): void;
  setLite(on: boolean): void;
  setStill(on: boolean): void;
  /** A gust that pushes the clouds along and dies away: `speed` is in px per ms, such as how fast the page is scrolling. */
  setWind(speed: number): void;
  /** Where the pointer is, from -0.5 to 0.5 across the screen. The clouds lean away from it a little. */
  setPointer(x: number, y: number): void;
  destroy(): void;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clone = (s: SkyState): SkyState => ({ ...s, cols: s.cols.map((c) => [...c] as RGB), sun: [...s.sun] });

function stateFor(time: TimeName, weather: SkyWeather): SkyState {
  let cols = PALETTE[time].map(hex);
  if (weather !== 'clear') {
    const [to, amount] = BLEND[weather];
    const k = time === 'gabii' ? amount * 0.45 : amount;
    cols = cols.map((col, i) => col.map((v, j) => Math.round(v + (hex(to[i])[j] - v) * k)) as RGB);
  }
  const w = WEATHER[weather];
  return { cols, clouds: w.clouds, rain: w.rain, storm: w.storm, night: time === 'gabii' ? 1 : 0, sun: SUN[time], sunVis: w.sunVis, haze: w.haze };
}

/** A sky as a CSS gradient, for small surfaces that show the same sky, like the landing page's phone screens. */
export function skyGradient(time: TimeName, weather: SkyWeather): string {
  const [top, middle, bottom] = stateFor(time, weather).cols.map((c) => `rgb(${c.join(',')})`);
  return `linear-gradient(180deg, ${top} 0%, ${middle} 55%, ${bottom} 100%)`;
}

/**
 * Starts the sky on `canvas`. `onTone` reports whether the middle of the sky is dark (so light glass can rise to keep
 * its contrast) and the top color (for the page background and theme-color).
 */
export function createSky(canvas: HTMLCanvasElement, onTone: (tone: 'dark' | 'light', top: string) => void): SkyHandle {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { setTarget() {}, setLite() {}, setStill() {}, setWind() {}, setPointer() {}, destroy() {} };

  let width = 0;
  let height = 0;
  let last = 0;
  let raf = 0;
  let running = false;
  let lite = false;
  let still = false;
  let cur: SkyState | null = null;
  let target: SkyState = stateFor('udto', 'clear');
  let stars: Star[] = [];
  let clouds: Cloud[] = [];
  let drops: Drop[] = [];
  let beads: Bead[] = [];
  let flash = 0;
  let bolt: Array<[number, number]> | null = null;
  let nextFlash = 0;
  let gust = 0;
  let leanX = 0;
  let leanY = 0;
  let pointerX = 0;
  let pointerY = 0;

  // One soft cloud, drawn once and stamped at different sizes.
  const sprite = document.createElement('canvas');
  sprite.width = 256;
  sprite.height = 150;
  const s = sprite.getContext('2d');
  if (s) {
    for (const [x, y, r] of [[70, 78, 46], [118, 60, 56], [170, 76, 44], [128, 88, 50], [92, 92, 38], [196, 92, 30]]) {
      const g = s.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,.95)');
      g.addColorStop(0.7, 'rgba(255,255,255,.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      s.fillStyle = g;
      s.beginPath();
      s.arc(x, y, r, 0, Math.PI * 2);
      s.fill();
    }
  }

  function seed() {
    const area = width * height;
    const k = lite ? 0.5 : 1;
    stars = Array.from({ length: Math.round(Math.min(140, area / 9000) * k) }, () => ({ x: rnd(0, width), y: rnd(0, height * 0.62), r: rnd(0.5, 1.6), ph: rnd(0, 6.3), sp: rnd(0.6, 1.6) }));
    clouds = Array.from({ length: 14 }, (_, i) => ({ x: rnd(-200, width), y: rnd(height * 0.04, height * 0.5), s: rnd(0.7, 1.9), v: rnd(4, 12), a: rnd(0.55, 0.95), i }));
    drops = Array.from({ length: Math.round(Math.min(380, area / 3200) * k) }, () => ({ x: rnd(-100, width), y: rnd(-height, height), l: rnd(10, 22), v: rnd(620, 980) }));
    beads = Array.from({ length: Math.round(28 * k) }, () => ({ x: rnd(0, width), y: rnd(0, height), r: rnd(1.6, 4.2), v: rnd(6, 40), stick: rnd(0, 3) }));
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1 : 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    draw(0, performance.now());
  }

  function draw(dt: number, now: number) {
    if (!cur) return;
    const c = ctx!;
    const k = dt ? 1 - Math.exp(-dt * 2.2) : 0;
    cur.cols = cur.cols.map((col, i) => col.map((v, j) => lerp(v, target.cols[i][j], k)) as RGB);
    cur.clouds = lerp(cur.clouds, target.clouds, k);
    cur.rain = lerp(cur.rain, target.rain, k);
    cur.storm = lerp(cur.storm, target.storm, k);
    cur.night = lerp(cur.night, target.night, k);
    cur.sunVis = lerp(cur.sunVis, target.sunVis, k);
    cur.haze = lerp(cur.haze, target.haze, k);
    cur.sun = [lerp(cur.sun[0], target.sun[0], k), lerp(cur.sun[1], target.sun[1], k)];
    if (dt) {
      leanX = lerp(leanX, pointerX, 1 - Math.exp(-dt * 2.4));
      leanY = lerp(leanY, pointerY, 1 - Math.exp(-dt * 2.4));
      gust *= Math.exp(-dt * 2.2);
    }

    const g = c.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, `rgb(${cur.cols[0].map(Math.round)})`);
    g.addColorStop(0.55, `rgb(${cur.cols[1].map(Math.round)})`);
    g.addColorStop(1, `rgb(${cur.cols[2].map(Math.round)})`);
    c.fillStyle = g;
    c.fillRect(0, 0, width, height);
    const t = now / 1000;

    if (cur.night > 0.02) {
      c.fillStyle = '#fff';
      for (const st of stars) {
        c.globalAlpha = cur.night * (1 - cur.rain * 0.8) * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph)));
        c.beginPath();
        c.arc(st.x, st.y, st.r, 0, 6.283);
        c.fill();
      }
      c.globalAlpha = 1;
    }

    // The sun (or the moon) with a soft glow; the disc fades as the weather worsens.
    const sx = cur.sun[0] * width;
    const sy = cur.sun[1] * height;
    const vis = cur.sunVis;
    if (vis > 0.02) {
      const isMoon = cur.night > 0.5;
      const radius = Math.min(width, height) * (isMoon ? 0.22 : 0.34);
      const glow = c.createRadialGradient(sx, sy, 0, sx, sy, radius);
      glow.addColorStop(0, isMoon ? `rgba(244,213,141,${0.35 * vis})` : `rgba(255,214,120,${0.6 * vis})`);
      glow.addColorStop(1, 'rgba(255,214,120,0)');
      c.fillStyle = glow;
      c.beginPath();
      c.arc(sx, sy, radius, 0, 6.283);
      c.fill();
      c.globalAlpha = vis;
      c.fillStyle = isMoon ? '#F4E3B5' : '#FFE8A3';
      c.beginPath();
      c.arc(sx, sy, Math.min(width, height) * (isMoon ? 0.028 : 0.04), 0, 6.283);
      c.fill();
      c.globalAlpha = 1;
    }

    const visible = cur.clouds;
    const grey = Math.min(1, cur.rain * 0.9 + cur.storm * 0.2);
    for (const cl of clouds) {
      if (cl.i >= visible + 0.5) continue;
      cl.x += (cl.v + gust) * dt * (1 + cur.storm);
      if (cl.x > width + 60) {
        cl.x = -280 * cl.s;
        cl.y = rnd(height * 0.04, height * 0.5);
      }
      c.globalAlpha = cl.a * Math.min(1, visible - cl.i + 0.5) * (cur.night > 0.5 ? 0.35 : 1) * (1 - grey * 0.35);
      c.drawImage(sprite, cl.x - leanX * 46 * cl.s, cl.y - leanY * 18 * cl.s, 256 * cl.s, 150 * cl.s);
    }
    c.globalAlpha = 1;
    if (grey > 0.05) {
      c.fillStyle = `rgba(20,28,40,${grey * 0.18})`;
      c.fillRect(0, 0, width, height);
    }

    if (cur.rain > 0.02) {
      const n = Math.round(drops.length * cur.rain);
      const wind = 0.22 + cur.storm * 0.12;
      c.strokeStyle = `rgba(210,225,245,${0.32 + cur.storm * 0.1})`;
      c.lineWidth = 1.1;
      c.beginPath();
      for (let i = 0; i < n; i++) {
        const d = drops[i];
        d.y += d.v * dt;
        d.x += d.v * dt * wind;
        if (d.y > height) {
          d.y = rnd(-60, -10);
          d.x = rnd(-120, width);
        }
        c.moveTo(d.x, d.y);
        c.lineTo(d.x - d.l * wind, d.y - d.l);
      }
      c.stroke();
      // Small drops beading on the "glass": they stick, then slide down.
      for (const b of beads) {
        if (b.stick > 0) b.stick -= dt;
        else {
          b.y += b.v * dt;
          if (Math.random() < 0.004) b.stick = rnd(0.4, 2.5);
        }
        if (b.y > height + 8) {
          b.y = rnd(-20, height * 0.5);
          b.x = rnd(0, width);
        }
        c.globalAlpha = cur.rain;
        c.fillStyle = 'rgba(235,244,255,.22)';
        c.beginPath();
        c.arc(b.x, b.y, b.r, 0, 6.283);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)';
        c.beginPath();
        c.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.32, 0, 6.283);
        c.fill();
      }
      c.globalAlpha = 1;
    }

    // Haze: a warm veil, thicker toward the horizon.
    if (cur.haze > 0.01) {
      const veil = c.createLinearGradient(0, 0, 0, height);
      veil.addColorStop(0, `rgba(170,146,118,${0.42 * cur.haze})`);
      veil.addColorStop(1, `rgba(226,196,150,${0.82 * cur.haze})`);
      c.fillStyle = veil;
      c.fillRect(0, 0, width, height);
    }

    // Lightning: one flash and one bolt at most every 4.2–8.2 s, never brighter than 28%, for people sensitive to flashing.
    if (cur.storm > 0.5 && !still) {
      if (now > nextFlash) {
        nextFlash = now + rnd(4200, 8200);
        flash = 1;
        let x = rnd(width * 0.15, width * 0.85);
        let y = 0;
        bolt = [[x, y]];
        while (y < height * 0.55) {
          y += rnd(18, 42);
          x += rnd(-26, 26);
          bolt.push([x, y]);
        }
      }
      if (flash > 0) {
        c.fillStyle = `rgba(220,230,255,${flash * 0.28})`;
        c.fillRect(0, 0, width, height);
        if (bolt && flash > 0.6) {
          c.strokeStyle = `rgba(255,255,255,${flash})`;
          c.lineWidth = 2.2;
          c.beginPath();
          bolt.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
          c.stroke();
        }
        flash = Math.max(0, flash - dt * 3);
      }
    }
  }

  function loop(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    // Lite mode draws at most 30 frames per second.
    if (!lite || dt >= 1 / 31) {
      last = now;
      draw(dt, now);
    }
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running || still || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function report() {
    const [r, g, b] = target.cols[1];
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    onTone(luminance < 0.42 ? 'dark' : 'light', `rgb(${target.cols[0].join(',')})`);
  }

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', resize);
  resize();

  return {
    setWind(speed) {
      gust = Math.max(gust, Math.min(320, speed * 120));
    },
    setPointer(x, y) {
      pointerX = x;
      pointerY = y;
    },
    setTarget(time, weather, mix) {
      target = stateFor(time, weather);
      if (mix) Object.assign(target, mix);
      if (!cur || still) cur = clone(target);
      report();
      draw(0, performance.now());
      start();
    },
    setLite(on) {
      if (lite === on) return;
      lite = on;
      resize();
    },
    setStill(on) {
      still = on;
      if (on) {
        stop();
        if (cur) cur = clone(target);
        draw(0, performance.now());
      } else start();
    },
    destroy() {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
    },
  };
}
