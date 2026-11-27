// The road on the page: one canvas, one long lens, and seven shots that dissolve into each other. It draws only while
// it's on screen and playing. Dragging looks along the road, and a tap on a vehicle makes it hop and flash its lights.
import * as THREE from 'three';
import { createFleet } from './fleet.js';
import { bake, C, clamp, lerp, ramp, taper, TAU } from './kit.js';
import { clashes, createScenes } from './scenes.js';
import { createSet, END, LAMPS } from './set.js';
import { createBeams, createGlow, createHorizon, createWeather, lampLight } from './weather.js';

const LEN = 8; // seconds each happening plays by itself
const PICKED = 20; // and after you picked it
const FOV = 14.5, REACH = 8; // how far a drag can look either way
const RAD = Math.PI / 180;

// Building the street takes a few tenths of a second, so it's done in steps with a breath between them.
const breathe = () => new Promise((done) => { setTimeout(done); });

export async function mountRoad(el, { lite = false, onScene, onProgress } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); } catch { return null; }
  const canvas = renderer.domElement, ghost = document.createElement('canvas'), ghostPen = ghost.getContext('2d');
  canvas.className = 'lp-rd-canvas';
  ghost.className = 'lp-rd-ghost';
  el.replaceChildren(canvas, ghost);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.matrixWorldAutoUpdate = false;
  scene.fog = new THREE.Fog('#000000', 50, 120);
  const camera = new THREE.PerspectiveCamera(FOV, 2, 10, 140);
  const hemi = new THREE.HemisphereLight(), sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 14, bottom: -14, near: 1, far: 70 });
  // The street lamps nearest the shot really light what passes under them; the rest only glow.
  const bulbs = [0, 1, 2, 3].map((i) => new THREE.PointLight(i === 3 ? '#dce9ff' : '#ffc47a', 0, i === 3 ? 13 : 8.5, 1.6));
  scene.add(hemi, sun, sun.target, ...bulbs);

  const mats = { baked: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), people: new THREE.MeshLambertMaterial({ flatShading: true }) };
  await breathe();
  const street = await createSet(scene, mats, breathe);
  await breathe();
  const fleet = createFleet(scene, mats.baked);
  await breathe();
  const weather = createWeather(scene);
  const glow = createGlow(scene, camera), beams = createBeams(scene), horizon = createHorizon(scene);
  await breathe();
  const scenes = createScenes({ scene, mats, kinds: fleet.kinds, glow });
  if (import.meta.env?.DEV) for (const clash of clashes(scenes, fleet.kinds)) console.error(`road: ${clash}`);

  // SugboNow's pin: it drops on the spot where the happening is.
  const pinMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: '#8a5a00', emissiveIntensity: 0.55 });
  const pin = new THREE.Mesh(bake(({ ball, cylinder }, root) => {
    ball(0.42, C.mango, 0, 0.98, 0);
    taper(root, 0.4, 0.02, 0.86, C.mango, 0, 0.43, 0, 12);
    cylinder(0.2, 0.06, C.white, 0, 1.0, 0.39, root, 18).rotation.x = Math.PI / 2;
  }), pinMat);
  pin.castShadow = true;
  // Its ink edge, like the drawings on the rest of the page: the same pin a size up, seen from inside.
  const edge = new THREE.Mesh(bake(({ ball }, root) => {
    ball(0.475, C.ink, 0, 0.98, 0);
    taper(root, 0.455, 0.06, 0.96, C.ink, 0, 0.42, 0, 12);
  }), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }));
  pin.add(edge);
  const ping = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: C.mango, transparent: true, depthWrite: false, fog: false }));
  ping.renderOrder = 3;
  scene.add(pin, ping);

  let index = -1, tau = 0, limit = LEN, playing = false, visible = false, looping = false, fresh = true, gone = false;
  let last = 0, quality = 1, slowFrames = 0, reveal = 1, lean = 0, leanTo = 0, pan = 0, panTo = 0;
  let drag = null, hover = null, probe = null;
  let spots = []; // where each vehicle stood in the last frame, for taps
  const honks = new Map(), target = new THREE.Vector3(), ray = new THREE.Raycaster(), box = new THREE.Box3(), ndc = new THREE.Vector2();

  function light(s) {
    hemi.color.set(s.sky); hemi.groundColor.set(s.ground); hemi.intensity = s.fill;
    sun.color.set(s.sun[0]); sun.intensity = s.sun[1];
    scene.fog.color.set(s.fog[0]); scene.fog.near = s.fog[1]; scene.fog.far = s.fog[2];
    const near = LAMPS.filter((l) => l.z > 0).sort((a, b) => Math.abs(a.x - s.shot.x) - Math.abs(b.x - s.shot.x));
    for (let i = 0; i < 3; i++) bulbs[i].position.set(near[i].x, near[i].y - 0.25, near[i].head);
    bulbs[3].position.set(5.6, 3.1, 3.4);
    horizon(...s.horizon);
  }

  function enter(next, at, picked) {
    if (index >= 0) { const old = scenes[index]; scene.remove(old.cast.group); if (old.extra) old.extra.visible = false; }
    index = next;
    tau = at;
    limit = picked ? PICKED : LEN;
    panTo = pan = 0;
    honks.clear();
    const s = scenes[index];
    scene.add(s.cast.group);
    if (s.extra) s.extra.visible = true;
    light(s);
    onScene?.(index);
  }

  /** Cuts to another shot: the last frame stays on top and dissolves while the new one starts beneath it. */
  function cut(next, picked) {
    draw(0);
    ghost.width = canvas.width;
    ghost.height = canvas.height;
    ghostPen.drawImage(canvas, 0, 0);
    ghost.getAnimations().forEach((a) => a.cancel());
    ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1100, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
    enter(next, 0, picked);
    draw(0);
  }

  function traffic(s, t, flood) {
    const half = Math.tan((FOV * RAD) / 2) * camera.aspect * s.shot.dist * 1.16 + 4;
    fleet.begin();
    beams.begin(s.heads * 0.85);
    spots = [];
    for (const v of s.vehicles) {
      const at = v.place(t);
      if (Math.abs(at.x - target.x) > half || Math.abs(at.x) > END - 3) continue;
      const kind = fleet.kinds[v.name], since = honks.has(v) ? (t - honks.get(v)) / 0.46 : 1, honk = since >= 0 && since < 1;
      const hop = honk ? Math.sin(since * Math.PI) * 0.3 : 0;
      fleet.put(v.name, at.x, at.lift + hop, at.z, at.yaw, at.pitch + (honk ? Math.sin(since * TAU) * 0.05 : 0), at.roll);
      spots.push({ v, kind, x: at.x, z: at.z });
      const cos = Math.cos(at.yaw), sin = Math.sin(at.yaw);
      const world = ([lx, ly, lz], side) => [at.x + lx * cos + lz * side * sin, ly + hop, at.z - lx * sin + lz * side * cos];
      const heads = honk ? Math.max(s.heads, 0.9) : v.stalled ? 0 : s.heads, braking = at.v < 0.5 || at.pitch < -0.004, red = braking ? 0.5 + 0.4 * s.heads : 0.34 * s.heads;
      for (const side of kind.head[2] ? [-1, 1] : [1]) {
        const [hx, hy, hz] = world(kind.head, side), [tx, ty, tz] = world(kind.tail, side);
        glow.spot(hx, hy, hz, 0.8, '#fff0c8', heads * 0.85);
        glow.spot(tx, ty, tz, braking ? 0.75 : 0.5, '#ff3b30', red);
        if (s.wet && flood < 0.1) {
          glow.pool(hx, 0.03, hz + 1.0, 0.3, 2.1, '#fff0c8', heads * s.wet * 0.34);
          glow.pool(tx, 0.03, tz + 0.9, 0.3, 1.8, '#ff3b30', red * s.wet * 0.5);
        }
        if (v.stalled && Math.sin(t * 7) > 0) { glow.spot(hx, hy, hz, 0.9, '#ffab2e', 0.9); glow.spot(tx, ty, tz, 0.9, '#ffab2e', 0.9); }
      }
      if (heads > 0.05) { const [hx, , hz] = world([kind.head[0], 0, 0], 1); beams.put(hx, flood > 0.02 ? flood + 0.05 : 0.04, hz, at.yaw); }
      if (v.siren) {
        const beat = Math.floor(t * 4) % 2, [sx, sy, sz] = world([0.66, 1.42, 0], 1);
        glow.spot(sx, sy, sz + 0.1, 1.7, beat ? '#ff3b30' : '#4f9bff', 0.95);
        glow.pool(at.x + 0.3, Math.max(flood, 0) + 0.05, at.z + 0.7, 4.4, 2.8, beat ? '#ff3b30' : '#4f9bff', 0.3);
      }
      if (flood > 0.1) { const [nx, , nz] = world([kind.hl, 0, 0], 1); weather.wake(nx, nz, at.yaw, 0.5 + kind.hl * 0.34, at.v); }
    }
    fleet.end();
    beams.end();
  }

  function draw(dt) {
    const s = scenes[index], t = tau, lamp = (x) => (s.lamp ? s.lamp(x, t) : 1);
    const wind = s.wind * (s.gust ? s.gust(t) : 1), flood = s.flood ? s.flood(t) : -0.05;
    // The camera: a long lens on rails. It cranes up as the road scrolls in, drifts through the shot, and leans to the pointer.
    const ease = (k) => 1 - Math.exp(-dt * k);
    if (dt) {
      const r = el.getBoundingClientRect(), seen = clamp((window.innerHeight - r.top) / (r.height * 1.02));
      reveal = lerp(reveal, ramp(seen, 0.15, 1), ease(5));
      lean = lerp(lean, leanTo, ease(3.2));
      pan = lerp(pan, panTo, ease(drag ? 18 : 5));
    }
    const { shot } = s, along = Math.min(t / LEN, 1.8) - 0.5, shake = shot.shake ? shot.shake * wind : 0;
    const elev = (shot.elev - (1 - reveal) * 7) * RAD, yaw = lean * 0.035, dist = shot.dist * (1 + (1 - reveal) * 0.1);
    target.set(shot.x + (shot.dx ?? 0) * along + pan + lean * 0.35, 1.35 + (shot.y ?? 0), -0.5);
    camera.position.set(target.x + Math.sin(yaw) * Math.cos(elev) * dist, target.y + Math.sin(elev) * dist, target.z + Math.cos(yaw) * Math.cos(elev) * dist);
    camera.position.x += shake * (Math.sin(t * 13) + Math.sin(t * 7.3)) * 0.05;
    camera.position.y += shake * Math.sin(t * 11.2) * 0.05;
    camera.lookAt(target);

    hemi.intensity = s.fill + (s.flash ? s.flash(t) * 1.1 : 0);
    weather.begin();
    glow.begin();
    street.update({ time: t, wind, wetness: s.wet, night: s.night, lamp });
    weather.update({ time: t, rainfall: s.rain, wind, flood, drained: s.drained ? s.drained(t) : 0.14 });
    s.pose(t, t, weather);
    traffic(s, t, flood);
    weather.flush();
    lampLight(glow, s.night, s.wet, lamp);
    s.lights?.(t);
    glow.end();
    for (let i = 0; i < 3; i++) bulbs[i].intensity = s.night > 0.6 ? 22 * lamp(bulbs[i].position.x) : 0;
    bulbs[3].intensity = s.worklight ? 17 : 0;

    // The pin falls, lands with one bounce, and pings.
    pin.visible = ping.visible = Boolean(s.pin);
    if (s.pin) {
      const u = clamp((t - 0.9) / 0.55), v = clamp((t - 1.45) / 0.4), fall = (1 - u * u) * 5, bounce = Math.sin(v * Math.PI) * 0.34;
      pin.position.set(s.pin.x, s.pin.y + fall + bounce + (v >= 1 ? Math.sin((t - 1.85) * 2.4) * 0.06 : 0), s.pin.z);
      pin.scale.setScalar(ramp(t, 0.75, 1.05) * 0.92);
      const p = t < 1.5 ? 0 : ((t - 1.5) % 1.8) / 1.8;
      ping.position.set(s.pin.x, Math.max(flood, 0) + 0.09, s.pin.z);
      ping.scale.setScalar(Math.max(0.001, p * 1.9));
      ping.material.opacity = t < 1.5 ? 0 : (1 - p) * 0.85;
    }

    sun.target.position.set(target.x, 0, 0);
    sun.position.set(target.x + s.from[0] * 2.4, s.from[1] * 2.4, s.from[2] * 2.4);
    scene.updateMatrixWorld();
    street.plants.sync();
    s.cast.sync();
    renderer.render(scene, camera);
    onProgress?.(clamp(tau / limit));
  }

  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    if (lite && dt < 1 / 31) return;
    last = now;
    // Too slow for this device: draw fewer pixels, at most twice.
    slowFrames = dt > 0.042 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
    if (slowFrames > 50 && quality > 0.6) { quality *= 0.75; slowFrames = 0; resize(); }
    tau += dt;
    if (tau >= limit && !drag) cut((index + 1) % scenes.length, false);
    else draw(dt);
    if (probe) { const at = pick(probe); probe = null; if (at !== hover) { hover = at; canvas.toggleAttribute('data-hot', Boolean(at)); } }
  };
  function sync() {
    const next = playing && visible && !gone;
    if (next === looping) return;
    looping = next;
    // The first time it's seen, the first happening plays from its start.
    if (next && fresh) { fresh = false; tau = 0; }
    last = performance.now();
    slowFrames = 0;
    renderer.setAnimationLoop(next ? loop : null);
  }

  function resize() {
    const r = el.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1 : 1.5) * quality);
    renderer.setSize(w, h, false);
    weather.resize(canvas.height);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (index >= 0) draw(0);
  }

  /* ---------- The pointer: lean, look along the road, honk ---------- */
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2), camera);
    let found = null, best = Infinity;
    for (const { v, kind, x, z } of spots) {
      box.min.set(x - kind.hl, 0, z - kind.hw); box.max.set(x + kind.hl, 1.25, z + kind.hw);
      const hit = ray.ray.intersectBox(box, target.clone());
      const far = hit ? hit.distanceTo(camera.position) : Infinity;
      if (far < best) { best = far; found = v; }
    }
    return found;
  }
  const move = (e) => {
    if (!playing) return;
    if (drag && e.pointerId === drag.id) {
      const px = e.clientX - drag.x;
      if (Math.abs(px) > 6) drag.moved = true;
      if (drag.moved) panTo = clamp(drag.from - (px / canvas.clientWidth) * 2 * Math.tan((FOV * RAD) / 2) * camera.aspect * scenes[index].shot.dist, -REACH, REACH);
      return;
    }
    if (e.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect();
    leanTo = ((e.clientX - r.left) / r.width - 0.5) * 2;
    probe = e;
  };
  const down = (e) => {
    if (!playing || e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, from: panTo, moved: false };
    canvas.setPointerCapture(e.pointerId);
    canvas.setAttribute('data-drag', '');
  };
  const up = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { moved } = drag;
    drag = null;
    canvas.removeAttribute('data-drag');
    if (moved || e.type === 'pointercancel') return;
    const v = pick(e);
    if (v) honks.set(v, tau);
  };
  const leave = () => { leanTo = 0; hover = null; canvas.removeAttribute('data-hot'); };
  canvas.addEventListener('pointermove', move, { passive: true });
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', leave);

  for (const s of scenes) scene.add(s.cast.group);
  await renderer.compileAsync(scene, camera);
  // A material's first use is slow on some drivers, so they get it a few at a time, before anything shows.
  const parts = scene.children.filter((o) => !o.isLight), shown = parts.map((o) => o.visible);
  for (const o of parts) o.visible = false;
  scene.updateMatrixWorld();
  for (const [i, o] of parts.entries()) {
    o.visible = true;
    if (i % 4 === 3 || i === parts.length - 1) { await breathe(); renderer.render(scene, camera); }
  }
  parts.forEach((o, i) => { o.visible = shown[i]; });
  for (const s of scenes) scene.remove(s.cast.group);

  const io = new IntersectionObserver((entries) => { visible = entries.at(-1).isIntersecting; sync(); }, { rootMargin: '80px 0px' });
  const ro = new ResizeObserver(resize);
  enter(0, scenes[0].still);
  io.observe(el);
  ro.observe(el);
  resize();

  return {
    /** Shows a happening. While it's paused or still, that's its telling frame. `at` starts it partway in. */
    go(next, at) {
      if (looping && at === undefined) return cut(next, true);
      enter(next, at ?? scenes[next].still, true);
      draw(0);
    },
    setPlaying(on) {
      playing = on;
      if (!on) { leanTo = lean = 0; drag = null; }
      sync();
    },
    dispose() {
      gone = true;
      sync();
      io.disconnect();
      ro.disconnect();
      scene.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose?.(); if (o.isInstancedMesh) o.dispose(); });
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      el.replaceChildren();
    },
  };
}
