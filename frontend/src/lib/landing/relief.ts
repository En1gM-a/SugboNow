/**
 * Sample, not for merging: the landing background as one flight over a paper model of Metro Cebu.
 * It's drawn on a 2D canvas with a small hand-written projection, far to near, instead of a 3D library: the flight
 * costs a few kilobytes where three.js costs about 195 KB. Where the camera is depends only on the scroll position.
 */
import { AREAS, BRIDGES, FAR_INLAND, HILL_BASE, MACTAN, MAINLAND, ROADS, type Pt } from '@/lib/landing/cebuMap';

type V3 = [number, number, number];
type RGB = [number, number, number];

/** One stop per page section, in page order: where the camera is and what it looks at, in km (x east, y north, z up). */
export const STOPS: { at: string; eye: V3; aim: V3; light: number }[] = [
  { at: 'top', eye: [1.6, -6.9, 0.75], aim: [-1, -3.4, 0], light: 0 }, // morning traffic on N. Bacalso Ave
  { at: 'mornings', eye: [6.6, 0.4, 0.8], aim: [3.1, 2.45, 0], light: 0 }, // road works on A.S. Fortuna St
  { at: 'app', eye: [3.4, -3.6, 1.7], aim: [6.6, 1.6, 0.1], light: 1 }, // rain over the channel and the bridges
  { at: 'checks', eye: [10, -14, 7], aim: [1.5, 0, 0], light: 1 }, // a bagyo over the whole city
  { at: 'how', eye: [-1.2, -11.2, 0.9], aim: [-4.4, -7.9, 0], light: 2 }, // the Mananga River, Talisay
  { at: 'place', eye: [4.6, -2.6, 1.3], aim: [1, 0.6, 0], light: 2 }, // a district going dark
  { at: 'faq', eye: [9.6, -1.6, 0.8], aim: [6.6, 1.5, 0], light: 3 }, // evening traffic on the bridges
  { at: 'start', eye: [0.1, 2.4, 0.75], aim: [1.6, -3.6, 0], light: 3 }, // night on Osmeña Blvd, CCLEX far off
];

// Morning, rain, afternoon, night: sky, haze, far sea, near sea, land, low and high hill tops, low and high hill
// edges, roof, two walls, bridge deck. All near one blue, as the photos' grade was.
const PALETTES = [
  ['#2b4a80', '#9db3da', '#46679f', '#11244a', '#30497b', '#4a68a2', '#b3c6e6', '#2a4475', '#6a86ba', '#b2c6e8', '#5c7cb5', '#44639c', '#eef3fb'],
  ['#24324f', '#6f7f9c', '#34486e', '#0e1a33', '#28395c', '#3b5078', '#8a9bb8', '#22324f', '#55688c', '#8fa1c0', '#4b5e85', '#3a4b6e', '#cfd8e6'],
  ['#33507f', '#b9b4c8', '#4f6b9c', '#13254a', '#34497a', '#506aa0', '#c4c6dc', '#2d4474', '#7486b5', '#c3cbe3', '#6a7cb0', '#4b5f95', '#f3efe9'],
  ['#050a18', '#1c2a4a', '#18294d', '#060d1f', '#101c36', '#16254a', '#2f4a78', '#0c1730', '#22375e', '#26385f', '#192a4c', '#132241', '#b8c6df'],
].map((colors) => colors.map((c): RGB => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]));
const MANGO = '#FFC233';
const RED = '#ff6a55';
const NEAR = 0.05; // km: anything closer to the camera is cut away
const STEPS = 7; // the hills' paper layers, 0.1 km each: about 1.5 times real, as relief models do

interface Cam {
  e: V3;
  f: V3;
  r: V3;
  u: V3;
  F: number;
  cx: number;
  cy: number;
}

interface Block {
  x: number;
  y: number;
  sx: number;
  sy: number;
  h: number;
}

const mixRGB = (a: RGB, b: RGB, t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(' ')})`;

/** Points every `step` km along a line, the first `start` km in. */
export function resample(line: Pt[], step: number, start = 0): Pt[] {
  const out: Pt[] = [];
  let next = start;
  let walked = 0;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1];
    const [bx, by] = line[i];
    const len = Math.hypot(bx - ax, by - ay);
    for (; next <= walked + len; next += step) {
      const t = (next - walked) / len;
      out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
    walked += len;
  }
  return out;
}

/** The line moved `side` km to its left (negative: right), point by point. */
function shifted(line: Pt[], side: (i: number) => number): Pt[] {
  return line.map(([x, y], i) => {
    const [px, py] = line[Math.max(0, i - 1)];
    const [nx, ny] = line[Math.min(line.length - 1, i + 1)];
    const len = Math.hypot(nx - px, ny - py);
    return [x - ((ny - py) / len) * side(i), y + ((nx - px) / len) * side(i)];
  });
}

export function inside(poly: Pt[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Each step's edge, low to high, as lines parallel to the coast with a slow wobble. */
function terraces(): Pt[][] {
  const base = resample(HILL_BASE, 0.5);
  return Array.from({ length: STEPS }, (_, j) =>
    shifted(base, (i) => 3.6 + 0.9 * j + 0.45 * Math.sin(i * 0.25 + j * 1.7) + 0.2 * Math.sin(i * 0.65 + j)),
  );
}

/** Card blocks on a grid, on land below the hills, thinning out away from each city's center. */
function city(foot: Pt[]): Block[] {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const out: Block[] = [];
  for (let x = -16; x < 17; x += 0.2) {
    for (let y = -14; y < 16; y += 0.2) {
      const near = Math.min(...AREAS.map(([ax, ay]) => Math.hypot(x - ax, y - ay)));
      if (near > 6 || rnd() > 0.95 - near * 0.13) continue;
      const island = inside(MACTAN, x, y);
      if (!island && (!inside(MAINLAND, x, y) || inside(foot, x, y))) continue;
      const tall = (island ? 0.025 : 0.055) * Math.max(0.35, 1 - near / 6);
      out.push({ x, y, sx: 0.09 + rnd() * 0.07, sy: 0.09 + rnd() * 0.07, h: 0.008 + rnd() * tall });
    }
  }
  return out;
}

function camera(eye: V3, aim: V3, w: number, h: number): Cam {
  const d = [aim[0] - eye[0], aim[1] - eye[1], aim[2] - eye[2]];
  const m = Math.hypot(d[0], d[1], d[2]);
  const f: V3 = [d[0] / m, d[1] / m, d[2] / m];
  const flat = Math.hypot(f[0], f[1]);
  const r: V3 = [f[1] / flat, -f[0] / flat, 0];
  const u: V3 = [r[1] * f[2], -r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  // The wider side of the screen always sees about 69 degrees, so phones and desktops frame each stop alike.
  return { e: eye, f, r, u, F: Math.max(w, h) / 2 / Math.tan(0.6), cx: w / 2, cy: h / 2 };
}

function view(c: Cam, x: number, y: number, z: number): V3 {
  const dx = x - c.e[0];
  const dy = y - c.e[1];
  const dz = z - c.e[2];
  return [dx * c.r[0] + dy * c.r[1], dx * c.u[0] + dy * c.u[1] + dz * c.u[2], dx * c.f[0] + dy * c.f[1] + dz * c.f[2]];
}

/**
 * A flat outline on screen, cut to a little more than the camera sees (Sutherland-Hodgman, one plane at a time).
 * Cutting at the sides too matters: land reaching far past the screen would otherwise project to coordinates so
 * large that the canvas quietly skips the whole shape.
 */
export function outline(c: Cam, pts: V3[]): number[] {
  const kx = (c.cx * 1.25) / c.F;
  const ky = (c.cy * 1.25) / c.F;
  const planes = [
    (p: V3) => p[2] - NEAR,
    (p: V3) => kx * p[2] - p[0],
    (p: V3) => kx * p[2] + p[0],
    (p: V3) => ky * p[2] - p[1],
    (p: V3) => ky * p[2] + p[1],
  ];
  let v = pts.map(([x, y, z]) => view(c, x, y, z));
  for (const side of planes) {
    const out: V3[] = [];
    v.forEach((p, i) => {
      const q = v[(i + v.length - 1) % v.length];
      const [dp, dq] = [side(p), side(q)];
      if (dp >= 0 !== dq >= 0) {
        const t = dq / (dq - dp);
        out.push([q[0] + (p[0] - q[0]) * t, q[1] + (p[1] - q[1]) * t, q[2] + (p[2] - q[2]) * t]);
      }
      if (dp >= 0) out.push(p);
    });
    v = out;
  }
  return v.flatMap((p) => [c.cx + (p[0] / p[2]) * c.F, c.cy - (p[1] / p[2]) * c.F]);
}

function trace(path: CanvasRenderingContext2D | Path2D, xy: number[]) {
  if (xy.length < 6) return;
  path.moveTo(xy[0], xy[1]);
  for (let i = 2; i < xy.length; i += 2) path.lineTo(xy[i], xy[i + 1]);
  path.closePath();
}

function fill(ctx: CanvasRenderingContext2D, xy: number[], color: string) {
  ctx.beginPath();
  trace(ctx, xy);
  ctx.fillStyle = color;
  ctx.fill();
}

/** An open line; any piece behind the camera or far off screen is simply left out. */
function stroke(ctx: CanvasRenderingContext2D, c: Cam, pts: V3[], color: string, width: number) {
  ctx.beginPath();
  let pen = false;
  for (const [x, y, z] of pts) {
    const p = view(c, x, y, z);
    if (p[2] < NEAR || Math.abs(p[0]) > p[2] * 3 || Math.abs(p[1]) > p[2] * 3) {
      pen = false;
      continue;
    }
    const sx = c.cx + (p[0] / p[2]) * c.F;
    const sy = c.cy - (p[1] / p[2]) * c.F;
    if (pen) ctx.lineTo(sx, sy);
    else ctx.moveTo(sx, sy);
    pen = true;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

const flat = (line: Pt[], z: number) => line.map(([x, y]): V3 => [x, y, z]);
const spline = (a: number, b: number, c: number, d: number, t: number) =>
  0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);

export function createRelief(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const hills = terraces();
  const blocks = city([...hills[0], ...FAR_INLAND]);

  function drawCity(c: Cam, colors: string[], w: number, h: number) {
    const seen: { b: Block; z: number }[] = [];
    for (const b of blocks) {
      const p = view(c, b.x + b.sx / 2, b.y + b.sy / 2, 0);
      if (p[2] < 0.3 || p[2] > 16) continue;
      const sx = c.cx + (p[0] / p[2]) * c.F;
      const sy = c.cy - (p[1] / p[2]) * c.F;
      if (sx > -60 && sx < w + 60 && sy > -60 && sy < h + 60) seen.push({ b, z: p[2] });
    }
    seen.sort((a, b) => b.z - a.z);
    let roofs = new Path2D();
    let wallsX = new Path2D();
    let wallsY = new Path2D();
    const flush = () => {
      ctx!.fillStyle = colors[11];
      ctx!.fill(wallsY);
      ctx!.fillStyle = colors[10];
      ctx!.fill(wallsX);
      ctx!.fillStyle = colors[9];
      ctx!.fill(roofs);
      roofs = new Path2D();
      wallsX = new Path2D();
      wallsY = new Path2D();
    };
    // Far to near in small batches, three fills each: close enough to true order at these heights.
    seen.forEach(({ b, z }, i) => {
      const { x, y, sx, sy, h: top } = b;
      if (z < 8) {
        const fx = c.e[0] < x ? x : c.e[0] > x + sx ? x + sx : null;
        if (fx !== null) trace(wallsX, outline(c, [[fx, y, 0], [fx, y + sy, 0], [fx, y + sy, top], [fx, y, top]]));
        const fy = c.e[1] < y ? y : c.e[1] > y + sy ? y + sy : null;
        if (fy !== null) trace(wallsY, outline(c, [[x, fy, 0], [x + sx, fy, 0], [x + sx, fy, top], [x, fy, top]]));
      }
      trace(roofs, outline(c, [[x, y, top], [x + sx, y, top], [x + sx, y + sy, top], [x, y + sy, top]]));
      if (i % 24 === 23) flush();
    });
    flush();
  }

  /** Cars as small lights along a road: one lane crawling (red where it's jammed), the other moving. */
  function traffic(c: Cam, road: Pt[], scroll: number, dpr: number, jam: [number, number]) {
    for (const [side, speed] of [[0.009, 0.00008], [-0.009, 0.0004]]) {
      const cars = resample(shifted(road, () => side), 0.045, (scroll * speed) % 0.045);
      cars.forEach(([x, y], i) => {
        const p = view(c, x, y, 0.006);
        if (p[2] < NEAR) return;
        const s = Math.max(1.4 * dpr, (0.022 * c.F) / p[2]);
        const t = i / cars.length;
        ctx!.fillStyle = side > 0 && t > jam[0] && t < jam[1] ? RED : MANGO;
        ctx!.fillRect(c.cx + (p[0] / p[2]) * c.F - s / 2, c.cy - (p[1] / p[2]) * c.F - s / 2, s, s);
      });
    }
  }

  /** Road works: one lane closed with a red card and a row of cones, the queue behind it. */
  function works(c: Cam, road: Pt[], from: number, to: number, dpr: number) {
    const pts = resample(road, 0.02);
    const part = pts.slice(Math.floor(pts.length * from), Math.floor(pts.length * to));
    fill(ctx!, outline(c, [...flat(shifted(part, () => 0.002), 0.004), ...flat(shifted(part, () => 0.017), 0.004).reverse()]), RED);
    ctx!.fillStyle = MANGO;
    for (const [x, y] of resample(shifted(part, () => 0.001), 0.03)) {
      const p = view(c, x, y, 0.005);
      if (p[2] < NEAR) continue;
      const sx = c.cx + (p[0] / p[2]) * c.F;
      const sy = c.cy - (p[1] / p[2]) * c.F;
      const s = Math.max(2 * dpr, (0.02 * c.F) / p[2]);
      ctx!.beginPath();
      ctx!.moveTo(sx - s / 2, sy + s / 3);
      ctx!.lineTo(sx, sy - s);
      ctx!.lineTo(sx + s / 2, sy + s / 3);
      ctx!.fill();
    }
  }

  return {
    /** `s` runs from 0 (the first stop) to STOPS.length - 1 (the last); `scroll` moves the cars. */
    draw(s: number, scroll: number) {
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      const dpr = w / Math.max(1, canvas.clientWidth);
      const i = Math.min(STOPS.length - 2, Math.floor(s));
      const t = s - i;
      const at = (k: number) => STOPS[Math.max(0, Math.min(STOPS.length - 1, k))];
      const path = (key: 'eye' | 'aim') =>
        [0, 1, 2].map((n) => spline(at(i - 1)[key][n], at(i)[key][n], at(i + 1)[key][n], at(i + 2)[key][n], t)) as V3;
      const eye = path('eye');
      eye[2] = Math.max(0.3, eye[2]);
      const c = camera(eye, path('aim'), w, h);
      const [from, to] = [PALETTES[at(i).light], PALETTES[at(i + 1).light]];
      const tones = from.map((rgb, n) => rgb.map((v, j) => v + (to[n][j] - v) * t) as RGB);
      const colors = tones.map((rgb) => mixRGB(rgb, rgb, 0));

      // Sky down to the horizon, then the sea, lighter far off.
      const horizon = c.cy - c.F * (-c.f[2] / Math.hypot(c.f[0], c.f[1]));
      const sea = ctx.createLinearGradient(0, Math.max(0, horizon), 0, h);
      sea.addColorStop(0, colors[2]);
      sea.addColorStop(1, colors[3]);
      ctx.fillStyle = sea;
      ctx.fillRect(0, 0, w, h);
      if (horizon > 0) {
        const sky = ctx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, colors[0]);
        sky.addColorStop(1, colors[1]);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, horizon);
      }

      fill(ctx, outline(c, flat(MAINLAND, 0)), colors[4]);
      fill(ctx, outline(c, flat(MACTAN, 0)), colors[4]);
      stroke(ctx, c, flat([...MAINLAND.slice(0, -3)], 0.002), 'rgb(214 226 245 / 0.5)', 1.2 * dpr);
      stroke(ctx, c, flat([...MACTAN, MACTAN[0]], 0.002), 'rgb(214 226 245 / 0.5)', 1.2 * dpr);

      // The hills: highest and farthest step first, each one's top and then the cut edge facing the sea.
      for (let k = STEPS; k >= 1; k--) {
        const edge = hills[k - 1];
        const z = 0.1 * k;
        const shade = (a: number, b: number) => mixRGB(tones[a], tones[b], (k - 1) / (STEPS - 1));
        const back = k < STEPS ? hills[k] : FAR_INLAND;
        fill(ctx, outline(c, [...flat(edge, z), ...flat(back, z).reverse()]), shade(5, 6));
        fill(ctx, outline(c, [...flat(edge, z - 0.1), ...flat(edge, z).reverse()]), shade(7, 8));
        stroke(ctx, c, flat(edge, z), 'rgb(255 255 255 / 0.5)', dpr);
      }

      for (const road of Object.values(ROADS)) stroke(ctx, c, flat(road, 0.003), 'rgb(220 232 250 / 0.55)', 1.6 * dpr);
      drawCity(c, colors, w, h);

      for (const [name, [[ax, ay], [bx, by]]] of Object.entries(BRIDGES)) {
        const deck = name === 'cclex' ? 0.06 : 0.045;
        const len = Math.hypot(bx - ax, by - ay);
        const [nx, ny] = [(-(by - ay) / len) * 0.016, ((bx - ax) / len) * 0.016];
        const span = Array.from({ length: 13 }, (_, n) => n / 12);
        const lift = (u: number) => deck * Math.min(1, u * 5, (1 - u) * 5);
        const side = (sign: number) => span.map((u): V3 => [ax + (bx - ax) * u + nx * sign, ay + (by - ay) * u + ny * sign, lift(u)]);
        fill(ctx, outline(c, [...side(1), ...side(-1).reverse()]), colors[12]);
        if (name === 'osmena') continue;
        for (const u of [0.42, 0.58]) {
          const [px, py] = [ax + (bx - ax) * u, ay + (by - ay) * u];
          stroke(ctx, c, [[px, py, deck], [px, py, deck + (name === 'cclex' ? 0.15 : 0.11)]], colors[12], 2.5 * dpr);
        }
      }

      // The first two stops' happenings: morning traffic on N. Bacalso, road works on A.S. Fortuna.
      traffic(c, ROADS.bacalso, scroll, dpr, [0.1, 0.85]);
      works(c, ROADS.fortuna, 0.42, 0.62, dpr);
      traffic(c, ROADS.fortuna, scroll, dpr, [0.12, 0.42]);

      const haze = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      haze.addColorStop(0, colors[1].replace(')', ' / 0.45)'));
      haze.addColorStop(1, colors[1].replace(')', ' / 0)'));
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, w, h * 0.45);
    },
  };
}

/** Where each section's stop is reached: as the section's top crosses the middle of the screen. */
export function stopMarks(): number[] {
  return STOPS.map(({ at }, i) => {
    const el = i ? document.getElementById(at) : null;
    return el ? el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 : i * window.innerHeight;
  });
}

/** The camera holds at a stop while its section is read, and travels in the last screen of scroll before the next. */
export function progress(y: number, marks: number[], screen: number): number {
  for (let i = 0; i < marks.length - 1; i++) {
    if (y >= marks[i + 1]) continue;
    const travel = Math.max(1, Math.min(screen * 0.9, marks[i + 1] - marks[i]));
    const t = Math.min(1, Math.max(0, (y - (marks[i + 1] - travel)) / travel));
    return i + t * t * (3 - 2 * t);
  }
  return marks.length - 1;
}
