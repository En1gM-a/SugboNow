// What falls, rises and glows: rain, flood water, the drain under the sidewalk, flying leaves, and every light at night.
import * as THREE from 'three';
import { seeded } from '../world.js';
import { clamp, lerp } from './kit.js';
import { CURB, END, LAMPS, STEP, WALK } from './set.js';

const MUD = '#9a8c6c';

/** Every soft light in one call: lamp glows facing the camera, and pools and wet reflections lying on the road. */
export function createGlow(scene, camera) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,.55)'); g.addColorStop(0.55, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(canvas), MAX = 560;
  const inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), MAX);
  inst.frustumCulled = false;
  inst.renderOrder = 5;
  inst.setColorAt(0, new THREE.Color());
  scene.add(inst);
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const at = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(), tone = new THREE.Color();
  const put = (q, x, y, z, w, h, color, k) => {
    if (k <= 0.01 || inst.count >= MAX) return;
    inst.setMatrixAt(inst.count, at.compose(p.set(x, y, z), q, s.set(w, h, 1)));
    inst.setColorAt(inst.count++, tone.set(color).multiplyScalar(k));
  };
  return {
    begin() { inst.count = 0; },
    /** A light you see. */
    spot(x, y, z, size, color, k = 1) { put(camera.quaternion, x, y, z, size, size, color, k); },
    /** Light lying on the road: w along it, d across it. */
    pool(x, y, z, w, d, color, k = 1) { put(flat, x, y, z, w, d, color, k); },
    end() { inst.instanceMatrix.needsUpdate = true; inst.instanceColor.needsUpdate = true; },
  };
}

/** Headlight beams: a fan of light on the road ahead of each vehicle. */
export function createBeams(scene) {
  const MAX = 64, fan = new THREE.BufferGeometry(), points = [], tones = [], index = [];
  // Rows down the beam, five points across: bright down the middle, nothing at the sides or the far end.
  [[0, 0.26, 0.5], [0.9, 0.5, 0.42], [2.1, 0.8, 0.2], [3.6, 1.15, 0.06], [4.6, 1.35, 0]].forEach(([x, half, k], row) => {
    for (const side of [-1, -0.5, 0, 0.5, 1]) { const lit = k * (1 - side * side); points.push(x, 0, side * half); tones.push(lit, lit * 0.9, lit * 0.66); }
    if (row) for (let i = 0; i < 4; i++) { const a = (row - 1) * 5 + i, b = row * 5 + i; index.push(a, a + 1, b, b, a + 1, b + 1); }
  });
  fan.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  fan.setAttribute('color', new THREE.Float32BufferAttribute(tones, 3));
  fan.setIndex(index);
  const inst = new THREE.InstancedMesh(fan, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }), MAX);
  inst.frustumCulled = false;
  inst.renderOrder = 4;
  scene.add(inst);
  const at = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  return {
    begin(k) { inst.count = 0; inst.material.opacity = k; inst.visible = k > 0.02; },
    put(x, y, z, yaw) { if (inst.count < MAX) inst.setMatrixAt(inst.count++, at.compose(p.set(x, y, z), q.setFromAxisAngle(up, yaw), s.set(1, 1, 1))); },
    end() { inst.instanceMatrix.needsUpdate = true; },
  };
}

export function createWeather(scene) {
  const rng = seeded(31);

  // Rain: one block of streaks, stacked twice, sliding down by one block's height and starting again.
  const HIGH = 9, streaks = 1700, rainAt = [];
  for (let i = 0; i < streaks; i++) {
    const x = (rng() - 0.5) * 64, z = lerp(-5.5, 5.5, rng()), y = rng() * HIGH, len = 0.3 + rng() * 0.42, w = 0.009 + rng() * 0.008;
    for (const up of [0, HIGH]) rainAt.push(x - w, y + up, z, x + w, y + up, z, x - w, y + up + len, z, x - w, y + up + len, z, x + w, y + up, z, x + w, y + up + len, z);
  }
  const rainShape = new THREE.BufferGeometry();
  rainShape.setAttribute('position', new THREE.Float32BufferAttribute(rainAt, 3));
  const rainMat = new THREE.MeshBasicMaterial({ color: '#cfe0f4', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  // It thins out toward the top of the canvas, where the page's own rain takes over, so no edge shows between them.
  const high = { value: 1 };
  rainMat.onBeforeCompile = (shader) => {
    shader.uniforms.uHigh = high;
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'uniform float uHigh;\nvoid main() {').replace('#include <opaque_fragment>', 'diffuseColor.a *= 1.0 - smoothstep(0.68, 0.98, gl_FragCoord.y / uHigh);\n#include <opaque_fragment>');
  };
  const rain = new THREE.Mesh(rainShape, rainMat);
  rain.frustumCulled = false;
  const slope = new THREE.Group();
  slope.matrixAutoUpdate = false;
  slope.add(rain);
  scene.add(slope);

  // Splashes on whatever the rain lands on.
  const DROPS = 130, drops = Array.from({ length: DROPS }, () => ({ x: (rng() - 0.5) * 44, z: (rng() - 0.5) * 8.6, off: rng(), slow: 0.55 + rng() * 0.3 }));
  const ringMat = new THREE.MeshBasicMaterial({ color: '#dce9f8', transparent: true, opacity: 0.5, depthWrite: false });
  const rings = new THREE.InstancedMesh(new THREE.RingGeometry(0.74, 1, 9).rotateX(-Math.PI / 2), ringMat, DROPS);
  rings.frustumCulled = false;
  scene.add(rings);

  // Flood water: a sheet of facets over the street that ends in a cut face at the slab's front edge.
  const NX = 120, NZ = 12, back = -4.7, cells = [], sheet = [], index = [];
  for (let j = 0; j <= NZ + 1; j++) for (let i = 0; i <= NX; i++) {
    const x = -END + (i / NX) * END * 2, z = j > NZ ? WALK : lerp(back, WALK, j / NZ);
    const jog = j > 0 && j < NZ ? (rng() - 0.5) * 0.4 : 0;
    sheet.push(x + (j > 0 && j < NZ ? (rng() - 0.5) * 0.5 : 0), 0, z + jog);
    cells.push(j > NZ);
  }
  for (let j = 0; j <= NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + NX + 1; index.push(a, b, a + 1, a + 1, b, b + 1); }
  const waterShape = new THREE.BufferGeometry();
  waterShape.setAttribute('position', new THREE.Float32BufferAttribute(sheet, 3));
  waterShape.setIndex(index);
  waterShape.computeVertexNormals();
  const waterMat = new THREE.MeshStandardMaterial({ color: MUD, roughness: 0.24, transparent: true, opacity: 0.84, flatShading: true, side: THREE.DoubleSide });
  const water = new THREE.Mesh(waterShape, waterMat);
  water.receiveShadow = true;
  water.frustumCulled = false;
  water.renderOrder = 2;
  scene.add(water);

  // The drain in the cut edge: water in its channel, and what pours down the inlets.
  const drainMat = new THREE.MeshStandardMaterial({ color: MUD, roughness: 0.3, flatShading: true });
  const drain = new THREE.Mesh(new THREE.BoxGeometry(END * 2, 1, 0.5), drainMat);
  drain.position.z = WALK - 0.32;
  const INLETS = Array.from({ length: 16 }, (_, i) => -45 + i * 6);
  const pours = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#b3c4d4', roughness: 0.3 }), INLETS.length);
  pours.frustumCulled = false;
  scene.add(drain, pours);

  // Bow waves and wakes behind whatever wades through.
  const WAKES = 12, wakeShape = new THREE.BufferGeometry();
  wakeShape.setAttribute('position', new THREE.Float32BufferAttribute([0.1, 0, 0, -2.6, 0, 1.35, -2.2, 0, 1.0, 0.1, 0, 0, -2.2, 0, -1.0, -2.6, 0, -1.35, 0.16, 0, 0, -0.5, 0, 0.62, -0.62, 0, 0.3, 0.16, 0, 0, -0.62, 0, -0.3, -0.5, 0, -0.62], 3));
  const wakes = new THREE.InstancedMesh(wakeShape, new THREE.MeshBasicMaterial({ color: '#e6dfc9', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), WAKES);
  wakes.frustumCulled = false;
  wakes.renderOrder = 3;
  scene.add(wakes);

  // Torn leaves, and a sheet of roofing iron, on the wind.
  const LEAVES = 46, leaves = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.02, 0.09), new THREE.MeshLambertMaterial(), LEAVES);
  const leafTone = new THREE.Color();
  for (let i = 0; i < LEAVES; i++) leaves.setColorAt(i, leafTone.set(i === 0 ? '#9aa5b5' : ['#5f9f55', '#8a9a52', '#4d8f52', '#b09a4a'][i % 4]));
  leaves.frustumCulled = false;
  scene.add(leaves);

  const at = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let wakeCount = 0, level = -1;
  const swell = (x, z, t) => 0.028 * Math.sin(x * 1.7 + t * 1.6) + 0.022 * Math.sin(z * 2.3 - t * 2.1 + x * 0.6);
  return {
    /** The canvas's height, in its own pixels. */
    resize(pixels) { high.value = pixels; },
    begin() { wakeCount = 0; },
    wake(x, z, yaw, size, speed) {
      if (wakeCount >= WAKES) return;
      const k = clamp(speed / 0.9, 0.35, 1);
      wakes.setMatrixAt(wakeCount++, at.compose(p.set(x, level + 0.03, z), q.setFromAxisAngle(up, yaw), s.set(size * k, 1, size * (0.8 + 0.1 * Math.sin(x * 3)))));
    },
    /** How high the water stands at a spot, for things that float or wade. */
    waterAt: (x, z, t) => level + swell(x, z, t),
    /** Once the traffic has made its waves. */
    flush() {
      wakes.count = wakeCount;
      wakes.visible = wakeCount > 0;
      wakes.instanceMatrix.needsUpdate = true;
    },
    update({ time, rainfall, wind, flood, drained }) {
      level = flood;
      // The wind blows toward +x: the whole block leans with it.
      slope.matrix.set(1, -(0.14 + wind * 0.5), 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
      slope.matrixWorldNeedsUpdate = true;
      slope.visible = rainfall > 0.02;
      rainMat.opacity = Math.min(0.62, rainfall * 0.6);
      rainShape.setDrawRange(0, Math.round(streaks * clamp(0.35 + rainfall * 0.65)) * 12);
      rain.position.y = -0.4 - ((time * (11 + wind * 5)) % HIGH);

      const ground = flood > 0.02 ? flood + 0.02 : 0.025;
      rings.visible = rainfall > 0.05;
      if (rings.visible) {
        ringMat.opacity = 0.22 + rainfall * 0.3;
        drops.forEach((d, i) => {
          const u = (time / d.slow + d.off) % 1, walkway = Math.abs(d.z) > CURB && flood < STEP;
          const r = (i / DROPS < rainfall ? 1 : 0) * (0.04 + 0.17 * u) * (u < 0.85 ? 1 : (1 - u) / 0.15);
          rings.setMatrixAt(i, at.makeScale(r, 1, r).setPosition(d.x, walkway ? STEP + 0.02 : ground, d.z));
        });
        rings.instanceMatrix.needsUpdate = true;
      }

      water.visible = flood > 0.005;
      if (water.visible) {
        const pos = waterShape.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.setY(i, cells[i] ? Math.min(flood, STEP - 0.02) : flood + swell(pos.getX(i), pos.getZ(i), time));
        pos.needsUpdate = true;
      }

      const high = clamp(drained, 0.04, 1) * 0.54;
      drain.scale.y = high;
      drain.position.y = -0.97 + high / 2 + 0.012 * Math.sin(time * 3);
      INLETS.forEach((x, i) => {
        const k = clamp(rainfall * 1.3) * (0.75 + 0.25 * Math.sin(time * 7 + i * 2));
        const top = STEP - 0.02, foot = -0.97 + high;
        at.makeScale(k > 0.05 ? 0.2 * k : 0, Math.max(0.01, top - foot), 0.05).setPosition(x, (top + foot) / 2, WALK + 0.02);
        pours.setMatrixAt(i, at);
      });
      pours.instanceMatrix.needsUpdate = true;

      leaves.visible = wind > 0.5;
      if (leaves.visible) {
        for (let i = 0; i < LEAVES; i++) {
          const u = (time * (0.2 + (i % 7) * 0.02) + i * 0.137) % 1, size = i === 0 ? 5 : 1 + (i % 3) * 0.4;
          p.set(-24 + u * 48, 0.5 + (i % 9) * 0.42 + Math.sin(u * 14 + i) * 0.5, -4.4 + ((i * 1.31) % 9.4));
          leaves.setMatrixAt(i, at.compose(p, q.setFromEuler(e.set(time * 5 + i, time * 4, i * 2)), s.set(size, i === 0 ? 1 : size, size)));
        }
        leaves.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

/** The street lamps' own light: a glow at each head and a pool under it. */
export function lampLight(glow, night, wetness, lamp) {
  for (const l of LAMPS) {
    const k = night * lamp(l.x);
    if (k < 0.02) continue;
    glow.spot(l.x, l.y - 0.02, l.head, 1.5, '#ffd58a', k);
    glow.pool(l.x, 0.04, l.head * 0.86, 5.2, 3.4, '#ffb95e', k * 0.5);
    if (wetness > 0.2) glow.pool(l.x, 0.045, l.z > 0 ? 2.2 : l.head + 1.1, 0.5, l.z > 0 ? 1.5 : 2.6, '#ffe0a6', k * wetness * 0.5);
  }
}

/** Light in the air behind the rooftops, strongest toward the sun and gone before the top of the canvas. */
export function createHorizon(scene) {
  const COLUMNS = 24, sheet = new THREE.PlaneGeometry(END * 2.4, 4.2, COLUMNS, 3);
  const tones = new THREE.BufferAttribute(new Float32Array((COLUMNS + 1) * 16), 4);
  sheet.setAttribute('color', tones);
  const mesh = new THREE.Mesh(sheet, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false }));
  mesh.position.set(0, 1.9, -10.6);
  mesh.renderOrder = -1;
  scene.add(mesh);
  const tone = new THREE.Color(), at = sheet.attributes.position;
  return (color, strength, from) => {
    tone.set(color);
    for (let i = 0; i < at.count; i++) {
      const up = clamp(at.getY(i) / 4.2 + 0.5), near = Math.exp(-(((at.getX(i) - from) / 22) ** 2));
      tones.setXYZW(i, tone.r, tone.g, tone.b, strength * (0.3 + 0.7 * near) * (1 - up) ** 1.4);
    }
    tones.needsUpdate = true;
  };
}
