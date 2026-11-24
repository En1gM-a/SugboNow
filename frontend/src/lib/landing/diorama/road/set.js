// The street itself: a slab of Cebu that runs off both ends of the page. The road, its sidewalks, the shops, the Capitol
// behind its plaza, the wires overhead, and the cut front edge with the storm drain inside it. Everything that bends in
// the wind is in `plants`; everything else is baked once.
import * as THREE from 'three';
import { seeded } from '../world.js';
import { bakeAlong, C, cast, nub, ramp, taper, TAU, tint, wedge } from './kit.js';

export const END = 48; // the slab runs from -END to END
export const CURB = 3, WALK = 4.6, STEP = 0.14; // the curbs, the slab's front edge, and the height of the sidewalk
const FRONT = -4.75; // the shops' fronts
const STOP_X = -4.4;
const DRAIN = { top: -0.42, bottom: -0.98 };

const WALLS = ['#ecdcb9', '#cfe2d8', '#f1cbb0', '#cbd8ec', '#eee5d2', '#e9c1b4', '#dad5ec', '#f3dfa2'];
const CLOTH = [C.red, C.blue, C.mango, C.teal];

/** One shop house. `lit` collects its windows, so they can come on at night. */
function shop(W, root, rnd, lit, { x, w, floors, kind, wall, accent, bare }) {
  const { box, cylinder, group } = W;
  const depth = 2.7, high = 1.42 + (floors - 1) * 1.16, f = depth / 2;
  const g = group(x, 0, FRONT - f, root);
  const window = (wx, y, ww, wh, always = false) => lit.push({ x: x + wx, y, z: FRONT + 0.1, w: ww, h: wh, always });
  box(w - 0.06, high, depth, wall, 0, high / 2 + 0.05, 0, g);
  box(w, 0.14, depth + 0.1, tint(wall, 0.8), 0, high + 0.08, 0, g);
  box(w - 0.02, 0.3, depth + 0.02, tint(wall, 0.72), 0, 0.2, 0, g);

  // Street level.
  if (kind === 'mart') {
    box(w - 0.4, 1.0, 0.06, '#33507a', 0, 0.72, f + 0.01, g);
    for (let i = 0; i <= 4; i++) box(0.05, 1.0, 0.08, C.white, -(w - 0.4) / 2 + (i * (w - 0.4)) / 4, 0.72, f + 0.02, g);
    [C.red, C.mango, C.blue].forEach((color, i) => box(w - 0.1, 0.12, 0.2, color, 0, 1.56 - i * 0.12, f + 0.08, g));
    window(0, 0.74, w - 0.5, 0.92, true);
  } else {
    const open = w - 0.7;
    box(open, 1.02, 0.06, INKY, 0, 0.62, f + 0.005, g);
    if (kind === 'shutter') {
      box(open - 0.1, 0.94, 0.06, '#a3adba', 0, 0.62, f + 0.03, g);
      for (let y = 0.22; y < 1.05; y += 0.13) box(open - 0.1, 0.03, 0.08, '#8793a3', 0, y, f + 0.03, g);
    } else {
      // Shelves of goods behind a counter.
      for (const [y, size] of [[0.5, 0.16], [0.82, 0.13]]) {
        box(open - 0.2, 0.03, 0.12, '#7a5c3f', 0, y - 0.02, f + 0.04, g);
        for (let sx = -open / 2 + 0.28; sx < open / 2 - 0.2; sx += 0.2) box(0.13, size * (0.7 + rnd() * 0.5), 0.1, [C.red, C.mango, C.sky, C.white, C.teal, '#f1906a'][Math.floor(rnd() * 6)], sx, y + 0.06, f + 0.05, g);
      }
      box(open - 0.1, 0.34, 0.14, accent, 0, 0.26, f + 0.05, g);
      box(open - 0.06, 0.04, 0.2, C.white, 0, 0.44, f + 0.06, g);
    }
    // Striped awning and a signboard.
    const strips = Math.max(6, Math.round((w - 0.3) / 0.3)), step = (w - 0.3) / strips, awning = group(0, 1.24, f + 0.02, g);
    awning.rotation.x = 0.34;
    for (let i = 0; i < strips; i++) {
      const color = i % 2 ? C.white : accent, sx = -(w - 0.3) / 2 + (i + 0.5) * step;
      box(step + 0.005, 0.045, 0.78, color, sx, 0, 0.39, awning);
      box(step + 0.005, 0.12, 0.03, color, sx, -0.05, 0.78, awning);
    }
    box(w - 0.6, 0.3, 0.07, tint(accent, 0.92), 0, 1.5, f + 0.05, g);
    for (let i = 0, n = 3 + Math.floor(rnd() * 3), sx = -(w - 1.2) / 2; i < n; i++) {
      const len = (0.5 + rnd() * 0.5) * ((w - 1.2) / n);
      box(len, 0.08, 0.03, C.white, sx + len / 2, 1.5, f + 0.09, g);
      sx += (w - 1.2) / n;
    }
  }

  // Upper floors.
  for (let k = 1; k < floors; k++) {
    const y = 1.42 + (k - 1) * 1.16 + 0.66, n = Math.max(2, Math.round(w / 1.15)), gap = w / n;
    box(w - 0.02, 0.05, depth + 0.04, tint(wall, 0.86), 0, y - 0.6, 0, g);
    for (let i = 0; i < n; i++) {
      const wx = -w / 2 + gap * (i + 0.5);
      box(0.66, 0.74, 0.05, C.white, wx, y, f + 0.01, g);
      box(0.56, 0.64, 0.06, '#32465f', wx, y, f + 0.02, g);
      box(0.03, 0.64, 0.07, C.white, wx, y, f + 0.025, g);
      box(0.76, 0.05, 0.16, tint(wall, 0.8), wx, y - 0.39, f + 0.05, g);
      window(wx, y, 0.56, 0.64);
      if (rnd() < 0.34) {
        box(0.4, 0.25, 0.26, '#d8dee6', wx, y - 0.56, f + 0.12, g);
        cylinder(0.085, 0.02, '#8a96a5', wx - 0.05, y - 0.56, f + 0.255, g, 10).rotation.x = Math.PI / 2;
      } else if (rnd() < 0.25) {
        for (let p = 0; p < 4; p++) nub(g, 0.07 + rnd() * 0.03, ['#4d8f52', C.red, C.mango, '#6aa85c'][p], wx - 0.24 + p * 0.16, y - 0.32, f + 0.1);
      }
    }
    if (kind === 'balcony' && k === 1) {
      box(w - 0.4, 0.06, 0.5, tint(wall, 0.78), 0, y - 0.56, f + 0.25, g);
      box(w - 0.4, 0.05, 0.04, accent, 0, y - 0.14, f + 0.48, g);
      for (let sx = -(w - 0.5) / 2; sx <= (w - 0.5) / 2; sx += 0.18) box(0.03, 0.4, 0.03, accent, sx, y - 0.34, f + 0.48, g);
    }
  }

  // Rooftops: tanks, washing lines, aerials.
  const top = high + 0.15, what = bare ? 1 : rnd();
  if (what < 0.42) {
    const tx = (rnd() - 0.5) * (w - 1.2);
    for (const sx of [-0.16, 0.16]) box(0.05, 0.22, 0.05, '#7f8a99', tx + sx, top + 0.1, f - 0.6, g);
    cylinder(0.27, 0.46, rnd() < 0.5 ? C.blue : '#2b3650', tx, top + 0.44, f - 0.6, g, 12);
    cylinder(0.2, 0.06, '#1b2436', tx, top + 0.7, f - 0.6, g, 12);
  } else if (what < 0.74) {
    for (const sx of [-w / 2 + 0.5, w / 2 - 0.5]) box(0.04, 0.5, 0.04, '#7f8a99', sx, top + 0.24, f - 0.5, g);
    box(w - 1, 0.012, 0.012, C.white, 0, top + 0.44, f - 0.5, g);
    for (let sx = -w / 2 + 0.75; sx < w / 2 - 0.6; sx += 0.3) if (rnd() < 0.8) box(0.2, 0.26 + rnd() * 0.1, 0.015, [C.white, C.red, C.sky, C.mango, '#f1906a', C.teal][Math.floor(rnd() * 6)], sx, top + 0.28, f - 0.5, g);
  }
  if (rnd() < 0.4) {
    const ax = (rnd() - 0.5) * (w - 0.8);
    box(0.025, 0.7, 0.025, '#8a96a5', ax, top + 0.34, f - 1.1, g);
    for (const y of [0.4, 0.54, 0.66]) box(0.34 - y * 0.2, 0.018, 0.018, '#8a96a5', ax, top + y, f - 1.1, g);
  }
}
const INKY = '#26324a';

/** An old house: stone below, wood and capiz shell windows above, under a rusted roof. */
function oldHouse(W, root, lit, { x, w }) {
  const { box, group } = W, depth = 2.7, f = depth / 2, g = group(x, 0, FRONT - f, root);
  box(w - 0.1, 1.4, depth, '#d9ccb2', 0, 0.75, 0, g);
  for (let sx = -w / 2 + 0.4; sx < w / 2; sx += 0.62) for (const y of [0.35, 0.75, 1.15]) box(0.5, 0.3, 0.02, '#cbbc9f', sx, y, f + 0.005, g);
  box(0.8, 1.0, 0.06, '#5b3f2b', 0, 0.62, f + 0.02, g);
  for (const sx of [-1, 1]) { box(0.5, 0.6, 0.06, '#4a3626', sx * (w / 2 - 0.6), 0.82, f + 0.02, g); for (let i = -2; i <= 2; i++) box(0.03, 0.6, 0.05, '#2a3448', sx * (w / 2 - 0.6) + i * 0.1, 0.82, f + 0.06, g); }
  box(w + 0.1, 1.2, depth + 0.35, '#8c5a3a', 0, 2.1, 0.05, g);
  box(w + 0.14, 0.08, depth + 0.4, '#6f4429', 0, 1.5, 0.05, g);
  const n = Math.max(3, Math.round(w / 0.85)), gap = (w - 0.1) / n;
  for (let i = 0; i < n; i++) {
    const wx = -(w - 0.1) / 2 + gap * (i + 0.5);
    box(gap - 0.12, 0.66, 0.05, '#f1ead8', wx, 2.2, f + 0.24, g);
    for (let k = -1; k <= 1; k++) { box(0.02, 0.66, 0.06, '#6f4429', wx + k * (gap / 4), 2.2, f + 0.245, g); box(gap - 0.12, 0.02, 0.06, '#6f4429', wx, 2.2 + k * 0.17, f + 0.245, g); }
    lit.push({ x: x + wx, y: 2.2, z: FRONT + 0.29, w: gap - 0.14, h: 0.62 });
  }
  wedge(g, w + 0.5, 0.9, depth + 0.9, '#a8503a', 0, 3.14, 0.05, { tx: 0.62, tz: 0.04 });
  for (let i = -3; i <= 3; i++) box(0.04, 0.03, 0.03, '#8f3f2e', i * 0.3, 3.6, 0.05, g);
}

/** The Provincial Capitol at the end of Osmeña Boulevard, as small as the street needs it. */
function capitol(W, root, lit, x) {
  const { box, cylinder, group } = W, g = group(x, 0, -9.1, root), wall = '#f1e9d8', shade = '#d9cdb4';
  box(9.4, 1.5, 1.6, wall, 0, 0.9, 0, g);
  box(9.6, 0.14, 1.75, shade, 0, 1.7, 0, g);
  for (const sx of [-1, 1]) { box(1.5, 1.7, 1.9, wall, sx * 4.1, 1.0, 0.1, g); box(1.64, 0.16, 2.05, shade, sx * 4.1, 1.9, 0.1, g); }
  box(2.9, 1.95, 2.0, wall, 0, 1.1, 0.2, g);
  for (let i = 0; i < 6; i++) cylinder(0.11, 1.35, '#fbf6ea', -1.15 + i * 0.46, 0.95, 1.36, g, 10);
  box(3.0, 0.2, 0.7, shade, 0, 1.72, 1.2, g);
  wedge(g, 3.0, 0.42, 0.6, wall, 0, 2.02, 1.2, { tx: 0.04 });
  for (let i = 0; i < 4; i++) box(3.1 + i * 0.3, 0.09, 0.3, '#e4dac6', 0, 0.26 - i * 0.08, 1.6 + i * 0.22, g);
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const wx = side * (1.85 + i * 0.5);
    box(0.28, 0.74, 0.05, '#5a6c86', wx, 0.96, 0.81, g);
    lit.push({ x: x + wx, y: 0.96, z: -9.1 + 0.85, w: 0.26, h: 0.7 });
  }
  box(1.9, 0.36, 1.7, wall, 0, 2.2, 0, g);
  cylinder(0.82, 0.62, wall, 0, 2.66, 0, g, 16);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; box(0.1, 0.5, 0.1, shade, Math.cos(a) * 0.82, 2.66, Math.sin(a) * 0.82, g); }
  cylinder(0.9, 0.09, shade, 0, 3.0, 0, g, 16);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.84, 18, 7, 0, TAU, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#e0d4ba' }));
  dome.position.set(0, 3.03, 0); dome.scale.y = 0.98;
  g.add(dome);
  cylinder(0.16, 0.26, wall, 0, 3.92, 0, g, 8);
  taper(g, 0.02, 0.18, 0.22, shade, 0, 4.14, 0, 8);
  box(0.02, 0.5, 0.02, '#8a96a5', 0, 4.4, 0, g);
}

const asphalt = () => {
  const rng = seeded(9), canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const c = canvas.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 16000; i++) { c.fillStyle = `rgba(20,26,40,${rng() * 0.16})`; c.fillRect(rng() * 512, rng() * 256, 1 + rng() * 2, 1 + rng() * 2); }
  // Darker where the wheels of each lane run, and a few old repairs and cracks.
  for (let lane = 0; lane < 4; lane++) for (const side of [-0.45, 0.45]) {
    const y = ((lane + 0.5 + side * 0.62) / 4) * 256, g = c.createLinearGradient(0, y - 12, 0, y + 12);
    g.addColorStop(0, 'rgba(20,26,40,0)'); g.addColorStop(0.5, 'rgba(20,26,40,.2)'); g.addColorStop(1, 'rgba(20,26,40,0)');
    c.fillStyle = g; c.fillRect(0, y - 12, 512, 24);
  }
  for (const [x, y, w, h] of [[60, 34, 46, 22], [300, 120, 70, 26], [420, 200, 38, 30], [180, 176, 30, 18]]) { c.fillStyle = 'rgba(18,24,38,.26)'; c.fillRect(x, y, w, h); }
  c.strokeStyle = 'rgba(16,22,34,.3)'; c.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) { let x = rng() * 512, y = rng() * 256; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 7; k++) { x += 8 + rng() * 12; y += (rng() - 0.5) * 16; c.lineTo(x, y); } c.stroke(); }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping; map.repeat.set(8, 1); map.anisotropy = 4;
  return map;
};

/** Shops from one end to the other, with the plaza's gap kept open. */
function row(rnd) {
  const list = [
    [-20.2, 4.2, 3, 'store'], [-16.4, 3.4, 2, 'old'], [-12.4, 4.6, 3, 'mart'], [-8.3, 3.6, 2, 'balcony'], [-4.5, 4.0, 3, 'shutter'],
    [-0.7, 3.6, 2, 'store'], [3.2, 4.2, 3, 'balcony'], [18.9, 4.4, 3, 'mart'], [22.8, 3.4, 2, 'old'], [26.6, 4.2, 3, 'store'],
  ];
  for (let x = -22.3; x > -END; ) { const w = 3.4 + rnd() * 1.4; list.push([x - w / 2, w, rnd() < 0.5 ? 2 : 3, ['store', 'shutter', 'balcony', 'old'][Math.floor(rnd() * 4)]]); x -= w; }
  for (let x = 28.7; x < END; ) { const w = 3.4 + rnd() * 1.4; list.push([x + w / 2, w, rnd() < 0.5 ? 2 : 3, ['store', 'shutter', 'balcony', 'mart'][Math.floor(rnd() * 4)]]); x += w; }
  return list;
}

const POLES = Array.from({ length: 11 }, (_, i) => -42.4 + i * 8.6);
const WIRE_Y = 3.9, POLE_Z = -3.85;
export const LAMPS = [
  ...Array.from({ length: 8 }, (_, i) => ({ x: -40.6 + i * 11.6, z: 4.15, head: 3.05, y: 3.0 })),
  ...POLES.filter((_, i) => i % 2 === 0).map((x) => ({ x, z: POLE_Z, head: -2.75, y: 3.2 })),
];

export async function createSet(scene, mats, breathe) {
  const rnd = seeded(7), lit = [];
  const solid = bakeAlong(12, (W, root) => {
    const { box, cylinder, group, line } = W;
    // Sidewalks, curbs and the ground behind.
    for (const z of [-3.8, 3.8]) {
      box(END * 2, 0.3, 1.6, '#c4c8cf', 0, STEP - 0.15, z);
      for (let x = -END; x < END; x += 1.2) box(0.03, 0.01, 1.6, '#a9afb9', x, STEP + 0.003, z);
      box(END * 2, 0.01, 0.03, '#a9afb9', 0, STEP + 0.003, z);
    }
    for (let x = -END; x < END; x += 1.2) for (const z of [-3.04, 3.04]) box(1.2, 0.22, 0.14, Math.round((x + END) / 1.2) % 2 ? '#2c3750' : '#f0b92e', x + 0.6, STEP - 0.105, z);
    box(END * 2, 0.2, 12, '#8f9a86', 0, -0.05, -10.4);
    // Lane paint, a zebra crossing, manholes, drains in the gutter.
    for (const z of [-0.07, 0.07]) box(END * 2, 0.012, 0.06, C.mango, 0, 0.012, z);
    for (let x = -END; x < END; x += 2.1) for (const z of [-1.49, 1.49]) box(1.0, 0.012, 0.07, '#e3e8ef', x, 0.012, z);
    for (const z of [-2.86, 2.86]) box(END * 2, 0.012, 0.05, '#cdd4de', 0, 0.011, z);
    for (let z = -2.55; z <= 2.6; z += 0.64) box(1.9, 0.014, 0.36, '#e9edf3', -9.2, 0.013, z);
    for (const [x, z] of [[-15, -0.8], [-3.2, 1.0], [6.4, -2.2], [13, 2.3], [24, -0.7], [-26, 2.1]]) { cylinder(0.3, 0.012, '#39424f', x, 0.012, z, undefined, 14); cylinder(0.2, 0.014, '#4a5564', x, 0.013, z, undefined, 14); }
    for (let x = -45; x < END; x += 6) for (let i = 0; i < 5; i++) box(0.08, 0.02, 0.3, '#2b3444', x - 0.24 + i * 0.12, 0.012, 2.82);

    for (const [x, w, floors, kind] of row(rnd)) {
      if (kind === 'old') oldHouse(W, root, lit, { x, w });
      else shop(W, root, rnd, lit, { x, w, floors, kind, wall: WALLS[Math.floor(rnd() * WALLS.length)], accent: CLOTH[Math.floor(rnd() * 4)], bare: x === 3.2 });
    }

    // The plaza: lawns, a path, a low fence, and the Capitol.
    box(11.4, 0.04, 6.2, '#7fa765', 11, 0.06, -7.4);
    box(2.2, 0.05, 6.2, '#d8cdb8', 11, 0.065, -7.4);
    for (const sx of [5.5, 16.5]) box(0.1, 0.4, 5, '#c9ccd2', sx, 0.28, -7.2);
    for (const [a, b] of [[5.5, 9.7], [12.3, 16.5]]) {
      box(b - a, 0.2, 0.14, '#dfe3e9', (a + b) / 2, 0.22, -4.72);
      for (let x = a; x <= b + 0.01; x += 0.3) box(0.04, 0.36, 0.04, '#3b4a66', x, 0.48, -4.72);
      box(b - a, 0.04, 0.05, '#3b4a66', (a + b) / 2, 0.66, -4.72);
    }
    for (let i = 0; i < 26; i++) nub(root, 0.1 + rnd() * 0.07, ['#4d8f52', '#5f9f55', C.red, C.mango][i % 4], (i % 2 ? 5.9 : 12.6) + rnd() * 3.5, 0.2, -5.0 - rnd() * 0.3);
    capitol(W, root, lit, 11);

    // Overhead: poles, crossarms, transformers and street lamps.
    POLES.forEach((x, i) => {
      taper(root, 0.07, 0.1, 4.6, '#8b8f97', x, 2.3, POLE_Z, 8);
      for (const y of [WIRE_Y, WIRE_Y - 0.36]) { box(0.07, 0.07, 0.9, '#6d737d', x, y, POLE_Z); for (const z of [-0.38, 0, 0.38]) cylinder(0.035, 0.1, C.white, x, y + 0.08, POLE_Z + z); }
      if (i % 2) { cylinder(0.17, 0.5, '#9aa5b5', x + 0.22, 3.0, POLE_Z, root, 10); cylinder(0.1, 0.08, '#7f8a99', x + 0.22, 3.28, POLE_Z, root, 8); }
      box(0.24, 0.3, 0.16, '#d7dde6', x, 1.2, POLE_Z + 0.14);
    });
    for (const lamp of LAMPS) {
      const way = Math.sign(lamp.head - lamp.z), near = lamp.z > 0;
      if (near) { taper(root, 0.04, 0.065, 3.1, '#3b4a66', lamp.x, 1.6, lamp.z, 8); cylinder(0.1, 0.2, '#2c3750', lamp.x, 0.24, lamp.z, root, 8); }
      box(0.05, 0.05, Math.abs(lamp.head - lamp.z), near ? '#3b4a66' : '#6d737d', lamp.x, lamp.y + 0.1, (lamp.head + lamp.z) / 2);
      box(0.18, 0.08, 0.46, near ? '#3b4a66' : '#6d737d', lamp.x, lamp.y + 0.08, lamp.head + way * 0.1);
      box(0.13, 0.03, 0.38, C.lamp, lamp.x, lamp.y + 0.03, lamp.head + way * 0.1);
    }

    // The jeepney stop on the near side, and the shed on the far one.
    cylinder(0.035, 1.9, '#3b4a66', STOP_X, 1.0, 4.0);
    box(0.66, 0.6, 0.03, C.white, STOP_X, 1.72, 4.0);
    box(0.58, 0.52, 0.04, C.blue, STOP_X, 1.72, 4.0);
    box(0.36, 0.13, 0.05, C.white, STOP_X - 0.03, 1.73, 4.0);
    box(0.1, 0.08, 0.05, C.white, STOP_X + 0.18, 1.705, 4.0);
    box(0.38, 0.03, 0.05, C.mango, STOP_X - 0.03, 1.83, 4.0);
    for (const wx of [-0.14, 0.13]) cylinder(0.05, 0.055, C.mango, STOP_X + wx, 1.64, 4.0, root, 10).rotation.x = Math.PI / 2;
    const shed = group(-13.6, STEP, -3.75);
    for (const x of [-1.1, 1.1]) for (const z of [-0.35, 0.3]) box(0.07, 1.25, 0.07, C.blue, x, 0.62, z, shed);
    box(2.5, 0.08, 1.0, C.mango, 0, 1.3, 0, shed).rotation.x = 0.08;
    box(2.5, 0.12, 0.05, C.red, 0, 1.28, 0.5, shed);
    box(1.8, 0.06, 0.26, '#9c7048', 0, 0.34, -0.22, shed);
    for (const x of [-0.7, 0.7]) box(0.06, 0.32, 0.2, '#3b4a66', x, 0.17, -0.22, shed);

    // A mango cart, crates, pots, bins, benches: the small stuff of the sidewalks.
    const cart = group(1.6, STEP, -3.7);
    box(1.1, 0.28, 0.6, C.blue, 0, 0.46, 0, cart);
    box(1.14, 0.06, 0.64, C.white, 0, 0.62, 0, cart);
    for (let i = 0; i < 16; i++) nub(cart, 0.085, i % 5 ? C.mango : '#f09a2a', -0.45 + (i % 6) * 0.18, 0.7 + (i > 11 ? 0.1 : 0), -0.2 + Math.floor(i / 6) * 0.18);
    for (const x of [-0.4, 0.4]) cylinder(0.18, 0.06, C.tyre, x, 0.19, 0.33, cart, 12).rotation.x = Math.PI / 2;
    cylinder(0.025, 1.2, C.steel, 0, 1.1, 0, cart);
    const shade = taper(cart, 0.03, 0.92, 0.34, C.red, 0, 1.72, 0, 8); shade.rotation.y = 0.4;
    taper(cart, 0.02, 0.5, 0.2, C.white, 0, 1.84, 0, 8).rotation.y = 0.4;
    for (const [x, z] of [[-18.5, -4.35], [-6.4, -4.3], [-2.7, -4.35], [5.2, -4.3], [17.4, -4.3], [21, -4.35]]) {
      taper(root, 0.17, 0.12, 0.26, '#b5563c', x, STEP + 0.13, z, 8);
      for (let i = 0; i < 4; i++) nub(root, 0.13, i % 2 ? '#5f9f55' : '#4d8f52', x + Math.cos(i * 1.6) * 0.1, STEP + 0.36 + (i % 2) * 0.08, z + Math.sin(i * 1.6) * 0.1);
    }
    for (const x of [-22, -5.6, 8.8, 20.4]) {
      box(1.5, 0.06, 0.3, '#a6774a', x, STEP + 0.36, 4.1);
      for (const sx of [-0.6, 0.6]) box(0.06, 0.36, 0.28, '#3b4a66', x + sx, STEP + 0.18, 4.1);
    }
    for (const x of [-13, 0.4, 12.4, 25]) {
      box(1.3, 0.28, 0.42, '#d7dbe2', x, STEP + 0.14, 4.18);
      for (let i = 0; i < 9; i++) nub(root, 0.1 + rnd() * 0.05, ['#4d8f52', '#5f9f55', '#6fae5f', C.red, C.mango][Math.floor(rnd() * 5)], x - 0.5 + i * 0.125, STEP + 0.36, 4.18 + (rnd() - 0.5) * 0.2);
    }
    for (const x of [-7.6, 6.6, 16]) { cylinder(0.09, 0.4, C.red, x, STEP + 0.2, 3.55, root, 10); nub(root, 0.1, C.red, x, STEP + 0.42, 3.55); cylinder(0.05, 0.26, C.mango, x, STEP + 0.26, 3.55, root, 8).rotation.z = Math.PI / 2; }

    // A billboard on a roof: the sun over the sea, the mark this page already wears.
    const board = group(3.2, 3.88, -5.4);
    for (const x of [-0.9, 0.9]) box(0.07, 0.4, 0.07, '#6d737d', x, 0.1, -0.1, board);
    box(2.5, 1.0, 0.1, '#14233f', 0, 0.72, 0, board);
    for (const [y, color] of [[0, C.white]]) cylinder(0.4, 0.03, color, 0, 0.72 + y, 0.06, board, 28).rotation.x = Math.PI / 2;
    const half = (color, start) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 20, 1, false, start, Math.PI), new THREE.MeshBasicMaterial({ color })); m.position.set(0, 0.72, 0.075); m.rotation.x = Math.PI / 2; board.add(m); };
    half(C.mango, Math.PI / 2); half('#2f7be0', -Math.PI / 2);
    box(2.6, 0.05, 0.14, C.mango, 0, 1.24, 0, board);

    // The cut front edge: paving, earth, the storm drain's channel with its inlets, a water main and a power line.
    const face = WALK;
    box(END * 2, 0.24, 0.12, '#d3d7de', 0, STEP - 0.13, face - 0.055);
    box(END * 2, 0.34, 0.6, '#465475', 0, -0.25, face - 0.31);
    box(END * 2, DRAIN.top - DRAIN.bottom + 0.1, 0.1, '#1a2540', 0, (DRAIN.top + DRAIN.bottom) / 2, face - 0.66);
    for (const y of [DRAIN.top, DRAIN.bottom]) box(END * 2, 0.07, 0.62, '#a3b0c8', 0, y, face - 0.3);
    box(END * 2, 2.2, 0.6, '#3a4867', 0, DRAIN.bottom - 1.1, face - 0.31);
    for (let x = -45; x < END; x += 6) {
      box(0.5, 0.56, 0.05, '#a3b0c8', x, -0.14, face - 0.012);
      box(0.34, 0.6, 0.06, '#1a2540', x, -0.14, face - 0.008);
      box(0.5, 0.02, 0.5, '#4a5670', x, STEP + 0.006, face - 0.3);
      for (let i = 0; i < 4; i++) box(0.05, 0.02, 0.42, '#1a2540', x - 0.15 + i * 0.1, STEP + 0.011, face - 0.3);
    }
    for (let x = -END; x < END; x += 3) box(0.12, DRAIN.top - DRAIN.bottom, 0.5, '#7f8da8', x + 1.5, (DRAIN.top + DRAIN.bottom) / 2, face - 0.4);
    for (let i = 0; i < 190; i++) {
      const y = rnd() < 0.3 ? -0.14 - rnd() * 0.22 : DRAIN.bottom - 0.08 - rnd() * 1.5, size = 0.06 + rnd() * 0.12;
      box(size * 1.5, size * 0.7, 0.04, rnd() < 0.5 ? '#5a6a8e' : '#2d3955', (rnd() - 0.5) * END * 2, y, face + 0.002);
    }
    box(END * 2, 0.18, 0.1, '#2f7be0', 0, -1.3, face - 0.02);
    box(END * 2, 0.05, 0.1, '#6aaaf5', 0, -1.25, face - 0.012);
    for (let x = -END; x < END; x += 4) box(0.2, 0.25, 0.14, '#5fa0f0', x, -1.3, face - 0.02);
  });
  for (const shape of solid) {
    const stretch = new THREE.Mesh(shape, mats.baked);
    stretch.castShadow = stretch.receiveShadow = true;
    scene.add(stretch);
  }

  await breathe();
  const map = asphalt();
  const roadMat = new THREE.MeshStandardMaterial({ color: '#5d6779', map, roughness: 1 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(END * 2, CURB * 2), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  scene.add(road);
  const dry = new THREE.Color('#5d6779'), wet = new THREE.Color('#3a4456');

  // Wires swing about the line between their poles.
  const wires = new THREE.Group();
  for (const shape of bakeAlong(12, ({ line }) => {
    POLES.slice(1).forEach((x1, i) => {
      const x0 = POLES[i];
      for (const [y, z, sag] of [[0.12, -0.38, 0.3], [0.12, 0, 0.42], [0.12, 0.38, 0.34], [-0.24, -0.38, 0.5], [-0.24, 0.38, 0.62], [-0.3, 0.1, 0.44]]) {
        const pts = [];
        for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push([x0 + (x1 - x0) * u, y - Math.sin(u * Math.PI) * sag, z]); }
        line(pts, '#1d2433', 0.012);
      }
    });
  })) wires.add(new THREE.Mesh(shape, mats.baked));
  wires.position.set(0, WIRE_Y, POLE_Z);
  scene.add(wires);

  // Lit windows: thin panes just in front of the glass, sized to nothing when they're off.
  const seedOf = seeded(21);
  lit.forEach((w) => { w.on = w.always || seedOf() < 0.5; w.warm = seedOf(); });
  const panes = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.94 }), lit.length);
  panes.frustumCulled = false;
  const glowTone = new THREE.Color(), at = new THREE.Matrix4();
  lit.forEach((w, i) => panes.setColorAt(i, glowTone.set(w.always ? '#c3d8f2' : w.warm < 0.7 ? '#ffcf7d' : '#cfe3ff')));
  scene.add(panes);

  await breathe();
  // Palms, rain trees and one fire tree: jointed, so the wind can bend them.
  const plants = cast(mats.people, (W, root) => {
    const { box, ball, group } = W, rng = seeded(5), list = [];
    const palm = (x, z, h) => {
      const base = group(x, 0.06, z), joints = [], fronds = [];
      let parent = base;
      for (let j = 0; j < 4; j++) {
        const joint = group(0, j ? h / 4 : 0, 0, parent);
        W.cylinder(0.095 - j * 0.013, h / 4 + 0.02, j % 2 ? '#8f7a5c' : '#9c8664', 0, h / 8, 0, joint, 7);
        joints.push(joint); parent = joint;
      }
      const crown = group(0, h / 4, 0, parent);
      for (let f = 0; f < 10; f++) {
        const pivot = group(0, 0, 0, crown); pivot.rotation.y = (f / 10) * TAU + (f % 2) * 0.2;
        const tip = group(0, 0, 0.56, pivot);
        box(0.15, 0.03, 0.6, f % 2 ? '#3f8a4e' : '#57a05a', 0, 0, 0.28, pivot);
        box(0.12, 0.025, 0.56, f % 2 ? '#57a05a' : '#6cb266', 0, 0, 0.26, tip);
        fronds.push({ pivot, tip, a: pivot.rotation.y, base: f % 2 ? 0.02 : 0.28 });
      }
      for (let n = 0; n < 4; n++) ball(0.075, n % 2 ? '#8a6a3c' : C.mango, Math.cos(n * 1.7) * 0.11, -0.08, Math.sin(n * 1.7) * 0.11, crown);
      list.push({ joints, fronds, seed: x });
    };
    const tree = (x, z, h, wide, greens) => {
      const base = group(x, 0.1, z), crown = group(0, h, 0, base);
      W.cylinder(0.12, h, '#7a5a40', 0, h / 2, 0, base, 7);
      for (let i = 0; i < 11; i++) {
        const a = i * 2.4, r = wide * Math.sqrt(i / 11);
        const blob = ball(0.44 + rng() * 0.2, greens[i % greens.length], Math.cos(a) * r, 0.1 + rng() * 0.34 - r * 0.12, Math.sin(a) * r * 0.8, crown);
        blob.scale.y *= 0.72;
      }
      list.push({ base, crown, seed: x });
    };
    const green = ['#4d8f52', '#5f9f55', '#3f7d4a', '#74ad60'], flame = ['#4d8f52', '#e2472b', '#f07a35', '#3f7d4a', '#d63a26'];
    palm(6.9, -6.0, 2.9); palm(8.5, -6.9, 2.5); palm(13.6, -6.8, 2.6); palm(15.3, -5.9, 3.1);
    tree(-10.6, -4.1, 1.75, 0.95, green); tree(17.1, -5.5, 1.6, 0.8, flame); tree(5.9, -8.2, 1.7, 0.8, green); tree(-24.4, -4.1, 1.7, 1.0, flame); tree(29.2, -4.1, 1.8, 1.0, green);
    return list;
  });
  scene.add(plants.group);

  return {
    plants,
    /** `lamp(x)` is how much power a window or lamp at x has, from 0 to 1. */
    update({ time, wind, wetness, night, lamp }) {
      roadMat.roughness = 1 - wetness * 0.66;
      roadMat.color.lerpColors(dry, wet, wetness);
      const gust = 0.5 + 0.5 * Math.sin(time * 1.9) * Math.sin(time * 0.83 + 1);
      wires.rotation.x = Math.sin(time * (1.3 + wind * 2.2)) * (0.025 + wind * 0.2) + wind * 0.12;
      for (const p of plants.parts) {
        const sway = Math.sin(time * (1.1 + wind * 1.6) + p.seed), lean = -(wind * (0.1 + 0.12 * gust) + sway * (0.012 + wind * 0.03));
        if (p.base) { p.base.rotation.z = lean * 0.55; p.crown.rotation.z = lean * 1.1; p.crown.rotation.x = sway * 0.02; continue; }
        p.joints.forEach((j, k) => { j.rotation.z = lean * (k ? 1 : 0.4); });
        for (const f of p.fronds) {
          // Fronds on the windward side (-x) fold back over the crown, and the rest stream downwind.
          const into = -Math.sin(f.a), flap = Math.sin(time * (2 + wind * 9) + f.a * 3) * (0.05 + wind * 0.12);
          f.pivot.rotation.x = f.base - wind * 0.9 * Math.max(0, into) * gust + flap;
          f.tip.rotation.x = 0.55 - wind * 0.3 + flap;
        }
      }
      lit.forEach((w, i) => {
        const on = w.on ? ramp(night + (w.always ? 0.25 : 0), 0.15, 0.5) * lamp(w.x) : 0;
        at.makeScale(on > 0.04 ? w.w : 0, on > 0.04 ? w.h * Math.min(1, on * 1.4) : 0, 1).setPosition(w.x, w.y, w.z + 0.03);
        panes.setMatrixAt(i, at);
      });
      panes.instanceMatrix.needsUpdate = true;
    },
  };
}
