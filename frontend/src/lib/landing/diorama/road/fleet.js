// Everything with wheels, nose toward +x. One unit is about two metres, so a jeepney is three units long.
import * as THREE from 'three';
import { bake, C, nub, taper, tint, wedge } from './kit.js';

const INK = '#1b2436', ARCH = '#10161f';

function jeepney({ body, hood = body, roof, trim = C.chrome, stripes, sign = C.mango, load }) {
  return bake(({ box, cylinder }, root) => {
    box(2.86, 0.1, 0.84, INK, -0.02, 0.31, 0);
    // The long passenger tub and the cab doors, with the stripes run round both.
    box(2.0, 0.42, 1.0, body, -0.48, 0.57, 0);
    box(0.44, 0.42, 0.98, body, 0.74, 0.57, 0);
    for (const [color, h, y] of stripes) box(2.46, h, 1.02, color, -0.26, y, 0);
    for (const z of [-0.512, 0.512]) {
      // Painted side panel: a sun and two slanted bars, the way every jeepney signs its side.
      cylinder(0.1, 0.02, stripes[1][0], -1.02, 0.66, z, root, 12).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) box(0.05, 0.26, 0.016, i === 1 ? C.white : stripes[0][0], -0.36 + i * 0.1, 0.63, z).rotation.z = -0.5;
      box(0.018, 0.4, 0.016, tint(body, 0.62), 0.52, 0.58, z * 0.985);
    }
    // Open windows: posts, the dark inside, and people on the benches.
    box(1.94, 0.3, 0.6, INK, -0.48, 0.92, 0);
    for (const x of [-1.45, -1.08, -0.71, -0.34, 0.03, 0.5]) for (const z of [-0.475, 0.475]) box(0.05, 0.32, 0.05, trim, x, 0.93, z);
    box(2.02, 0.04, 1.03, trim, -0.48, 0.79, 0);
    const shirts = [C.white, C.mango, C.sky, C.red, '#7fae9a', '#e8b7a0'];
    [-1.26, -0.9, -0.53, -0.16, 0.26].forEach((x, i) => {
      for (const z of [-0.37, 0.37]) {
        box(0.2, 0.16, 0.14, shirts[(i + (z > 0 ? 2 : 0)) % 6], x, 0.84, z);
        nub(root, 0.085, C.skin[(i + (z > 0 ? 1 : 0)) % 4], x, 0.96, z);
        box(0.13, 0.05, 0.12, INK, x, 1.02, z);
      }
    });
    box(2.54, 0.03, 1.11, trim, -0.3, 1.07, 0);
    box(2.5, 0.07, 1.08, roof, -0.3, 1.115, 0);
    box(0.3, 0.05, 1.02, roof, 1.04, 1.09, 0).rotation.z = -0.14;
    for (const z of [-0.5, 0.5]) box(2.1, 0.035, 0.035, trim, -0.45, 1.2, z);
    for (const x of [-1.4, -0.9, -0.4, 0.1, 0.55]) for (const z of [-0.5, 0.5]) box(0.03, 0.08, 0.03, trim, x, 1.17, z);
    if (load) {
      box(0.5, 0.2, 0.5, '#b98a52', -0.9, 1.25, -0.05);
      box(0.36, 0.16, 0.4, '#7c9a6a', -0.35, 1.23, 0.1);
      cylinder(0.17, 0.12, C.tyre, 0.2, 1.21, 0, root, 12);
    }
    // Windscreen, the route sign over it, and the cab's corner posts.
    for (const z of [-0.24, 0.24]) box(0.04, 0.3, 0.42, C.glass, 0.98, 0.93, z).rotation.z = 0.16;
    for (const z of [-0.48, 0, 0.48]) box(0.05, 0.32, 0.04, trim, 0.985, 0.93, z).rotation.z = 0.16;
    box(0.1, 0.22, 0.86, sign, 0.86, 1.27, 0);
    for (const z of [-0.22, 0.02, 0.24]) box(0.104, 0.07, 0.16, C.ink, 0.862, 1.27, z);
    box(0.34, 0.26, 0.6, INK, 0.72, 0.92, 0);
    nub(root, 0.085, C.skin[1], 0.7, 0.95, 0.24);
    // Bonnet, wings, slotted grille, lamps, bumper and the little chrome horse.
    wedge(root, 0.64, 0.3, 0.68, hood, 1.2, 0.66, 0, { tx: 0.95, tz: 0.88, sx: -0.01 });
    box(0.64, 0.02, 0.1, stripes[0][0], 1.2, 0.815, 0);
    box(0.64, 0.09, 1.0, hood, 1.2, 0.48, 0);
    box(0.05, 0.28, 0.6, trim, 1.53, 0.62, 0);
    for (const z of [-0.2, -0.1, 0, 0.1, 0.2]) box(0.055, 0.2, 0.045, INK, 1.535, 0.62, z);
    for (const z of [-0.41, 0.41]) cylinder(0.095, 0.07, C.lamp, 1.5, 0.63, z, root, 10).rotation.z = Math.PI / 2;
    for (const z of [-0.41, 0.41]) cylinder(0.11, 0.05, trim, 1.475, 0.63, z, root, 10).rotation.z = Math.PI / 2;
    box(0.08, 0.09, 1.06, trim, 1.58, 0.37, 0);
    box(0.13, 0.06, 0.05, trim, 1.2, 0.9, 0);
    box(0.05, 0.11, 0.05, trim, 1.27, 0.95, 0).rotation.z = -0.4;
    box(0.09, 0.05, 0.05, trim, 1.32, 0.99, 0);
    for (const x of [1.15, 1.25]) box(0.025, 0.08, 0.04, trim, x, 0.85, 0);
    for (const z of [-0.6, 0.6]) box(0.03, 0.11, 0.09, trim, 1.0, 0.98, z);
    box(0.02, 0.5, 0.02, trim, 1.42, 0.98, -0.34).rotation.z = 0.3;
    // The open back: doorway, step and grab bars.
    box(0.03, 0.72, 0.5, '#0b111d', -1.487, 0.72, 0);
    for (const z of [-0.28, 0.28]) box(0.03, 0.7, 0.03, trim, -1.52, 0.72, z);
    box(0.18, 0.05, 0.62, trim, -1.59, 0.31, 0);
    for (const z of [-0.43, 0.43]) box(0.03, 0.13, 0.1, C.tail, -1.5, 0.52, z);
    for (const x of [1.12, -0.92]) box(0.58, 0.24, 1.026, ARCH, x, 0.45, 0);
  });
}

function car({ body, taxi }) {
  return bake(({ box }, root) => {
    box(2.1, 0.26, 0.88, body, 0, 0.36, 0);
    wedge(root, 2.06, 0.1, 0.86, body, 0, 0.54, 0, { tx: 0.95, tz: 0.94 });
    wedge(root, 1.28, 0.32, 0.8, C.glass, -0.1, 0.74, 0, { tx: 0.64, tz: 0.84 });
    wedge(root, 0.06, 0.3, 0.82, body, -0.08, 0.74, 0, { tz: 0.84 });
    box(0.84, 0.05, 0.69, body, -0.1, 0.905, 0);
    box(0.05, 0.1, 0.84, INK, 1.05, 0.29, 0);
    box(0.05, 0.1, 0.84, INK, -1.05, 0.29, 0);
    box(0.04, 0.09, 0.4, C.chrome, 1.055, 0.42, 0);
    for (const z of [-0.32, 0.32]) {
      box(0.05, 0.1, 0.18, C.lamp, 1.045, 0.45, z);
      box(0.05, 0.1, 0.16, C.tail, -1.045, 0.45, z);
    }
    for (const z of [-0.47, 0.47]) box(0.08, 0.08, 0.06, body, 0.42, 0.64, z);
    for (const z of [-0.442, 0.442]) {
      box(0.016, 0.24, 0.01, tint(body, 0.62), -0.08, 0.42, z);
      box(0.12, 0.025, 0.012, C.chrome, 0.16, 0.46, z);
    }
    for (const x of [0.64, -0.64]) box(0.5, 0.2, 0.888, ARCH, x, 0.31, 0);
    if (taxi) {
      box(0.16, 0.13, 0.4, C.mango, -0.1, 0.99, 0);
      box(2.12, 0.07, 0.89, C.blue, 0, 0.45, 0);
    }
  });
}

/** A multicab: the small van that fills every side street. */
const van = (body, band) => bake(({ box }, root) => {
  box(2.1, 0.62, 0.9, body, -0.08, 0.58, 0);
  wedge(root, 0.4, 0.34, 0.86, body, 1.08, 0.44, 0, { tx: 0.5, sx: -0.1 });
  box(1.5, 0.28, 0.912, C.glass, -0.26, 0.76, 0);
  for (const x of [-0.72, -0.22, 0.3]) box(0.06, 0.28, 0.92, body, x, 0.76, 0);
  box(0.04, 0.3, 0.78, C.glass, 0.97, 0.77, 0).rotation.z = 0.2;
  box(2.12, 0.08, 0.915, band, -0.08, 0.5, 0);
  box(2.1, 0.05, 0.86, tint(body, 0.92), -0.08, 0.91, 0);
  for (const z of [-0.32, 0.32]) {
    box(0.05, 0.1, 0.16, C.lamp, 1.27, 0.45, z);
    box(0.04, 0.16, 0.1, C.tail, -1.135, 0.5, z);
  }
  box(0.06, 0.1, 0.86, INK, 1.27, 0.29, 0);
  for (const x of [0.7, -0.72]) box(0.5, 0.22, 0.92, ARCH, x, 0.32, 0);
});

const bus = () => bake(({ box }) => {
  box(5.6, 1.12, 1.22, C.mango, 0, 0.92, 0);
  box(5.62, 0.1, 1.235, C.red, 0, 0.62, 0);
  box(5.62, 0.06, 1.235, C.white, 0, 0.53, 0);
  box(4.9, 0.42, 1.236, C.glass, -0.2, 1.14, 0);
  for (let x = -2.4; x <= 2.1; x += 0.72) box(0.06, 0.42, 1.245, C.mango, x, 1.14, 0);
  box(0.04, 0.62, 1.08, C.glass, 2.8, 1.1, 0);
  box(0.05, 0.16, 0.9, C.ink, 2.81, 1.46, 0);
  box(0.02, 0.78, 0.5, C.glass, 2.0, 0.78, 0.615).rotation.y = Math.PI / 2;
  box(4.4, 0.08, 1.0, tint(C.mango, 0.9), -0.2, 1.52, 0);
  box(0.9, 0.12, 0.8, C.white, -1.2, 1.58, 0);
  for (const z of [-0.45, 0.45]) {
    box(0.05, 0.12, 0.2, C.lamp, 2.8, 0.5, z);
    box(0.05, 0.16, 0.12, C.tail, -2.81, 0.56, z);
  }
  box(0.08, 0.12, 1.2, INK, 2.82, 0.36, 0);
  for (const x of [1.75, -1.6]) box(0.72, 0.3, 1.24, ARCH, x, 0.42, 0);
});

const moto = (body, shirt, helmet, pillion) => bake(({ box }, root) => {
  box(0.62, 0.12, 0.14, body, 0, 0.42, 0);
  box(0.4, 0.07, 0.17, INK, -0.14, 0.51, 0);
  box(0.06, 0.34, 0.07, C.steel, 0.36, 0.42, 0).rotation.z = 0.35;
  box(0.05, 0.05, 0.42, INK, 0.28, 0.63, 0);
  box(0.14, 0.12, 0.16, body, 0.36, 0.56, 0);
  box(0.05, 0.09, 0.1, C.lamp, 0.44, 0.56, 0);
  box(0.04, 0.07, 0.1, C.tail, -0.38, 0.5, 0);
  const rider = (x, color, head, reach) => {
    box(0.2, 0.36, 0.3, color, x, 0.74, 0).rotation.z = -0.12;
    nub(root, 0.11, head, x + 0.05, 1.02, 0);
    for (const z of [-0.17, 0.17]) {
      box(0.28, 0.09, 0.1, '#2f3b52', x + 0.13, 0.55, z);
      box(0.09, 0.26, 0.1, '#2f3b52', x + 0.24, 0.42, z);
      box(reach, 0.07, 0.07, color, x + reach / 2, 0.76, z).rotation.z = -0.5;
    }
  };
  rider(-0.08, shirt, helmet, 0.3);
  if (pillion) rider(-0.34, pillion, C.white, 0.18);
});

const rescue = () => bake(({ box }, root) => {
  box(3.0, 0.16, 0.96, INK, 0, 0.38, 0);
  box(1.75, 0.82, 1.08, C.white, -0.6, 0.88, 0);
  box(1.77, 0.2, 1.09, C.red, -0.6, 0.72, 0);
  box(1.77, 0.05, 1.09, C.mango, -0.6, 0.58, 0);
  for (const z of [-0.546, 0.546]) {
    box(0.34, 0.1, 0.01, C.red, -0.6, 1.06, z);
    box(0.1, 0.34, 0.01, C.red, -0.6, 1.06, z);
  }
  box(0.9, 0.5, 1.0, C.red, 0.8, 0.66, 0);
  wedge(root, 0.9, 0.36, 0.98, C.glass, 0.78, 1.08, 0, { tx: 0.66, tz: 0.92, sx: -0.1 });
  box(0.6, 0.06, 0.9, C.red, 0.68, 1.28, 0);
  wedge(root, 0.34, 0.3, 0.94, C.red, 1.38, 0.6, 0, { tx: 0.8, sx: -0.03 });
  box(0.07, 0.12, 1.0, C.chrome, 1.56, 0.42, 0);
  for (const z of [-0.36, 0.36]) {
    box(0.05, 0.12, 0.18, C.lamp, 1.55, 0.62, z);
    box(0.04, 0.14, 0.1, C.tail, -1.49, 0.6, z);
  }
  box(0.14, 0.1, 0.7, INK, 0.66, 1.35, 0);
  for (const x of [1.0, -0.95]) box(0.64, 0.28, 1.1, ARCH, x, 0.44, 0);
});

const J = (body, roof, stripes, more) => jeepney({ body, roof, stripes, ...more });
/** Each kind: its shape, half its length and width, its wheels [x, z, radius] and lamps [x, y, z] (mirrored in z). */
const KINDS = () => {
  const jeep = { hl: 1.66, hw: 0.53, wheels: [[1.12, 0.45, 0.23], [-0.92, 0.45, 0.23]], head: [1.56, 0.63, 0.41], tail: [-1.53, 0.52, 0.43] };
  const sedan = { hl: 1.08, hw: 0.45, wheels: [[0.64, 0.38, 0.2], [-0.64, 0.38, 0.2]], head: [1.09, 0.45, 0.32], tail: [-1.09, 0.45, 0.32] };
  const multicab = { hl: 1.3, hw: 0.46, wheels: [[0.7, 0.39, 0.2], [-0.72, 0.39, 0.2]], head: [1.31, 0.45, 0.32], tail: [-1.17, 0.5, 0.32] };
  const bike = { hl: 0.55, hw: 0.18, wheels: [[0.42, 0, 0.18], [-0.34, 0, 0.18]], head: [0.48, 0.56, 0], tail: [-0.41, 0.5, 0] };
  const R = C.red, M = C.mango, B = C.blue, W = C.white;
  return {
    // The landing page's own jeepney first, then four more liveries from the same paint.
    jeepWhite: { ...jeep, shape: J(W, B, [[R, 0.11, 0.69], [M, 0.07, 0.595], [B, 0.04, 0.535]]) },
    jeepRed: { ...jeep, shape: J(R, W, [[M, 0.1, 0.69], [W, 0.05, 0.6], [B, 0.05, 0.54]], { load: true }) },
    jeepBlue: { ...jeep, shape: J(B, M, [[M, 0.1, 0.69], [R, 0.06, 0.6], [W, 0.04, 0.535]]) },
    jeepMango: { ...jeep, shape: J(M, R, [[R, 0.1, 0.69], [B, 0.07, 0.595], [W, 0.04, 0.53]], { sign: W }) },
    jeepTeal: { ...jeep, shape: J(C.teal, W, [[M, 0.1, 0.69], [W, 0.05, 0.6], [R, 0.05, 0.54]], { load: true }) },
    carRed: { ...sedan, shape: car({ body: R }) },
    carMango: { ...sedan, shape: car({ body: M }) },
    carWhite: { ...sedan, shape: car({ body: '#e6ecf4' }) },
    carSky: { ...sedan, shape: car({ body: C.sky }) },
    carSlate: { ...sedan, shape: car({ body: '#4a5a76' }) },
    taxi: { ...sedan, shape: car({ body: W, taxi: true }) },
    vanWhite: { ...multicab, shape: van('#e8edf4', R) },
    vanBlue: { ...multicab, shape: van('#7fb0e8', W) },
    moto: { ...bike, shape: moto(R, B, M) },
    habal: { ...bike, shape: moto(B, M, R, C.sky) },
    bus: { hl: 2.88, hw: 0.64, wheels: [[1.75, 0.55, 0.28], [-1.6, 0.55, 0.28]], head: [2.84, 0.5, 0.45], tail: [-2.85, 0.56, 0.45], shape: bus() },
    rescue: { hl: 1.62, hw: 0.56, wheels: [[1.0, 0.46, 0.26], [-0.95, 0.46, 0.26]], head: [1.59, 0.62, 0.36], tail: [-1.52, 0.6, 0.36], shape: rescue() },
  };
};

const wheelShape = () => bake(({ box, cylinder }, root) => {
  cylinder(1, 0.62, C.tyre, 0, 0, 0, root, 14).rotation.x = Math.PI / 2;
  for (const z of [-0.32, 0.32]) {
    cylinder(0.56, 0.04, C.steel, 0, 0, z, root, 12).rotation.x = Math.PI / 2;
    for (const a of [0, Math.PI / 2]) box(0.94, 0.16, 0.05, '#8c99aa', 0, 0, z * 1.05).rotation.z = a;
  }
});

const MANY = 26; // the most of one kind that any scene puts on the road
export function createFleet(parent, material) {
  const kinds = KINDS(), meshes = {};
  const instanced = (geometry, count) => {
    const inst = new THREE.InstancedMesh(geometry, material, count);
    inst.castShadow = inst.receiveShadow = true;
    inst.frustumCulled = false;
    inst.count = 0;
    parent.add(inst);
    return inst;
  };
  for (const [name, kind] of Object.entries(kinds)) meshes[name] = instanced(kind.shape, MANY);
  const wheels = instanced(wheelShape(), MANY * 16);
  const at = new THREE.Matrix4(), local = new THREE.Matrix4(), turn = new THREE.Euler(0, 0, 0, 'YZX'), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    kinds,
    begin() {
      for (const mesh of Object.values(meshes)) mesh.count = 0;
      wheels.count = 0;
    },
    /** Puts one vehicle on the road. `roll` is how far its wheels have turned, in road units. Returns where it stands. */
    put(name, x, y, z, yaw, pitch, roll) {
      const mesh = meshes[name], kind = kinds[name];
      if (mesh.count >= MANY) return null;
      at.compose(p.set(x, y, z), q.setFromEuler(turn.set(0, yaw, pitch)), s.set(1, 1, 1));
      mesh.setMatrixAt(mesh.count++, at);
      for (const [wx, wz, r] of kind.wheels) {
        for (const side of wz ? [-1, 1] : [1]) {
          local.compose(p.set(wx, r, wz * side), q.setFromEuler(turn.set(0, 0, -roll / r)), s.set(r, r, wz ? 0.24 : 0.12));
          wheels.setMatrixAt(wheels.count++, local.premultiply(at));
        }
      }
      return at;
    },
    end() {
      for (const mesh of Object.values(meshes)) mesh.instanceMatrix.needsUpdate = true;
      wheels.instanceMatrix.needsUpdate = true;
    },
  };
}

/** Road works: a cone, a barricade, and the digger in three pieces (body, boom, dipper) so its arm can work. */
export const props = {
  cone: () => bake(({ box }, root) => {
    box(0.26, 0.03, 0.26, '#d8481e', 0, 0.015, 0);
    taper(root, 0.025, 0.1, 0.36, '#ff6a2a', 0, 0.21, 0);
    taper(root, 0.056, 0.076, 0.09, C.white, 0, 0.22, 0);
  }),
  barricade: () => bake(({ box }) => {
    for (const x of [-0.42, 0.42]) for (const z of [-0.12, 0.12]) box(0.06, 0.62, 0.05, C.steel, x, 0.3, z).rotation.x = z > 0 ? -0.22 : 0.22;
    for (const y of [0.28, 0.52]) {
      for (let i = 0; i < 6; i++) box(0.2, 0.15, 0.05, i % 2 ? C.white : '#ff6a2a', -0.5 + i * 0.2, y, 0.13);
    }
  }),
  digger: () => bake(({ box, cylinder }, root) => {
    for (const z of [-0.42, 0.42]) {
      box(1.5, 0.3, 0.26, C.tyre, 0, 0.17, z);
      for (const x of [-0.6, -0.2, 0.2, 0.6]) cylinder(0.12, 0.28, '#4a5568', x, 0.16, z, root, 8).rotation.x = Math.PI / 2;
    }
    box(1.2, 0.16, 0.7, INK, 0, 0.4, 0);
    box(1.15, 0.42, 0.86, C.mango, 0.16, 0.69, 0);
    box(0.5, 0.2, 0.86, tint(C.mango, 0.82), 0.62, 0.99, 0);
    box(0.56, 0.52, 0.4, C.glass, -0.28, 1.14, 0.2);
    box(0.6, 0.06, 0.44, C.mango, -0.28, 1.42, 0.2);
    box(0.2, 0.26, 0.1, INK, 0.68, 1.1, -0.3);
  }),
  boom: () => bake(({ box }) => {
    box(1.3, 0.16, 0.16, C.mango, -0.6, 0.06, 0).rotation.z = -0.16;
    box(0.5, 0.06, 0.06, C.steel, -0.3, 0.2, 0).rotation.z = -0.3;
  }),
  dipper: () => bake(({ box }, root) => {
    box(0.13, 0.95, 0.13, C.mango, 0, -0.4, 0);
    wedge(root, 0.34, 0.3, 0.36, '#5b6678', 0.06, -0.98, 0, { tx: 1.4, sx: -0.06 });
    for (const z of [-0.12, 0, 0.12]) box(0.04, 0.1, 0.04, C.steel, 0.14, -1.16, z);
  }),
};
