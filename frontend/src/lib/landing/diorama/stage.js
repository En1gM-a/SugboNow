// Sample: one diorama at a time on a transparent canvas, for the hero's happenings. It follows the kit's mountWorld
// (world.js): the same fixed camera, fitted to the world's declared bounds, 30 frames a second at most, and no drawing
// while it's off screen. It drops mountWorld's white backdrop and finish pass so the scene's own sky shows around the
// diorama, and it lights each world to match its happening's sky.
import * as THREE from 'three';
import { clockTime, toolkit } from './world.js';
import flood from './worlds/flood.js';
import sinulog from './worlds/sinulog.js';
import traffic from './worlds/traffic.js';
import typhoon from './worlds/typhoon.js';

const light = (sun, sunI, sky, ground, hemiI) => ({ sun, sunI, sky, ground, hemiI });
// The happenings that have a diorama, by their id in data.ts, each lit like its sky there.
const WORLDS = {
  flood: { def: flood, light: light('#cfd8e3', 1.3, '#c5d0dd', '#4d5a4f', 1.5) }, // morning rain
  typhoon: { def: typhoon, light: light('#b9c4d2', 0.9, '#9fb0c4', '#3e4a46', 1.35) }, // morning storm
  bridge: { def: traffic, light: light('#a9b8e6', 1.1, '#6d7fae', '#2a2f3c', 1.2) }, // night
  sinulog: { def: sinulog, light: light('#fff6e2', 3.3, '#f2f5ff', '#6f7f5c', 1.8) }, // noon
};

export function mountStage(el) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); } catch { return null; }
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  el.replaceChildren(canvas);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight();
  const sun = new THREE.DirectionalLight();
  sun.position.set(-7, 13, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0005; sun.shadow.normalBias = .045;
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: .1, far: 45 });
  scene.add(hemi, sun);
  const camera = new THREE.OrthographicCamera(-12, 12, 9, -9, .1, 100);
  camera.position.set(24, 21, 26); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();

  let world = null, playing = false, visible = true, looping = false, time = 0, anchor = 0, epoch = 0, last = -Infinity;
  const draw = () => {
    world.def.tick({ t: time, parts: world.parts, W: world.W }); world.W.updateBatches();
    renderer.render(scene, camera);
  };
  function resize() {
    const r = el.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    if (!world) return;
    // All of the world's bounds, as large as the box allows.
    const { minX, maxX, minY, maxY } = world.fit, aspect = w / h;
    const span = Math.max(maxY - minY, (maxX - minX) / aspect) * 1.04, cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    Object.assign(camera, { left: cx - (span * aspect) / 2, right: cx + (span * aspect) / 2, top: cy + span / 2, bottom: cy - span / 2 });
    camera.updateProjectionMatrix();
    draw();
  }
  const loop = now => {
    if (now - last < 1000 / 30 - .5) return;
    last = now; time = clockTime(anchor, now - epoch, world.def.duration); draw();
  };
  function sync() {
    const next = Boolean(world && playing && visible);
    if (next === looping) return;
    looping = next; anchor = time; epoch = performance.now(); last = -Infinity;
    renderer.setAnimationLoop(next ? loop : null);
  }
  const io = new IntersectionObserver(entries => { visible = entries.at(-1).isIntersecting; sync(); });
  const ro = new ResizeObserver(resize);
  io.observe(el); ro.observe(el);
  return {
    // Builds the happening's diorama and shows it at its telling moment. False when that happening has none.
    show(id) {
      const next = WORLDS[id];
      if (!next) return false;
      if (world) { scene.remove(world.group); world.W.dispose(); }
      const group = new THREE.Group(), W = toolkit(group), parts = next.def.build(W);
      W.batch(); scene.add(group);
      const [lo, hi] = next.def.bounds, corners = [];
      for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) corners.push(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      const xs = corners.map(v => v.x), ys = corners.map(v => v.y);
      world = { def: next.def, group, W, parts, fit: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) } };
      const L = next.light;
      sun.color.set(L.sun); sun.intensity = L.sunI; hemi.color.set(L.sky); hemi.groundColor.set(L.ground); hemi.intensity = L.hemiI;
      time = next.def.still; looping = false; renderer.setAnimationLoop(null);
      resize(); sync();
      return true;
    },
    // Off for the page's pause and for reduced motion: the picture holds where it is.
    setPlaying(on) { playing = on; sync(); },
    dispose() {
      renderer.setAnimationLoop(null); io.disconnect(); ro.disconnect();
      if (world) world.W.dispose();
      sun.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
