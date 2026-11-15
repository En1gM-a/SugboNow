/**
 * Sample, not for merging: the landing background as one flight over a paper model of Metro Cebu.
 * It's drawn on a 2D canvas with a small hand-written projection, far to near, instead of a 3D library: the flight
 * costs a few kilobytes where three.js costs about 195 KB. Where the camera is depends only on the scroll position.
 */
import { AREAS, BRIDGES, HILL_EDGES, MACTAN, MAINLAND, RIVER, ROADS, type Pt } from '@/lib/landing/cebuMap';

type V3 = [number, number, number];
type RGB = [number, number, number];

interface Stop {
  at: string;
  /** What's happening and where: the caption while this stop is on screen. */
  title: string;
  place: string;
  eye: V3;
  aim: V3;
  /** Morning, rain, afternoon or night: an index into PALETTES. */
  light: number;
  /** How hard it rains, 0 to 1. */
  rain: number;
}

/** One stop per page section, in page order, in km east (x), north (y) and up (z) from Cebu City's center. */
export const STOPS: Stop[] = [
  { at: 'top', title: 'Morning traffic', place: 'N. Bacalso Avenue, Cebu City', eye: [-0.2, -5.2, 0.85], aim: [-1, -2.6, 0], light: 0, rain: 0 },
  { at: 'mornings', title: 'Road works', place: 'A.S. Fortuna Street, Mandaue', eye: [6.6, 0, 0.7], aim: [4.3, 2.35, 0], light: 0, rain: 0 },
  { at: 'app', title: 'Rain clouds building', place: 'Over the Mactan Channel and its bridges', eye: [6.6, -1.4, 0.9], aim: [8.8, 1.3, 0.05], light: 1, rain: 0.7 },
  { at: 'checks', title: 'A bagyo crossing', place: 'Wind and rain bands over Metro Cebu', eye: [12, -14, 7], aim: [2, 0.5, 0], light: 1, rain: 1 },
  { at: 'how', title: 'The river rising', place: 'Mananga River, Talisay', eye: [-3.4, -9.4, 0.8], aim: [-5.6, -6.6, 0], light: 2, rain: 0.35 },
  { at: 'place', title: 'Power and water off', place: 'A district going dark, Cebu City', eye: [4.8, -2.2, 1.3], aim: [1.6, 1.2, 0], light: 3, rain: 0 },
  { at: 'faq', title: 'Evening traffic', place: 'The Mandaue–Mactan bridges', eye: [9.9, -0.4, 0.45], aim: [8.6, 1.2, 0.03], light: 3, rain: 0 },
  { at: 'start', title: 'A calm night', place: 'Osmeña Boulevard, with CCLEX lit far off', eye: [0, 1.8, 0.7], aim: [1.8, -2.6, 0], light: 3, rain: 0 },
];

// Morning, rain, afternoon, night: sky, haze, far sea, near sea, land, low and high hill tops, low and high hill
// edges, roof, two walls, bridge deck. All near one blue, as the photos' grade was.
const PALETTES = [
  ['#2b4a80', '#9db3da', '#46679f', '#11244a', '#30497b', '#4a68a2', '#b3c6e6', '#2a4475', '#6a86ba', '#b2c6e8', '#5c7cb5', '#44639c', '#eef3fb'],
  ['#24324f', '#6f7f9c', '#34486e', '#0e1a33', '#28395c', '#3b5078', '#8a9bb8', '#22324f', '#55688c', '#8fa1c0', '#4b5e85', '#3a4b6e', '#cfd8e6'],
  ['#33507f', '#b9b4c8', '#4f6b9c', '#13254a', '#34497a', '#506aa0', '#c4c6dc', '#2d4474', '#7486b5', '#c3cbe3', '#6a7cb0', '#4b5f95', '#f3efe9'],
  ['#050a18', '#1c2a4a', '#18294d', '#060d1f', '#101c36', '#16254a', '#2f4a78', '#0c1730', '#22375e', '#26385f', '#192a4c', '#132241', '#b8c6df'],
].map((colors) => colors.map((c): RGB => calm([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)])));

/**
 * Takes a color's light down so the page's near-white text keeps 4.5:1 over it: luminance L becomes L / (1 + 6.5L),
 * which holds the brightest surfaces here (L about 0.6) near 0.12 and barely touches the dark ones.
 */
function calm(rgb: RGB): RGB {
  const lin = rgb.map((v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  const k = 1 / (1 + 6.5 * (0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]));
  return lin.map((v) => Math.round(255 * (v * k <= 0.0031308 ? v * k * 12.92 : 1.055 * (v * k) ** (1 / 2.4) - 0.055))) as RGB;
}
/** How lit the windows are under each palette. */
const LIGHTS = [0, 0, 0.25, 1];
const MANGO = '#FFC233';
const RED = '#ff6a55';
const NEAR = 0.05; // km: anything closer to the camera is cut away
const STEPS = HILL_EDGES.length; // the hills' paper layers, 0.1 km each: about 1.5 times real, as relief models do
/** The district whose power and water go off: center and radius, km. */
const DARK = { x: 1.6, y: 1.2, r: 1.3 };
/** Rain clouds over the channel: x, y, height and radius, km. */
const CLOUDS: [number, number, number, number][] = [
  [7.6, 0.4, 0.9, 0.8], [8.9, 1.6, 1, 1], [9.7, -0.1, 0.85, 0.9], [7, 2.3, 1.1, 1], [10.3, 2.7, 1, 1.2], [6.3, -0.8, 0.95, 0.8], [8.2, 3.6, 1.2, 1.1],
];

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

/** The line moved `side(i)` km to its left (negative: right), point by point. */
function shifted(line: Pt[], side: (i: number) => number): Pt[] {
  return line.map(([x, y], i) => {
    const [px, py] = line[Math.max(0, i - 1)];
    const [nx, ny] = line[Math.min(line.length - 1, i + 1)];
    const len = Math.hypot(nx - px, ny - py);
    return [x - ((ny - py) / len) * side(i), y + ((nx - px) / len) * side(i)];
  });
}

/** A line's first `km` kilometres, to the nearest point. */
function upTo(line: Pt[], km: number): Pt[] {
  const out: Pt[] = [line[0]];
  for (let i = 1, walked = 0; i < line.length && walked < km; i++) {
    walked += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
    out.push(line[i]);
  }
  return out;
}

/** Where a polygon's edges cross the horizontal line at `y`. */
function crossings(poly: Pt[], y: number): number[] {
  const xs: number[] = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
  }
  return xs;
}

/** Inside the polygon whose crossings with this row are `xs`: an odd number of them lie to the right. */
const within = (xs: number[], x: number) => xs.reduce((n, v) => (x < v ? n + 1 : n), 0) % 2 === 1;

/** Closes a hill step's edge far inland, so it can be filled. */
const closure = (edge: Pt[]): Pt[] => [[edge[edge.length - 1][0], 60], [-70, 60], [-70, edge[0][1]]];

/**
 * Card blocks on a grid, on land below the hills, thinning out away from each city's center. Each row finds where it
 * crosses the coast and the hills once, so building the city stays a few milliseconds instead of a long stall.
 */
function city(foot: Pt[]): Block[] {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const out: Block[] = [];
  for (let y = -14; y < 16; y += 0.2) {
    const [land, mactan, hills] = [MAINLAND, MACTAN, foot].map((poly) => crossings(poly, y));
    for (let x = -16; x < 20; x += 0.2) {
      const near = Math.min(...AREAS.map(([ax, ay]) => Math.hypot(x - ax, y - ay)));
      if (near > 6 || rnd() > 0.95 - near * 0.13) continue;
      const island = within(mactan, x);
      if (!island && (!within(land, x) || within(hills, x))) continue;
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

/** A small shape straight onto the screen, no cutting: only for points known to be well in front of the camera. */
function quad(path: Path2D, c: Cam, pts: V3[]) {
  pts.forEach(([x, y, z], n) => {
    const p = view(c, x, y, z);
    const sx = c.cx + (p[0] / p[2]) * c.F;
    const sy = c.cy - (p[1] / p[2]) * c.F;
    if (n) path.lineTo(sx, sy);
    else path.moveTo(sx, sy);
  });
  path.closePath();
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
  // What only moves with the camera, drawn once per camera position and kept while the camera holds at a stop.
  const layer = document.createElement('canvas');
  const lctx = layer.getContext('2d', { alpha: false });
  let layerKey = '';
  /** Where the helpers below draw: the kept layer, or the screen. */
  let g = ctx!;
  const blocks = city([...HILL_EDGES[0], ...closure(HILL_EDGES[0])]);
  const lowerRiver = upTo(RIVER, 3);
  const decks = (Object.keys(BRIDGES) as (keyof typeof BRIDGES)[]).map((name) => {
    const line = BRIDGES[name];
    const pts = resample(line, 0.1);
    const end = line[line.length - 1];
    if (Math.hypot(end[0] - pts[pts.length - 1][0], end[1] - pts[pts.length - 1][1]) > 0.01) pts.push(end);
    const height = name === 'cclex' ? 0.06 : 0.045;
    // Ramps down to the land at both ends; `u` runs 0 to 1 along the bridge.
    return { name, pts, height, z: (u: number) => height * Math.min(1, u * 6, (1 - u) * 6) };
  });

  /**
   * Points along a line as small squares of light, `z(u)` high where `u` runs 0 to 1 along it. Never more than 3 px,
   * so lights near the camera stay points and don't brighten the text above them.
   */
  function lights(c: Cam, pts: Pt[], z: (u: number) => number, color: string, size: number, dpr: number) {
    g.fillStyle = color;
    pts.forEach(([x, y], i) => {
      const p = view(c, x, y, z(i / pts.length));
      if (p[2] < NEAR) return;
      const s = Math.min(3 * dpr, Math.max(1.3 * dpr, (size * c.F) / p[2]));
      g.fillRect(c.cx + (p[0] / p[2]) * c.F - s / 2, c.cy - (p[1] / p[2]) * c.F - s / 2, s, s);
    });
  }

  /** Cars as small lights: one lane crawling (red where it's jammed), the other moving. They move with the scroll. */
  function traffic(c: Cam, line: Pt[], scroll: number, dpr: number, jam: [number, number], z: (u: number) => number = () => 0.006) {
    // The moving lane first and sparse, then the crawling one close-packed on top, so its jam shows.
    for (const [side, gap, speed] of [[-0.009, 0.09, 0.0004], [0.009, 0.05, 0.00008]]) {
      const cars = resample(shifted(line, () => side), gap, (scroll * speed) % gap);
      cars.forEach((car, i) => {
        const u = i / cars.length;
        lights(c, [car], () => z(u) + 0.002, side > 0 && u > jam[0] && u < jam[1] ? RED : MANGO, 0.022, dpr);
      });
    }
  }

  /** Road works: one lane closed with a red card and a row of cones. */
  function works(c: Cam, road: Pt[], from: number, to: number, dpr: number) {
    const pts = resample(road, 0.02);
    const part = pts.slice(Math.floor(pts.length * from), Math.floor(pts.length * to));
    fill(g, outline(c, [...flat(shifted(part, () => 0.002), 0.004), ...flat(shifted(part, () => 0.017), 0.004).reverse()]), RED);
    g.fillStyle = MANGO;
    for (const [x, y] of resample(shifted(part, () => 0.001), 0.03)) {
      const p = view(c, x, y, 0.005);
      if (p[2] < NEAR) continue;
      const sx = c.cx + (p[0] / p[2]) * c.F;
      const sy = c.cy - (p[1] / p[2]) * c.F;
      const s = Math.max(2 * dpr, (0.02 * c.F) / p[2]);
      g.beginPath();
      g.moveTo(sx - s / 2, sy + s / 3);
      g.lineTo(sx, sy - s);
      g.lineTo(sx + s / 2, sy + s / 3);
      g.fill();
    }
  }

  /** The river over its banks near the sea: wider toward the mouth, and wider as you arrive. */
  function flood(c: Cam, rise: number) {
    const last = lowerRiver.length - 1;
    const width = (i: number) => (0.08 + 0.32 * (1 - i / last)) * (0.35 + 0.65 * rise);
    const water = [...flat(shifted(lowerRiver, width), 0.004), ...flat(shifted(lowerRiver, (i) => -width(i)), 0.004).reverse()];
    fill(g, outline(c, water), 'rgb(84 130 196 / 0.6)');
  }

  function clouds(c: Cam) {
    for (const [x, y, z, r] of CLOUDS) {
      const p = view(c, x, y, z);
      if (p[2] < 0.3) continue;
      const sx = c.cx + (p[0] / p[2]) * c.F;
      const sy = c.cy - (p[1] / p[2]) * c.F;
      const radius = (1.4 * r * c.F) / p[2];
      const puff = g.createRadialGradient(sx, sy, 0, sx, sy, radius);
      puff.addColorStop(0, 'rgb(118 132 160 / 0.55)');
      puff.addColorStop(0.55, 'rgb(90 104 134 / 0.32)');
      puff.addColorStop(1, 'rgb(90 104 134 / 0)');
      g.fillStyle = puff;
      g.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
    }
  }

  /** A bagyo's rain bands: three arms around an eye offshore, turning counterclockwise as you scroll. */
  function bands(c: Cam, scroll: number, dpr: number) {
    for (let arm = 0; arm < 3; arm++) {
      const pts: V3[] = [];
      for (let r = 1.5; r < 22; r += 0.5) {
        const a = arm * 2.094 - r * 0.2 + scroll * 0.0003;
        pts.push([14 + r * Math.cos(a), -6 + r * Math.sin(a), 1.4]);
      }
      stroke(g, c, pts, 'rgb(225 232 245 / 0.13)', 30 * dpr);
    }
  }

  /** Rain as slanted streaks across the screen; they fall as you scroll and hold still when you don't. */
  function rain(amount: number, scroll: number, w: number, h: number, dpr: number) {
    g.beginPath();
    for (let i = 0; i < Math.round(220 * amount); i++) {
      const x = (((i * 7919) % 1000) / 1000) * w;
      const y = ((((i * 104729) % 1000) / 1000) * h + scroll * 1.6 * dpr) % h;
      const len = (10 + (i % 7) * 3) * dpr;
      g.moveTo(x, y);
      g.lineTo(x - len * 0.18, y + len);
    }
    g.strokeStyle = 'rgb(205 220 245 / 0.32)';
    g.lineWidth = dpr;
    g.stroke();
  }

  function drawCity(c: Cam, colors: string[], w: number, h: number, dpr: number, lit: number, outage: boolean) {
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
    let windows = new Path2D();
    const flush = () => {
      g.fillStyle = colors[11];
      g.fill(wallsY);
      g.fillStyle = colors[10];
      g.fill(wallsX);
      g.fillStyle = colors[9];
      g.fill(roofs);
      if (lit > 0) {
        g.globalAlpha = lit * 0.75;
        g.fillStyle = MANGO;
        g.fill(windows);
        g.globalAlpha = 1;
      }
      roofs = new Path2D();
      wallsX = new Path2D();
      wallsY = new Path2D();
      windows = new Path2D();
    };
    // Far to near in small batches, three fills each: close enough to true order at these heights. Every block is at
    // least 0.3 km ahead, so its corners go straight to the screen; past 5 km its walls are too thin to show.
    seen.forEach(({ b, z }, i) => {
      const { x, y, sx, sy, h: top } = b;
      if (z < 5) {
        const fx = c.e[0] < x ? x : c.e[0] > x + sx ? x + sx : null;
        if (fx !== null) quad(wallsX, c, [[fx, y, 0], [fx, y + sy, 0], [fx, y + sy, top], [fx, y, top]]);
        const fy = c.e[1] < y ? y : c.e[1] > y + sy ? y + sy : null;
        if (fy !== null) quad(wallsY, c, [[x, fy, 0], [x + sx, fy, 0], [x + sx, fy, top], [x, fy, top]]);
      }
      quad(roofs, c, [[x, y, top], [x + sx, y, top], [x + sx, y + sy, top], [x, y + sy, top]]);
      // A lit window on every roof at night, except in the district that has lost power.
      if (lit > 0 && z < 12 && !(outage && Math.hypot(x - DARK.x, y - DARK.y) < DARK.r)) {
        const p = view(c, x + sx / 2, y + sy / 2, top);
        const s = Math.min(2.5 * dpr, Math.max(1, (0.035 * c.F) / p[2]));
        windows.rect(c.cx + (p[0] / p[2]) * c.F - s / 2, c.cy - (p[1] / p[2]) * c.F - s / 2, s, s);
      }
      if (i % 24 === 23) flush();
    });
    flush();
  }

  return {
    /** `s` runs from 0 (the first stop) to STOPS.length - 1 (the last); `scroll` moves the cars and the rain. */
    draw(s: number, scroll: number) {
      if (!ctx || !lctx) return;
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
      // On a tall screen, look at a nearer point: more city, less empty sky above it.
      const pull = Math.min(0.3, Math.max(0, (h / w - 1) * 0.3));
      const aim = path('aim').map((v, n) => (n < 2 ? v + (eye[n] - v) * pull : v)) as V3;
      const c = camera(eye, aim, w, h);
      const [from, to] = [PALETTES[at(i).light], PALETTES[at(i + 1).light]];
      const tones = from.map((rgb, n) => rgb.map((v, j) => v + (to[n][j] - v) * t) as RGB);
      const colors = tones.map((rgb) => mixRGB(rgb, rgb, 0));
      const between = (a: number, b: number) => a + (b - a) * t;
      // Each stop's happening fades in as the camera arrives and out as it leaves.
      const near = (k: number) => Math.max(0, 1 - Math.abs(s - k));
      const show = (k: number, paint: (a: number) => void) => {
        const a = near(k);
        if (a <= 0) return;
        g.globalAlpha = a;
        paint(a);
        g.globalAlpha = 1;
      };

      // While the camera holds at a stop, the land, hills, city and bridges stay as they were: draw them once.
      const key = `${s} ${w} ${h}`;
      if (key !== layerKey) {
        layerKey = key;
        if (layer.width !== w || layer.height !== h) {
          layer.width = w;
          layer.height = h;
        }
        g = lctx;

        // Sky down to the horizon, then the sea, lighter far off.
        const horizon = c.cy - c.F * (-c.f[2] / Math.hypot(c.f[0], c.f[1]));
        const sea = g.createLinearGradient(0, Math.max(0, horizon), 0, h);
        sea.addColorStop(0, colors[2]);
        sea.addColorStop(1, colors[3]);
        g.fillStyle = sea;
        g.fillRect(0, 0, w, h);
        if (horizon > 0) {
          const sky = g.createLinearGradient(0, 0, 0, horizon);
          sky.addColorStop(0, colors[0]);
          sky.addColorStop(1, colors[1]);
          g.fillStyle = sky;
          g.fillRect(0, 0, w, horizon);
        }

        fill(g, outline(c, flat(MAINLAND, 0)), colors[4]);
        fill(g, outline(c, flat(MACTAN, 0)), colors[4]);
        stroke(g, c, flat(MAINLAND.slice(0, -3), 0.002), 'rgb(214 226 245 / 0.4)', 1.2 * dpr);
        stroke(g, c, flat([...MACTAN, MACTAN[0]], 0.002), 'rgb(214 226 245 / 0.4)', 1.2 * dpr);

        // The hills: highest and farthest step first, each one's top and then the cut edge facing the sea.
        for (let k = STEPS; k >= 1; k--) {
          const edge = HILL_EDGES[k - 1];
          const z = 0.1 * k;
          const shade = (a: number, b: number) => mixRGB(tones[a], tones[b], (k - 1) / (STEPS - 1));
          const back = k < STEPS ? [...HILL_EDGES[k]].reverse() : closure(edge);
          fill(g, outline(c, [...flat(edge, z), ...flat(back, z)]), shade(5, 6));
          fill(g, outline(c, [...flat(edge, z - 0.1), ...flat(edge, z).reverse()]), shade(7, 8));
          stroke(g, c, flat(edge, z), 'rgb(255 255 255 / 0.4)', dpr);
        }

        stroke(g, c, flat(RIVER, 0.003), 'rgb(150 190 240 / 0.45)', 1.6 * dpr);
        for (const road of Object.values(ROADS)) stroke(g, c, flat(road, 0.003), 'rgb(220 232 250 / 0.4)', 1.6 * dpr);
        show(4, (a) => flood(c, a));
        show(1, () => works(c, ROADS.fortuna, 0.42, 0.62, dpr));
        drawCity(c, colors, w, h, dpr, between(LIGHTS[at(i).light], LIGHTS[at(i + 1).light]), near(5) > 0.3);

        for (const deck of decks) {
          const last = deck.pts.length - 1;
          const side = (sign: number) => shifted(deck.pts, () => 0.016 * sign).map(([x, y], n): V3 => [x, y, deck.z(n / last)]);
          fill(g, outline(c, [...side(1), ...side(-1).reverse()]), colors[12]);
          stroke(g, c, side(1), 'rgb(232 239 250 / 0.7)', dpr); // the card's cut edge catching the light
          if (deck.name === 'osmena') continue;
          for (const u of deck.name === 'cclex' ? [0.55, 0.63] : [0.42, 0.58]) {
            const [x, y] = deck.pts[Math.round(u * last)];
            stroke(g, c, [[x, y, deck.height], [x, y, deck.height + (deck.name === 'cclex' ? 0.15 : 0.11)]], colors[12], 2.5 * dpr);
          }
        }

        show(2, () => clouds(c));
        show(7, () => {
          for (const side of [0.014, -0.014]) lights(c, resample(shifted(ROADS.osmenaBlvd, () => side), 0.08), () => 0.008, 'rgb(255 210 122 / 0.7)', 0.014, dpr);
          const cclex = decks.find((deck) => deck.name === 'cclex');
          if (cclex) lights(c, resample(cclex.pts, 0.12), (u) => cclex.z(u) + 0.004, 'rgb(255 231 176 / 0.7)', 0.016, dpr);
        });

        const haze = g.createLinearGradient(0, 0, 0, h * 0.45);
        haze.addColorStop(0, colors[1].replace(')', ' / 0.45)'));
        haze.addColorStop(1, colors[1].replace(')', ' / 0)'));
        g.fillStyle = haze;
        g.fillRect(0, 0, w, h * 0.45);
      }

      // Then only what moves with the scroll: cars, the bagyo's bands and the rain.
      g = ctx;
      ctx.drawImage(layer, 0, 0);
      show(0, () => traffic(c, ROADS.bacalso, scroll, dpr, [0.08, 0.9]));
      show(1, () => traffic(c, ROADS.fortuna, scroll, dpr, [0.12, 0.42]));
      show(3, () => bands(c, scroll, dpr));
      show(6, () => {
        for (const deck of decks) if (deck.name !== 'cclex') traffic(c, deck.pts, scroll, dpr, [0.05, 0.95], deck.z);
      });
      show(7, () => traffic(c, ROADS.osmenaBlvd, scroll, dpr, [0, 0]));
      const rainfall = between(at(i).rain, at(i + 1).rain);
      if (rainfall > 0.02) rain(rainfall, scroll, w, h, dpr);
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
