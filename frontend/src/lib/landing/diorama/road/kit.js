// What the road is built with: the diorama kit's shapes (../world.js), drawn in a few calls however many there are.
// Things that never bend are baked into one coloured shape; people and plants keep their joints and share instances.
import * as THREE from 'three';
import { smooth, toolkit } from '../world.js';

export const TAU = Math.PI * 2;
export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, k) => a + (b - a) * k;
/** 0 until a, 1 from b, eased between. */
export const ramp = (v, a, b) => smooth((v - a) / (b - a));

// The page's colours (landing.css, and the jeepney in art.ts), and the street's own.
export const C = {
  ink: '#0e1726', red: '#c8102e', mango: '#ffc233', blue: '#1e5aa8', sky: '#5aa2f5', teal: '#0e7c74',
  white: '#eef3fa', steel: '#c9d3df', chrome: '#e3e9f0', glass: '#24344f', tyre: '#141b26',
  lamp: '#fff0bd', tail: '#8e1220', skin: ['#c89670', '#b07c58', '#d6a77f', '#a8714e'],
};
/** The same colour, darker (below 1) or lighter. */
export const tint = (color, k) => `#${new THREE.Color(color).multiplyScalar(k).getHexString()}`;

const add = (geometry, color, x, y, z, parent) => {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color }));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
/** A box whose top is scaled by tx and tz and slid by sx: bonnets, cabins, gables. */
export function wedge(parent, w, h, d, color, x, y, z, { tx = 1, tz = 1, sx = 0, sz = 0 } = {}) {
  const geometry = new THREE.BoxGeometry(w, h, d), at = geometry.attributes.position;
  for (let i = 0; i < at.count; i++) if (at.getY(i) > 0) { at.setX(i, at.getX(i) * tx + sx); at.setZ(i, at.getZ(i) * tz + sz); }
  geometry.computeVertexNormals();
  return add(geometry, color, x, y, z, parent);
}
/** A cylinder that narrows: cones, domes' drums, planters. */
export const taper = (parent, rTop, rBottom, h, color, x, y, z, sides = 10) => add(new THREE.CylinderGeometry(rTop, rBottom, h, sides), color, x, y, z, parent);
/** A small round thing in twenty faces: a head in a window, a fruit, a flower. */
export const nub = (parent, r, color, x, y, z) => add(new THREE.IcosahedronGeometry(r, 0), color, x, y, z, parent);

/** One shape from many meshes, with their colours in the vertices. */
function weld(meshes) {
  const count = meshes.reduce((n, { geometry: g }) => n + (g.index ?? g.attributes.position).count, 0);
  const position = new Float32Array(count * 3), normal = new Float32Array(count * 3), color = new Float32Array(count * 3);
  const v = new THREE.Vector3(), turn = new THREE.Matrix3();
  let at = 0;
  for (const { geometry: g, matrixWorld, material } of meshes) {
    const n = (g.index ?? g.attributes.position).count;
    turn.getNormalMatrix(matrixWorld);
    for (let i = 0; i < n; i++, at += 3) {
      const k = g.index ? g.index.getX(i) : i;
      v.fromBufferAttribute(g.attributes.position, k).applyMatrix4(matrixWorld).toArray(position, at);
      v.fromBufferAttribute(g.attributes.normal, k).applyNormalMatrix(turn).toArray(normal, at);
      material.color.toArray(color, at);
    }
  }
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.BufferAttribute(position, 3));
  shape.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  shape.setAttribute('color', new THREE.BufferAttribute(color, 3));
  return shape;
}
function gather(build) {
  const root = new THREE.Group(), W = toolkit(root), meshes = [];
  build(W, root);
  root.updateMatrixWorld(true);
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  return { meshes, done: () => W.dispose() };
}
/** Everything `build(W, root)` makes, as one shape. */
export function bake(build) {
  const { meshes, done } = gather(build), shape = weld(meshes);
  done();
  return shape;
}
/** The same in stretches of the road `long` units each, so the ones off screen aren't drawn. */
export function bakeAlong(long, build) {
  const { meshes, done } = gather(build), stretches = new Map();
  for (const m of meshes) {
    const at = Math.floor(m.matrixWorld.elements[12] / long);
    if (!stretches.has(at)) stretches.set(at, []);
    stretches.get(at).push(m);
  }
  const shapes = [...stretches.values()].map(weld);
  done();
  return shapes;
}

/** Jointed things made by `build(W, group)`: posed as usual, drawn as one instanced mesh for each shape. */
export function cast(material, build) {
  const group = new THREE.Group(), W = toolkit(group), pools = new Map();
  const parts = build(W, group);
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (!pools.has(o.geometry)) pools.set(o.geometry, []);
    pools.get(o.geometry).push(o);
  });
  const batches = [];
  for (const [geometry, meshes] of pools) {
    const inst = new THREE.InstancedMesh(geometry, material, meshes.length);
    inst.castShadow = inst.receiveShadow = true;
    inst.frustumCulled = false;
    inst.matrixAutoUpdate = false;
    meshes.forEach((o, i) => { o.visible = false; inst.setColorAt(i, o.material.color); });
    group.add(inst);
    batches.push({ inst, meshes });
  }
  return {
    group, W, parts,
    /** Call after the scene's matrices are up to date. The group itself must stay at the origin. */
    sync() {
      for (const { inst, meshes } of batches) {
        meshes.forEach((o, i) => inst.setMatrixAt(i, o.matrixWorld));
        inst.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

/** One frame of walking. `phase` is in radians; the feet swing `stride` either way. */
export function walk(p, phase, stride = 0.55) {
  const s = Math.sin(phase), c = Math.cos(phase);
  p.leftLeg.rotation.x = -s * stride;
  p.rightLeg.rotation.x = s * stride;
  p.leftShin.rotation.x = Math.max(0, c) * stride * 1.2;
  p.rightShin.rotation.x = Math.max(0, -c) * stride * 1.2;
  p.leftArm.rotation.x = s * stride * 0.8;
  p.rightArm.rotation.x = -s * stride * 0.8;
  p.body.position.y = 0.95 + Math.abs(c) * 0.03;
}
