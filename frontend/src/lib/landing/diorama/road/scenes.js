// The road's happenings. Each one is a shot: its light, its weather, its traffic, its people and where the camera stands.
// Everything is posed from the seconds since the shot began, so a shot looks the same every time, however it's reached.
import * as THREE from 'three';
import { seeded } from '../world.js';
import { props } from './fleet.js';
import { bake, C, cast, clamp, lerp, nub, ramp, TAU, walk } from './kit.js';
import { STEP } from './set.js';

const LOOP = 92; // each lane repeats this far along, well off both ends of the screen
const N1 = 2.24, N2 = 0.74, F1 = -0.74, F2 = -2.24; // lane centres: the near two head right (+x), the far two left
const JEEPS = ['jeepWhite', 'jeepRed', 'jeepBlue', 'jeepMango', 'jeepTeal'];
const CARS = ['carWhite', 'carMango', 'carRed', 'carSky', 'taxi', 'vanWhite', 'carSlate', 'vanBlue'];
const wrap = (u) => ((((u + LOOP / 2) % LOOP) + LOOP) % LOOP) - LOOP / 2;

/* ---------- How a lane moves: how far it has gone, and how fast it's going, `t` seconds in ---------- */
const flow = (speed) => (t) => ({ s: speed * t, v: speed });
/** Stop and go. `k` is a vehicle's place in the queue, so the ones in front start first and the wave runs back. */
const crawl = (advance, period) => (t, k) => {
  const a = TAU * (t / period + k);
  return { s: advance * (t / period - (Math.sin(a) - Math.sin(TAU * k)) / TAU), v: (advance / period) * (1 - Math.cos(a)), nod: Math.sin(a) };
};

/** Fills a lane end to end with vehicles, nose to tail, the same gap behind each one's real length. */
function lane(kinds, seed, { z, way, gap, jeeps, move, loose = 0, only, zAt }) {
  const rnd = seeded(seed), line = [];
  let used = 0;
  for (let i = 0; ; i++) {
    const from = only ?? (rnd() < jeeps ? JEEPS : CARS), name = from[Math.floor(rnd() * from.length)], long = kinds[name].hl * 2;
    if (used + long + gap > LOOP) break;
    line.push({ name, u0: used + long / 2 });
    used += long + gap;
  }
  const spare = (LOOP - used) / line.length;
  return line.map((v, i) => {
    const u0 = v.u0 + spare * i + (rnd() - 0.5) * loose, k = i / line.length;
    return {
      name: v.name,
      place(t) {
        const { s, v: speed, nod = 0 } = move(t, k), x = way * wrap(u0 + s), lift = speed > 0.05 ? Math.sin(t * 17 + i * 2) * 0.006 : Math.sin(t * 40 + i) * 0.0025;
        if (!zAt) return { x, z, yaw: way > 0 ? 0 : Math.PI, v: speed, roll: s, lift, pitch: nod * 0.011 };
        const here = zAt(x, i), ahead = zAt(x + 0.1 * way, i);
        return { x, z: here, yaw: (way > 0 ? 0 : Math.PI) - Math.atan2((ahead - here) * way, 0.1), v: speed, roll: s, lift, pitch: 0 };
      },
    };
  });
}

const person = (W, x, z, shirt, pants, i = 0, y = STEP, scale = 0.46) => {
  const p = W.person(x, z, shirt, pants, scale * (0.95 + (i % 4) * 0.03), C.skin[i % 4]);
  p.root.position.y = y;
  return p;
};
const SHIRTS = [C.white, C.red, C.mango, C.blue, '#7fae9a', C.sky, '#e8b7a0', C.teal];
const PANTS = ['#2f3b52', '#4b5a75', '#6b5a48', '#22304a'];
/** People going about their day on the sidewalks, the far one and the near one. */
function walkers(W, count, seed, { speed = 0.62, dress } = {}) {
  const rnd = seeded(seed);
  return Array.from({ length: count }, (_, i) => {
    const near = i % 3 === 0, way = i % 2 ? 1 : -1, z = near ? 3.5 + rnd() * 0.35 : -4.3 + rnd() * 0.5;
    const p = person(W, 0, z, SHIRTS[Math.floor(rnd() * 8)], PANTS[i % 4], i);
    p.root.rotation.y = way > 0 ? Math.PI / 2 : -Math.PI / 2;
    dress?.(p, i);
    return { p, x0: ((i + 0.5) / count - 0.5) * 46 + (rnd() - 0.5) * 2, way, speed: speed * (0.85 + rnd() * 0.3) };
  });
}
const stroll = (list, t) => list.forEach(({ p, x0, way, speed }) => {
  const x = x0 + way * speed * t;
  p.root.position.x = ((((x + 25) % 50) + 50) % 50) - 25;
  walk(p, (x / 0.74) * TAU * way);
});

/** Dev check: no two vehicles may touch, at any moment of any shot. Returns the ones that do. */
export function clashes(scenes, kinds) {
  const found = new Set();
  for (const s of scenes) for (let t = 0; t <= 20; t += 0.2) {
    const road = s.vehicles.map((v) => ({ ...v.place(t), name: v.name, ...kinds[v.name] })).filter((a) => Math.abs(a.x) < LOOP / 2 - 4).sort((a, b) => a.x - b.x);
    road.forEach((a, i) => {
      for (const b of road.slice(i + 1, i + 12)) if (b.x - a.x < a.hl + b.hl && Math.abs(b.z - a.z) < a.hw + b.hw) found.add(`${s.id}: ${a.name} and ${b.name} near x ${a.x.toFixed(1)}`);
    });
  }
  return [...found];
}

/* ---------- The seven shots ---------- */
export function createScenes({ scene, mats, kinds, glow }) {
  const stage = (build) => cast(mats.people, build); // the stage adds a shot's people when it cuts to it
  const solid = (build, parent) => { const m = new THREE.Mesh(bake(build), mats.baked); m.castShadow = m.receiveShadow = true; (parent ?? scene).add(m); return m; };
  const set = () => { const g = new THREE.Group(); g.visible = false; scene.add(g); return g; };

  /* 1. Clear: the road at sunrise. A jeepney pulls in, two people get on, and it goes. */
  const STOP = -2.4, PULL = 1.7, LEAVES = 5.3, CRUISE = 3.2;
  const pullIn = (t) => {
    const reach = (CRUISE * PULL) / 2;
    if (t < 0.6) return { x: STOP - reach - CRUISE * (0.6 - t), v: CRUISE, a: 0 };
    if (t < 0.6 + PULL) { const u = t - 0.6; return { x: STOP - reach + CRUISE * u - (CRUISE * u * u) / (2 * PULL), v: CRUISE * (1 - u / PULL), a: -1 }; }
    if (t < LEAVES) return { x: STOP, v: 0, a: 0 };
    if (t < LEAVES + PULL) { const u = t - LEAVES; return { x: STOP + (CRUISE * u * u) / (2 * PULL), v: (CRUISE * u) / PULL, a: 1 }; }
    return { x: STOP + reach + CRUISE * (t - LEAVES - PULL), v: CRUISE, a: 0 };
  };
  const clear = stage((W) => {
    const riders = [0, 1].map((i) => person(W, 0, 0, [C.mango, C.sky][i], PANTS[i], i + 1));
    const waiting = [[-3.2, 3.95, 0.2], [-1.3, 3.9, -0.3], [-0.75, 4.05, 0.1]].map(([x, z, turn], i) => { const p = person(W, x, z, SHIRTS[i + 3], PANTS[i], i); p.root.rotation.y = Math.PI + turn; return p; });
    const vendor = person(W, 1.6, -4.25, C.white, PANTS[0], 2);
    vendor.head.add(W.cylinder(0.26, 0.04, '#e8d6a0', 0, 0.12, 0, vendor.head, 12));
    return { riders, waiting, vendor, crowd: walkers(W, 9, 11) };
  });

  /* 2. Rush hour: both near lanes stop and go, and an enforcer at the curb waves them on. */
  const rush = stage((W) => {
    const enforcer = person(W, 2.7, 3.32, C.mango, '#22304a', 1, STEP, 0.5);
    enforcer.root.rotation.y = -Math.PI / 2;
    W.box(0.5, 0.06, 0.27, C.white, 0, 0.3, 0, enforcer.chest);
    W.ball(0.16, '#22304a', 0, 0.1, 0, enforcer.head).scale.y *= 0.5;
    W.box(0.26, 0.03, 0.16, '#22304a', 0, 0.07, 0.14, enforcer.head);
    W.box(0.05, 0.16, 0.05, C.white, 0, -0.08, 0, enforcer.rightHand);
    return { enforcer, crowd: walkers(W, 12, 29, { speed: 0.7 }) };
  });

  /* 3. Festival: the road is closed and the dancers have it. Drawn from Sinulog: two steps forward, one back. */
  const BEAT = 0.4;
  const FLAGS = [C.red, C.mango, C.blue, C.white, '#3aa05a'];
  const festa = set();
  const bunting = [];
  for (let i = 0; i < 9; i++) {
    const x0 = -26 + i * 6.4, hang = new THREE.Group();
    hang.position.set(x0, 3.5, -3.85);
    solid(({ box, line }) => {
      const pts = [];
      for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push([u * (i % 2 ? 2.6 : -2.6), -u * 0.75 - Math.sin(u * Math.PI) * 0.36, u * 7.9]); }
      line(pts, '#2c3750', 0.012);
      for (let k = 1; k < 16; k++) { const [x, y, z] = pts[k], f = box(0.2, 0.24, 0.02, FLAGS[k % 5], x, y - 0.15, z); f.rotation.set(0.2, i % 2 ? 0.4 : -0.4, Math.PI / 4); }
    }, hang);
    festa.add(hang);
    bunting.push(hang);
  }
  const carroza = solid(({ box, ball, cylinder }, root) => {
    box(2.5, 0.5, 1.9, C.red, 0, 0.42, 0);
    box(2.56, 0.1, 1.96, C.mango, 0, 0.68, 0);
    box(1.7, 0.3, 1.3, C.blue, 0, 0.86, 0);
    box(1.0, 0.26, 0.8, C.mango, 0, 1.12, 0);
    for (let i = 0; i < 34; i++) { const a = (i / 34) * TAU; nub(root, 0.13, [C.red, C.white, C.mango, '#f1906a'][i % 4], Math.cos(a) * 1.22, 0.76, Math.sin(a) * 0.94); }
    for (const x of [-0.42, 0.42]) for (const z of [-0.34, 0.34]) cylinder(0.035, 1.3, '#f2dd92', x, 1.85, z);
    box(1.1, 0.08, 0.94, C.red, 0, 2.52, 0);
    box(0.7, 0.16, 0.6, C.mango, 0, 2.62, 0);
    ball(0.09, C.mango, 0, 2.78, 0);
    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.62, 10), new THREE.MeshBasicMaterial({ color: C.red }));
    robe.position.set(0, 1.56, 0);
    root.add(robe);
    ball(0.1, '#d7a173', 0, 1.93, 0);
    cylinder(0.08, 0.1, C.mango, 0, 2.05, 0, undefined, 8);
    for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.8]) cylinder(0.2, 0.16, C.tyre, x, 0.2, z, undefined, 12).rotation.x = Math.PI / 2;
  }, festa);
  solid(({ box, group }) => {
    for (const x of [-13.4, 12.2]) for (let i = 0; i < 5; i++) {
      const g = group(x, 0, -2.4 + i * 1.2);
      for (const y of [0.3, 0.58]) for (let k = 0; k < 5; k++) box(0.06, 0.16, 0.2, k % 2 ? C.white : C.red, 0, y, -0.4 + k * 0.2, g);
      for (const z of [-0.36, 0.36]) box(0.3, 0.66, 0.06, '#4b5a75', 0, 0.33, z, g);
    }
  }, festa);
  const festival = stage((W, root) => {
    const skirt = new THREE.CylinderGeometry(0.2, 0.46, 0.66, 10), paint = (color) => new THREE.MeshBasicMaterial({ color });
    const dancers = [];
    for (let r = 0; r < 9; r++) for (let k = 0; k < 4; k++) {
      const i = r * 4 + k, look = r % 2, p = person(W, 0, -1.95 + k * 1.3, look ? C.blue : C.red, C.mango, i, 0, 0.5);
      p.root.rotation.y = Math.PI / 2;
      const hem = new THREE.Mesh(skirt, paint(look ? C.white : C.mango));
      hem.position.y = -0.22;
      p.body.add(hem);
      W.box(0.52, 0.1, 0.3, C.mango, 0, 0.5, 0, p.chest);
      const crown = W.group(0, 0.1, -0.04, p.head);
      for (let f = 0; f < 7; f++) {
        const a = (f / 6 - 0.5) * 2.3, plume = W.box(0.1, 0.5, 0.03, [C.red, C.mango, C.white, look ? C.sky : C.red][f % 4], Math.sin(a) * 0.26, 0.26 + Math.cos(a) * 0.2, 0, crown);
        plume.rotation.z = -a;
      }
      for (const hand of [p.leftHand, p.rightHand]) W.ball(0.11, look ? C.sky : C.mango, 0, -0.12, 0, hand);
      dancers.push({ p, x0: -11.2 + r * 1.42 + (k % 2) * 0.3, z: -1.95 + k * 1.3, side: k % 2 ? 1 : -1, off: (k % 2) * 0.1 });
    }
    const drummers = [-1.5, -0.5, 0.5, 1.5].map((z, i) => {
      const p = person(W, 0, z, C.white, C.red, i, 0, 0.5);
      p.root.rotation.y = Math.PI / 2;
      const drum = W.group(0, 1.0, 0.42, p.root);
      W.cylinder(0.27, 0.36, C.red, 0, 0, 0, drum, 14);
      W.cylinder(0.275, 0.04, C.white, 0, 0.18, 0, drum, 14);
      W.cylinder(0.28, 0.05, C.mango, 0, 0.1, 0, drum, 14);
      return { p, z };
    });
    const crowd = [];
    for (let i = 0; i < 30; i++) {
      const near = i % 3 === 0, x = -14 + i * 0.94, p = person(W, x, near ? 3.55 : -3.45 - (i % 2) * 0.4, SHIRTS[i % 8], PANTS[i % 4], i);
      p.root.rotation.y = near ? Math.PI : 0;
      crowd.push({ p, cheer: i % 2 === 0, seed: i * 1.9 });
    }
    return { dancers, drummers, crowd };
  });

  /* 4. Rain: umbrellas out, lights on, and the drain under the sidewalk filling. */
  const brolly = new THREE.CylinderGeometry(0.03, 0.72, 0.34, 8);
  const umbrella = (W, p, i) => {
    const top = new THREE.Mesh(brolly, new THREE.MeshBasicMaterial({ color: [C.mango, C.red, C.blue, C.white, C.teal, C.sky][i % 6] }));
    top.position.set(0.12, 2.32, 0.1);
    p.root.add(top);
    W.box(0.03, 1.1, 0.03, '#4b5a75', 0.12, 1.8, 0.1, p.root);
    p.held = true;
  };
  const rainy = stage((W) => {
    const crowd = walkers(W, 11, 43, { speed: 0.8, dress: (p, i) => umbrella(W, p, i) });
    const sheltering = [-8.9, -8.2, -0.9, -0.3, 0.4, 3.4, 4.1].map((x, i) => { const p = person(W, x, -4.42, SHIRTS[(i * 3) % 8], PANTS[i % 4], i); p.root.rotation.y = (i % 2 ? 0.3 : -0.2); return p; });
    return { crowd, sheltering };
  });
  const hold = (p) => { p.rightArm.rotation.x = -0.9; p.rightForearm.rotation.x = -1.5; };

  /* 5. Flood: the drain is full, the road goes under, the city's free bus wades through and a car gives up. */
  const flooded = stage((W) => {
    const waders = [[-7.5, 3.6, 1], [-4.2, 3.2, 1], [5.4, 3.5, -1], [8.8, 3.9, -1], [-1.6, -3.7, 1], [4.2, -3.5, -1]].map(([x, z, way], i) => {
      const p = person(W, x, z, SHIRTS[(i * 5 + 1) % 8], PANTS[i % 4], i, STEP);
      p.root.rotation.y = way > 0 ? Math.PI / 2 : -Math.PI / 2;
      W.box(0.46, 0.3, 0.34, [C.red, C.blue, C.mango][i % 3], 0, 0.36, 0.02, p.head);
      return { p, x0: x, way, speed: 0.24 };
    });
    const push = [0.62, 1.0].map((z, i) => { const p = person(W, 0, z, [C.white, C.mango][i], PANTS[i], i + 2, 0); p.root.rotation.y = Math.PI / 2; return p; });
    const stuck = [-6.1, -5.6, -5.1].map((x, i) => { const p = person(W, x, 4.1, SHIRTS[i + 2], PANTS[i], i, STEP + 0.39); p.root.rotation.y = Math.PI + (i - 1) * 0.3; return p; });
    return { waders, push, stuck };
  });
  const flotsam = set();
  const floats = [['#b98a52', 0.5], [C.blue, 0.4], ['#7c9a6a', 0.7], [C.red, 0.3], ['#8a6a46', 0.9], [C.white, 0.35]].map(([color, long], i) => {
    const m = solid(({ box, cylinder }, root) => { if (i % 3 === 1) cylinder(0.18, 0.4, color, 0, 0.06, 0, root, 10).rotation.z = Math.PI / 2; else box(long, 0.16, 0.2, color, 0, 0.05, 0); }, flotsam);
    return { m, x0: -20 + i * 7.3, z: [1.5, -1.5, 3.4, 0, -2.9, 1.5][i] };
  });

  /* 6. Bagyo: the signal is up. Wind, a tree down, and the power goes, street lamp by street lamp. */
  const wreck = set();
  solid(({ box, ball, cylinder, group }, root) => {
    const trunk = group(8.6, 0.32, -4.2, root);
    trunk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.8, 0.05, 0.6).normalize());
    cylinder(0.17, 3.6, '#7a5a40', 0, 1.7, 0, trunk, 7);
    for (let i = 0; i < 15; i++) ball(0.4 + (i % 3) * 0.12, ['#4d8f52', '#5f9f55', '#3f7d4a'][i % 3], Math.cos(i * 2.2) * 0.8, 3.6 + Math.sin(i * 1.4) * 0.8, Math.sin(i * 2.2) * 0.5, trunk);
    for (let i = 0; i < 6; i++) box(0.06, 1.1, 0.06, '#6b4d36', -0.3 + i * 0.12, 2.6 + i * 0.1, 0, trunk).rotation.z = 0.7 - i * 0.28;
    for (let i = 0; i < 7; i++) box(0.07, 0.5, 0.07, '#6b4d36', 8.6 + Math.cos(i) * 0.28, 0.3, -4.3 + Math.sin(i) * 0.24, root).rotation.set(Math.sin(i) * 0.9, 0, -Math.cos(i) * 0.9);
    // A pole leaning on its own wires.
    const pole = group(-2.6, 0, -3.3, root);
    pole.rotation.set(0.5, 0, 0.34);
    cylinder(0.08, 4.2, '#8b8f97', 0, 2.0, 0, pole, 8);
    for (const y of [3.4, 3.75]) box(0.9, 0.07, 0.07, '#6d737d', 0, y, 0, pole);
  }, wreck);
  const storm = stage(() => ({}));
  const GUST = (t) => 0.62 + 0.38 * Math.sin(t * 1.7) * Math.sin(t * 0.61 + 0.6);
  const outage = (x) => 3.0 + ((x + 24) / 48) * 1.3;

  /* 7. Road works at night: one lane closed, two lanes zipping into one, and a digger at the trench. */
  const CLOSED = [-2.6, 9.6], TAPER = [-8.4, -3.4], REOPEN = [10.6, 15];
  const zip = (x, i) => (i % 2 ? N2 : x < CLOSED[1] ? lerp(N1, N2, ramp(x, TAPER[0], TAPER[1])) : lerp(N2, N1, ramp(x, REOPEN[0], REOPEN[1])));
  const site = set();
  const cone = props.cone(), cones = [];
  for (let k = 0; k <= 6; k++) cones.push([lerp(TAPER[0] + 1.6, CLOSED[0], k / 6), lerp(2.95, 1.5, k / 6)]);
  for (let x = CLOSED[0] + 1; x < CLOSED[1] + 0.6; x += 1.15) cones.push([x, 1.5]);
  for (let k = 1; k <= 3; k++) cones.push([CLOSED[1] + 0.5 + k * 0.8, lerp(1.5, 2.9, k / 3)]);
  const coneMesh = new THREE.InstancedMesh(cone, mats.baked, cones.length), here = new THREE.Matrix4();
  coneMesh.castShadow = true;
  coneMesh.frustumCulled = false;
  cones.forEach(([x, z], i) => coneMesh.setMatrixAt(i, here.makeTranslation(x, 0, z)));
  site.add(coneMesh);
  const bar = props.barricade(), bars = [[CLOSED[0] + 0.5, 2.25], [CLOSED[1] - 0.1, 2.25]].map(([x, z]) => {
    const m = new THREE.Mesh(bar, mats.baked);
    m.position.set(x, 0, z); m.rotation.y = -Math.PI / 2; m.castShadow = true;
    site.add(m);
    return m;
  });
  solid(({ box, cylinder }, root) => {
    box(3.0, 0.02, 0.9, '#222a3a', 2.6, 0.012, 2.26);
    box(2.8, 0.02, 0.66, '#4a3c30', 2.6, 0.02, 2.26);
    for (let i = 0; i < 40; i++) { const a = i * 2.4, r = Math.sqrt(i / 40) * 0.72; nub(root, 0.14 + (i % 4) * 0.03, ['#5d4b3b', '#6d5946', '#4a3c30'][i % 3], 0.2 + Math.cos(a) * r, 0.1 + (1 - r / 0.72) * 0.34, 2.3 + Math.sin(a) * r * 0.62); }
    for (const z of [2.0, 2.5]) cylinder(0.1, 2.2, C.blue, 6.6, 0.1, z, root, 10).rotation.z = Math.PI / 2;
    // The light tower.
    cylinder(0.05, 3.4, '#4b5a75', 9.2, 1.8, 3.85, root, 8);
    box(0.5, 0.3, 0.5, '#4b5a75', 9.2, 0.28, 3.85);
    for (const x of [-0.2, 0.2]) for (const y of [3.3, 3.6]) box(0.34, 0.24, 0.1, '#dfe8f4', 9.2 + x, y, 3.82).rotation.x = 0.4;
  }, site);
  const digger = new THREE.Group(), boom = new THREE.Group(), dipper = new THREE.Group();
  digger.position.set(5.0, 0, 2.28);
  for (const [shape, parent] of [[props.digger(), digger], [props.boom(), boom], [props.dipper(), dipper]]) { const m = new THREE.Mesh(shape, mats.baked); m.castShadow = m.receiveShadow = true; parent.add(m); }
  boom.position.set(-0.46, 0.94, -0.12); dipper.position.set(-1.22, 0.16, 0);
  boom.add(dipper); digger.add(boom); site.add(digger);
  const works = stage((W) => {
    const crew = [[-1.2, 2.6, Math.PI / 2], [1.0, 2.9, Math.PI], [3.6, 1.74, 0.3], [-4.6, 3.3, -Math.PI / 2]].map(([x, z, turn], i) => {
      const p = person(W, x, z, '#ff7a1f', '#2f3b52', i, z > 3 ? STEP : 0, 0.47);
      p.root.rotation.y = turn;
      W.box(0.5, 0.07, 0.27, '#eaf06a', 0, 0.3, 0, p.chest);
      W.ball(0.165, C.mango, 0, 0.09, 0, p.head).scale.y *= 0.62;
      return p;
    });
    const drill = W.group(0, 0, 0);
    W.box(0.16, 0.5, 0.16, '#4b5a75', 0, 0.5, 0, drill);
    W.box(0.5, 0.06, 0.06, C.mango, 0, 0.78, 0, drill);
    W.cylinder(0.035, 0.4, C.steel, 0, 0.14, 0, drill);
    return { crew, drill };
  });

  const jam = crawl(2.5, 4.4), slow = crawl(3.4, 4.8);
  const bikes = [0, 1, 2, 3].map((i) => ({
    name: i % 2 ? 'habal' : 'moto',
    place(t) { const speed = 2.1 + i * 0.12, s = speed * t, u = wrap(-9 - i * 11 + s); return { x: u, z: 1.5 + Math.sin(u * 0.8 + i) * 0.015, yaw: 0, v: speed, roll: s, lift: 0, pitch: 0 }; },
  }));
  const sunrise = { sun: ['#ffd59a', 4.4], from: [-11, 7, 9], sky: '#cfe0ff', ground: '#8a8794', fill: 2.1, fog: ['#b4c8ea', 70, 170], horizon: ['#ffcf8c', 0.95, -13] };
  const scenes = [
    {
      id: 'clear', still: 3.6, shot: { x: -1.2, dist: 43, elev: 20, dx: 1.8, y: 0.35 },
      ...sunrise, night: 0, wet: 0, rain: 0, wind: 0.12, heads: 0, pin: null,
      vehicles: [
        { name: 'jeepWhite', place(t) { const { x, v, a } = pullIn(t); return { x, z: N1 + 0.18, yaw: 0, v, roll: x, lift: 0.004 * Math.sin(t * 34), pitch: a * (a < 0 ? 0.022 : 0.016) * Math.min(1, v / 1.2) }; } },
        ...lane(kinds, 3, { z: N2, way: 1, gap: 8.4, jeeps: 0.45, loose: 4, move: flow(3.5) }),
        ...lane(kinds, 8, { z: F1, way: -1, gap: 7.6, jeeps: 0.4, loose: 4, move: flow(3.6) }),
        ...lane(kinds, 14, { z: F2, way: -1, gap: 11, jeeps: 0.6, loose: 5, move: flow(2.9) }),
      ],
      cast: clear,
      pose(t) {
        const { riders, waiting, vendor, crowd } = clear.parts;
        stroll(crowd, t);
        riders.forEach((p, i) => {
          // From the curb to the open back of the jeepney, up the step, and in.
          const go = t - 2.5 - i * 0.75, u = clamp(go / 1.5), from = [STOP - 0.9 + i * 0.6, 3.75], mid = [STOP - 1.95, 3.0], door = [STOP - 1.78, N1 + 0.18];
          const a = clamp(u / 0.6), b = clamp((u - 0.6) / 0.4);
          const x = lerp(lerp(from[0], mid[0], a), door[0], b), z = lerp(lerp(from[1], mid[1], a), door[1], b);
          p.root.position.set(x, u < 0.45 ? STEP : lerp(STEP, u > 0.9 ? 0.3 : 0.02, clamp((u - 0.45) * 6)), z);
          p.root.rotation.y = go < 0 ? Math.PI - 0.5 : a < 1 ? Math.atan2(mid[0] - from[0], mid[1] - from[1]) : Math.atan2(door[0] - mid[0], door[1] - mid[1]);
          p.root.scale.setScalar(go > 1.62 ? 0.0001 : 0.46);
          if (go > 0 && u < 1) walk(p, go * 7.5); else walk(p, 0, 0);
        });
        waiting.forEach((p, i) => { p.head.rotation.y = Math.sin(t * 0.8 + i * 2) * 0.4; });
        vendor.rightArm.rotation.x = -1.1 + 0.5 * Math.max(0, Math.sin(t * 2.2)); vendor.rightForearm.rotation.x = -0.5;
      },
    },
    {
      id: 'rush', still: 2.4, shot: { x: 0.8, dist: 36.5, elev: 18, dx: 2, y: 0.45 },
      sun: ['#ffe2b8', 3.4], from: [-10, 8, 9], sky: '#d0dcf0', ground: '#858894', fill: 2.3, fog: ['#b0c0da', 60, 150], horizon: ['#ffe3b8', 0.6, -13],
      night: 0, wet: 0, rain: 0, wind: 0.1, heads: 0, pin: { x: 0.7, z: 1.5, y: 1.95 },
      vehicles: [
        ...lane(kinds, 19, { z: N1, way: 1, gap: 0.62, jeeps: 0.62, move: jam }),
        ...lane(kinds, 22, { z: N2, way: 1, gap: 0.66, jeeps: 0.5, move: (t, k) => jam(t + 1.1, k) }),
        ...bikes,
        ...lane(kinds, 5, { z: F1, way: -1, gap: 2.0, jeeps: 0.5, move: slow }),
        ...lane(kinds, 31, { z: F2, way: -1, gap: 2.6, jeeps: 0.7, move: (t, k) => slow(t + 0.8, k) }),
      ],
      cast: rush,
      pose(t) {
        const { enforcer: e, crowd } = rush.parts;
        stroll(crowd, t);
        const beat = Math.sin(t * 5.4);
        e.leftArm.rotation.set(-1.5, 0, -0.1); e.leftForearm.rotation.x = -0.2;
        e.rightArm.rotation.set(-1.9, 0, 0.5); e.rightForearm.rotation.x = -0.9 + 0.7 * beat;
        e.head.rotation.y = Math.sin(t * 0.9) * 0.7; e.chest.rotation.y = beat * 0.08;
      },
    },
    {
      id: 'festival', still: 2.2, shot: { x: 0.2, dist: 41, elev: 22, dx: 1.4, y: 0.4 },
      sun: ['#fff3da', 3.9], from: [6, 13, 9], sky: '#dcebff', ground: '#8a8d96', fill: 2.1, fog: ['#b7d4f5', 70, 170], horizon: ['#e2f2ff', 0.7, 5],
      night: 0, wet: 0, rain: 0, wind: 0.18, heads: 0, pin: { x: 5.4, z: 2.6, y: 3.2 },
      vehicles: [
        ...[['jeepBlue', -15.5, N1], ['carWhite', -15.0, N2], ['jeepRed', -18.4, N2], ['taxi', -18.6, N1], ['jeepMango', 14.3, F1], ['carSky', 13.8, F2], ['jeepTeal', 17.6, F2], ['vanBlue', 17.9, F1]].map(([name, x, z], i) => ({ name, place: (t) => ({ x, z, yaw: z > 0 ? 0 : Math.PI, v: 0, roll: 0, lift: 0.003 * Math.sin(t * 40 + i), pitch: 0 }) })),
      ],
      cast: festival, extra: festa,
      pose(t) {
        const { dancers, drummers, crowd } = festival.parts;
        // A count of three every 2.4 seconds: forward, forward, back.
        const gone = (at) => { const c = Math.max(0, at) / 0.8, count = Math.floor(c), k = c - count, three = Math.floor(count / 3); const e = k * k * (3 - 2 * k); return (three * 1 + [e, 1 + e, 2 - e][count % 3]) * 0.36; };
        for (const d of dancers) {
          const at = t + d.off, c = (at / 0.8) * Math.PI, sway = Math.sin((at / 1.6) * TAU + d.side);
          d.p.root.position.set(d.x0 + gone(at), Math.abs(Math.sin(c)) * 0.05, d.z);
          walk(d.p, c, 0.42);
          d.p.chest.rotation.set(0.06, sway * 0.22, sway * 0.1);
          d.p.leftArm.rotation.set(-2.75 + sway * 0.25, 0, 0.3 + 0.35 * sway); d.p.leftForearm.rotation.x = -0.25;
          d.p.rightArm.rotation.set(-2.75 - sway * 0.25, 0, -0.3 + 0.35 * sway); d.p.rightForearm.rotation.x = -0.25;
        }
        drummers.forEach(({ p, z }, i) => {
          p.root.position.set(2.5 + gone(t) - (i % 2) * 0.45, 0, z);
          walk(p, (t / 0.8) * Math.PI, 0.3);
          const hit = (o) => Math.max(0, Math.sin(((t + o) / BEAT) * Math.PI));
          p.leftArm.rotation.set(-0.75 - hit(0) * 0.6, 0, 0.1); p.rightArm.rotation.set(-0.75 - hit(BEAT) * 0.6, 0, -0.1);
          p.leftForearm.rotation.x = p.rightForearm.rotation.x = -0.6;
        });
        carroza.position.set(5.6 + gone(t), 0, 0);
        bunting.forEach((h, i) => { h.rotation.z = Math.sin(t * 1.7 + i) * 0.05; h.rotation.x = Math.sin(t * 1.2 + i * 2) * 0.02; });
        for (const { p, cheer, seed } of crowd) {
          const up = Math.sin(t * 5 + seed);
          p.body.position.y = 0.95 + (cheer ? Math.max(0, up) * 0.06 : 0);
          p.leftArm.rotation.x = cheer ? -2.5 + up * 0.3 : -0.2; p.rightArm.rotation.x = cheer ? -2.5 - up * 0.3 : -1.1 + up * 0.15;
          p.rightForearm.rotation.x = cheer ? -0.3 : -1.1;
        }
      },
    },
    {
      id: 'rain', still: 3.2, shot: { x: -2.4, dist: 37, elev: 16.5, dx: 1.8, y: 0.3 },
      sun: ['#d5e1f0', 1.5], from: [4, 12, 9], sky: '#bccbdf', ground: '#566074', fill: 2.0, fog: ['#6f8298', 34, 84], horizon: ['#9fb4ca', 0.6, 0],
      night: 0.3, wet: 1, rain: 0.75, wind: 0.25, heads: 0.75, pin: { x: -1.5, z: 1.5, y: 2.3 },
      vehicles: [
        ...lane(kinds, 41, { z: N1, way: 1, gap: 3.4, jeeps: 0.6, loose: 1.6, move: flow(1.9) }),
        ...lane(kinds, 47, { z: N2, way: 1, gap: 4.4, jeeps: 0.45, loose: 2, move: flow(2.2) }),
        ...lane(kinds, 52, { z: F1, way: -1, gap: 3.6, jeeps: 0.4, loose: 1.6, move: flow(2.3) }),
        ...lane(kinds, 58, { z: F2, way: -1, gap: 5.2, jeeps: 0.6, loose: 2, move: flow(1.8) }),
      ],
      drained: (t) => 0.16 + 0.8 * ramp(t, 0, 8.5),
      cast: rainy,
      pose(t) {
        const { crowd, sheltering } = rainy.parts;
        stroll(crowd, t);
        crowd.forEach(({ p }) => hold(p));
        sheltering.forEach((p, i) => { p.leftArm.rotation.set(-0.5, 0, -0.5); p.leftForearm.rotation.set(-1.6, 0, 0); p.rightArm.rotation.set(-0.5, 0, 0.5); p.rightForearm.rotation.set(-1.6, 0, 0); p.head.rotation.y = Math.sin(t * 0.7 + i * 1.7) * 0.6; });
      },
    },
    {
      id: 'flood', still: 4.4, shot: { x: 0.6, dist: 34.5, elev: 14, dx: 1.4, y: 0.5 },
      sun: ['#ffc48a', 2.6], from: [12, 6.4, 8], sky: '#b4bfd2', ground: '#665f58', fill: 1.9, fog: ['#8a8b92', 34, 92], horizon: ['#ffb067', 0.85, 13],
      night: 0.4, wet: 1, rain: 0.42, wind: 0.22, heads: 0.75, pin: { x: 2.8, z: 0.74, y: 1.7 },
      vehicles: [
        { name: 'bus', place: (t) => { const s = 0.95 * t; return { x: 9.6 - s, z: F1 - 0.1, yaw: Math.PI, v: 0.95, roll: s, lift: 0.01 * Math.sin(t * 2.2), pitch: 0.006 * Math.sin(t * 1.8) }; } },
        { name: 'jeepWhite', place: (t) => { const s = 0.85 * t; return { x: -9.2 + s, z: N1 + 0.05, yaw: 0, v: 0.85, roll: s, lift: 0.01 * Math.sin(t * 2.6), pitch: 0.01 * Math.sin(t * 2) }; } },
        { name: 'jeepMango', place: (t) => { const s = 0.7 * t; return { x: -16.5 + s, z: N2, yaw: 0, v: 0.7, roll: s, lift: 0.01 * Math.sin(t * 2.4 + 1), pitch: 0 }; } },
        { name: 'carSky', stalled: true, place: (t) => { const s = 0.16 * t; return { x: 2.2 + s, z: N2, yaw: 0, v: 0.16, roll: s, lift: 0.012 * Math.sin(t * 1.6), pitch: 0.012 * Math.sin(t * 1.3) }; } },
        { name: 'jeepTeal', place: (t) => { const s = 0.75 * t; return { x: 17.5 - s, z: F2, yaw: Math.PI, v: 0.75, roll: s, lift: 0.01 * Math.sin(t * 2.1), pitch: 0 }; } },
        { name: 'vanWhite', place: (t) => { const s = 0.75 * t; return { x: 21.5 - s, z: F1, yaw: Math.PI, v: 0.75, roll: s, lift: 0.01 * Math.sin(t * 2.5), pitch: 0 }; } },
      ],
      flood: (t) => lerp(-0.02, 0.37, ramp(t, -0.9, 3.8)), drained: () => 1,
      cast: flooded, extra: flotsam,
      pose(t, time, weather) {
        const { waders, push, stuck } = flooded.parts;
        for (const { p, x0, way, speed } of waders) {
          p.root.position.x = x0 + way * speed * t;
          walk(p, t * 3.2 + x0, 0.4);
          p.leftArm.rotation.set(-2.7, 0, 0.25); p.rightArm.rotation.set(-2.7, 0, -0.25); p.leftForearm.rotation.x = p.rightForearm.rotation.x = -0.5;
        }
        push.forEach((p, i) => {
          p.root.position.set(2.2 + 0.16 * t - 1.52, 0, 0.5 + i * 0.5);
          walk(p, t * 4 + i * 1.6, 0.5);
          p.chest.rotation.x = 0.62; p.body.position.y = 0.9;
          p.leftArm.rotation.set(-1.75, 0, 0); p.rightArm.rotation.set(-1.75, 0, 0); p.leftForearm.rotation.x = p.rightForearm.rotation.x = -0.12;
        });
        stuck.forEach((p, i) => { p.head.rotation.y = Math.sin(t + i) * 0.5; p.rightArm.rotation.x = i === 1 ? -2.6 + 0.4 * Math.sin(t * 6) : -0.2; });
        floats.forEach(({ m, x0, z }, i) => { const x = ((((x0 + t * 0.5 + 24) % 48) + 48) % 48) - 24; m.position.set(x, weather.waterAt(x, z, time), z + Math.sin(t * 0.6 + i) * 0.14); m.rotation.set(Math.sin(t + i) * 0.1, t * 0.16 + i, Math.sin(t * 1.3 + i) * 0.12); });
      },
    },
    {
      id: 'bagyo', still: 2.2, shot: { x: 1.2, dist: 37, elev: 15, dx: -1.6, y: 0.4, shake: 1 },
      sun: ['#a9bfe6', 0.9], from: [8, 11, 7], sky: '#62779f', ground: '#1c2438', fill: 1.35, fog: ['#1b2740', 32, 74], horizon: ['#6d8cc4', 0.4, 0],
      night: 1, wet: 1, rain: 1, wind: 1, heads: 1, pin: { x: 5.2, z: -1.6, y: 2.4 },
      vehicles: [{ name: 'rescue', siren: true, place: (t) => { const s = 1.5 * t; return { x: -11 + s, z: N2, yaw: 0, v: 1.5, roll: s, lift: 0.008 * Math.sin(t * 11), pitch: 0 }; } }],
      flood: () => 0.05, drained: () => 1,
      lamp: (x, t) => { const off = outage(x) - t; return off < 0 ? 0 : off < 0.7 ? (Math.sin(t * 19 + x) > -0.1 ? 0.8 : 0.25) : 1; },
      flash: (t) => Math.max(0, 1 - Math.abs(t - 1.7) / 0.24) * 0.7 + Math.max(0, 1 - Math.abs(t - 6.5) / 0.26) * 0.9,
      gust: GUST,
      cast: storm, extra: wreck,
      pose() {},
    },
    {
      id: 'works', still: 2.6, shot: { x: 1.6, dist: 36.5, elev: 18.5, dx: 1.5, y: 0.45 },
      sun: ['#9fb6e2', 0.75], from: [9, 12, 7], sky: '#5d75a8', ground: '#1d2740', fill: 1.2, fog: ['#16223c', 50, 120], horizon: ['#ffb866', 0.34, 4],
      night: 1, wet: 0, rain: 0, wind: 0.08, heads: 1, pin: { x: 2.6, z: 2.3, y: 2.6 }, worklight: true,
      vehicles: [
        ...lane(kinds, 67, { z: N2, way: 1, gap: 2.5, jeeps: 0.5, move: flow(1.6), zAt: zip }),
        ...lane(kinds, 71, { z: F1, way: -1, gap: 7, jeeps: 0.4, loose: 3, move: flow(3.0) }),
        ...lane(kinds, 77, { z: F2, way: -1, gap: 10, jeeps: 0.6, loose: 4, move: flow(2.7) }),
      ],
      cast: works, extra: site,
      pose(t) {
        const { crew, drill } = works.parts, dig = Math.sin(t * 1.15);
        boom.rotation.z = 0.12 + dig * 0.2; dipper.rotation.z = -0.35 + Math.cos(t * 1.15) * 0.42;
        digger.position.y = 0.006 * Math.sin(t * 42);
        const [guide, boss, driller, flag] = crew, shake = Math.sin(t * 46) * 0.02;
        guide.rightArm.rotation.set(-1.3 + Math.sin(t * 3) * 0.5, 0, 0.5); guide.leftArm.rotation.x = -0.1;
        boss.rightArm.rotation.x = -0.4; boss.rightForearm.rotation.x = -1.2; boss.head.rotation.y = Math.sin(t * 0.7) * 0.5;
        driller.leftArm.rotation.set(-0.85, 0, -0.12); driller.rightArm.rotation.set(-0.85, 0, 0.12); driller.leftForearm.rotation.x = driller.rightForearm.rotation.x = -0.7; driller.chest.rotation.x = 0.18;
        const d = driller.root.position, turn = driller.root.rotation.y;
        drill.position.set(d.x + Math.sin(turn) * 0.34, shake * 0.8, d.z + Math.cos(turn) * 0.34); drill.scale.setScalar(0.8);
        flag.rightArm.rotation.set(-1.5 + Math.sin(t * 4) * 0.6, 0, 0.35); flag.rightForearm.rotation.x = -0.3;
      },
      lights(t) {
        for (const m of bars) glow.spot(m.position.x, 0.78, m.position.z, 0.9, '#ffab2e', 0.35 + 0.65 * Math.max(0, Math.sin(t * 5 + m.position.x)));
        cones.forEach(([x, z], i) => { if (i % 3 === 0) glow.spot(x, 0.42, z, 0.55, '#ff9a3c', 0.25 + 0.75 * Math.max(0, Math.sin(t * 6 - i * 0.55))); });
        for (const x of [-0.2, 0.2]) for (const y of [3.3, 3.6]) glow.spot(9.2 + x, y, 3.9, 1.7, '#eef6ff', 0.9);
        glow.pool(4.2, 0.05, 2.1, 12, 4.4, '#cfe2ff', 0.55);
        const { crew } = works.parts, p = crew[3].root.position;
        glow.spot(p.x - 0.36, 0.62 + 0.18 * Math.sin(t * 4), p.z + 0.05, 0.5, '#ff4a3a', 1);
      },
    },
  ];
  return scenes;
}
