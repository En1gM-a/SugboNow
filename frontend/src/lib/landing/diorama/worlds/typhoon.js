import { defineWorld } from '../world.js';

// A bagyo on the north coast. In 4 s two gusts sweep in from the sea: the palms bow and spring back, waves break on
// the seawall, a warning flag snaps, leaves fly and slanted rain lashes the houses. Nobody is outside.
const TAU = Math.PI * 2;
const D = 4;
const gust = u => .45 + .55 * Math.sin(u * TAU * 2 - .6) ** 2; // two gusts per loop, never calm

export default defineWorld({
  name: 'typhoon', title: 'A bagyo on the coast',
  description: 'A typhoon on the north coast of Cebu: coconut palms bow in two hard gusts, grey waves break white against the seawall, a warning flag snaps on its pole, torn leaves fly inland and slanted rain sweeps over shuttered houses. No one is outside.',
  duration: D, still: .55,
  bounds: [[-5.6, -.4, -3.7], [5.6, 4.2, 3.7]],
  build(W) {
    const { box, ball, cylinder, group } = W;
    W.terrain(11.2, 7.4, '#3d5f78', 81); // the sea
    W.surface(11.2, 3.0, '#6f8a4a', 0, .05, -2.2, 83, .12); // land
    W.surface(11.2, .7, '#d8c79c', 0, .06, -.4, 85, .08); // sand
    box(11.2, .38, .3, '#9a968c', 0, .2, -.02); // seawall
    // Waves: crests rolling in toward the wall, with white tops when they break.
    const waves = [];
    for (let row = 0; row < 4; row++) for (let i = 0; i < 6; i++) {
      const g = group(-5 + i * 2 + (row % 2), 0, 0);
      box(1.6, .18, .25, '#4f7590', 0, .08, 0, g);
      box(1.2, .07, .16, '#e9eef2', 0, .2, -.06, g);
      waves.push({ g, row, x: g.position.x });
    }
    // Shuttered houses with weighted roofs.
    const houses = [[-3.6, -2.6, '#e7d8b6'], [-.6, -2.9, '#c9d9cf'], [2.6, -2.6, '#e9c9ad']];
    for (const [x, z, wall] of houses) {
      const g = group(x, 0, z);
      box(1.8, 1.2, 1.3, wall, 0, .65, 0, g);
      box(2.0, .1, 1.5, '#7c8389', 0, 1.33, 0, g).rotation.x = .1;
      for (const tx of [-.6, 0, .6]) box(.18, .14, .18, '#6b665d', tx, 1.45, .2, g);
      for (const wx of [-.45, .45]) box(.48, .42, .05, '#6f5640', wx, .75, .66, g);
      box(.36, .7, .05, '#5b4636', 0, .35, .66, g);
    }
    // Coconut palms: four trunk joints that bend with the wind, and a crown of fronds that streams.
    const palms = [[-4.8, -.9, 3.0], [-2.1, -1.3, 3.3], [.9, -1.0, 2.8], [4.3, -1.2, 3.2]].map(([x, z, h], i) => {
      const base = group(x, .05, z), joints = [];
      let parent = base;
      for (let j = 0; j < 4; j++) {
        const joint = group(0, j ? h / 4 : 0, 0, parent);
        cylinder(.09 - j * .012, h / 4, '#8a7356', 0, h / 8, 0, joint, 7);
        joints.push(joint); parent = joint;
      }
      const crown = group(0, h / 4, 0, parent), fronds = [];
      for (let f = 0; f < 8; f++) {
        const a = (f / 8) * TAU, pivot = group(0, 0, 0, crown);
        pivot.rotation.y = a;
        const leaf = box(.12, .03, 1.1, f % 2 ? '#4f7a3f' : '#5f8a48', 0, 0, .55, pivot);
        fronds.push({ pivot, leaf, a });
      }
      ball(.13, '#6e5a44', 0, -.08, 0, crown);
      return { joints, fronds, seed: i * 1.3 };
    });
    // A warning flag on its pole at the seawall.
    cylinder(.04, 2.6, '#c9c2b0', 4.9, 1.5, -.3);
    const flag = group(4.92, 2.6, -.3);
    box(.7, .4, .02, '#d23b3b', .36, 0, 0, flag);
    box(.2, .4, .025, '#1d1f22', .36, 0, 0, flag);
    // Torn leaves flying inland, and slanted rain.
    const leaves = [];
    for (let i = 0; i < 14; i++) { const g = group(); box(.12, .02, .06, i % 2 ? '#5f8a48' : '#8a9a52', 0, 0, 0, g); leaves.push({ g, i }); }
    const rain = [];
    for (let i = 0; i < 90; i++) {
      const g = group(0, 0, 0);
      const s = box(.012, .38, .012, '#c9d6e2', 0, 0, 0, g); s.rotation.z = .55; s.rotation.x = -.25;
      rain.push({ g, x: ((i * 41) % 112) / 10 - 5.6, z: ((i * 67) % 74) / 10 - 3.7, off: (i * .137 + .03) % 1 });
    }
    return { waves, palms, flag, leaves, rain };
  },
  tick({ t, parts }) {
    const u = t / D, g = gust(u);
    for (const w of parts.waves) {
      // Each row rolls from the far edge to the wall once per loop, grows as it comes and folds away at the wall;
      // the half-row offset keeps every row's restart away from the loop seam.
      const k = (u + (w.row + .5) / 4) % 1, z = 3.4 - k * 3.2, rise = Math.sin(k * Math.PI), fade = Math.min(1, k * 6, (1 - k) * 6);
      w.g.position.set(w.x + .2 * Math.sin(u * TAU + w.row), .02, z);
      w.g.scale.set(fade, (.4 + rise * 1.4 * (.6 + .4 * g)) * fade, fade);
    }
    for (const p of parts.palms) {
      const lag = Math.sin(u * TAU * 2 - .6 - p.seed * .2) ** 2, bend = -(.08 + .12 * lag) * (.6 + .4 * g);
      p.joints.forEach((j, k) => { j.rotation.z = bend * (k ? 1 : .5); j.rotation.x = .05 * Math.sin(u * TAU * 4 + k); });
      for (const f of p.fronds) {
        // Fronds facing the wind fold back over the crown; the rest stream downwind.
        const into = Math.cos(f.a), flutter = .12 * Math.sin(u * TAU * 8 + f.a * 3);
        f.pivot.rotation.x = .55 - .7 * Math.max(0, into) * g + flutter;
      }
    }
    parts.flag.rotation.y = .25 * Math.sin(u * TAU * 8) * g;
    parts.flag.rotation.z = -.15 * g;
    for (const l of parts.leaves) {
      const k = (u * 2 + (l.i + .5) / 14) % 1;
      l.g.position.set(5.4 - k * 11, .4 + 2.4 * k * (1 - k) * 3 + (l.i % 3) * .3, -3.2 + ((l.i * 0.53) % 6));
      l.g.rotation.set(u * TAU * 4 + l.i, u * TAU * 3, l.i);
      l.g.scale.setScalar(Math.min(1, k * 8, (1 - k) * 8));
    }
    for (const r of parts.rain) {
      const k = (u * 4 + r.off) % 1;
      r.g.position.set(r.x - k * 1.2, 4 - k * 3.8, r.z);
    }
  },
});
