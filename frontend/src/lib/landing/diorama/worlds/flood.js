import { defineWorld } from '../world.js';

// The Mananga in flood at Talisay, in rain. In 4 s a boatman makes two paddle strokes (blade enters the water at
// 0.5 s and 2.5 s) as his banca crosses the flooded lane; the water breathes, debris drifts, rain falls.
const TAU = Math.PI * 2;
const D = 4, WATER = .42;
const strokeAt = [.5, 2.5];

export default defineWorld({
  name: 'flood', title: 'The river over its banks',
  description: 'The Mananga River over its banks in Talisay: brown floodwater stands at the doors of a row of houses and around palm and banana trees, a boatman paddles a small banca along the flooded lane, branches drift past and rain falls.',
  duration: D, still: .5,
  bounds: [[-5.6, -.4, -3.7], [5.6, 3.6, 3.7]],
  contactTimes: strokeAt,
  build(W) {
    const { box, ball, cylinder, group, line } = W;
    W.terrain(11.2, 7.4, '#6f6a52', 71);
    // Floodwater over everything low: murky grey-green, so it reads as water rather than a dirt yard.
    const water = W.surface(11.2, 7.2, '#6c7a74', 0, WATER, 0, 73, .06);
    // Ripples where the water meets trunks, posts and walls, and streaks of the current moving through.
    const ripples = [[-4.9, -.6], [4.7, -.4], [2.2, -3.2], [-1.3, -3.2], [3.6, -3.1], [-4.1, -1.7], [-1.75, -1.7], [3, -1.7], [.6, -1.7]]
      .map(([x, z]) => W.ring(.28, '#a7b0a6', x, WATER + .012, z, undefined, .02));
    const streaks = [];
    for (let i = 0; i < 12; i++) streaks.push({ g: box(.7, .006, .03, '#9ea89f', 0, 0, 0), x: ((i * 29) % 112) / 10 - 5.6, z: ((i * 43) % 60) / 10 - 2.2 });
    // Houses on the bank, the water at their doors; one on stilts.
    const walls = ['#e7d8b6', '#c9d9cf', '#e9c9ad', '#d4d2c6'];
    for (let i = 0; i < 4; i++) {
      const x = -4.1 + i * 2.35, house = group(x, 0, -2.4), h = 1.5 + (i % 2) * .4, stilts = i === 2 ? .45 : 0;
      if (stilts) for (const [sx, sz] of [[-.7, -.5], [.7, -.5], [-.7, .5], [.7, .5]]) cylinder(.05, .5, '#6e5a44', sx, .25, sz, house, 6);
      box(1.7, h, 1.3, walls[i], 0, stilts + h / 2, 0, house);
      const roof = box(1.95, .1, 1.6, ['#8a8f94', '#a8473b', '#6f7f8a', '#a8473b'][i], 0, stilts + h + .14, .05, house);
      roof.rotation.x = -.12;
      box(.36, .7, .04, '#5b4636', -.3, stilts + .35, .66, house);
      box(.5, .34, .04, '#3e4750', .4, stilts + .95, .66, house);
      if (i === 1) { cylinder(.03, .9, '#6e6a62', .9, h + .2, .4, house); box(.7, .03, .03, '#e9e2cf', .55, h + .6, .4, house); }
    }
    // A low wall and a fence half under water mark where the lane is.
    for (let x = -5.2; x <= 5.2; x += .5) box(.06, .7, .06, '#9a8f7c', x, .35, -1.15);
    box(10.6, .06, .04, '#9a8f7c', 0, .62, -1.15);
    // Coconut and banana trees on the bank, standing in the water.
    const palm = (x, z, h) => {
      const g = group(x, 0, z);
      line([[0, 0, 0], [.08, h * .5, .03], [.2, h, .06]], '#8a7356', .06, g);
      for (let f = 0; f < 7; f++) {
        const a = (f / 7) * TAU, leaf = box(.09, .03, .9, f % 2 ? '#4f7a3f' : '#5f8a48', .2 + Math.cos(a) * .35, h + .02, .06 + Math.sin(a) * .35, g);
        leaf.rotation.y = -a + Math.PI / 2; leaf.rotation.x = .35;
      }
    };
    palm(-4.9, -.6, 2.6); palm(4.7, -.4, 2.4); palm(2.2, -3.2, 2.8);
    for (const [x, z] of [[-1.3, -3.2], [3.6, -3.1]]) {
      const g = group(x, 0, z); cylinder(.07, 1, '#7e8b4a', 0, .5, 0, g, 6);
      for (let f = 0; f < 5; f++) { const a = (f / 5) * TAU, leaf = box(.28, .02, .7, '#6a9a4a', Math.cos(a) * .25, 1.05, Math.sin(a) * .25, g); leaf.rotation.y = -a; leaf.rotation.z = .5; }
    }
    // Drifting branches and a plastic drum.
    const debris = [[-3, .9], [.5, 1.9], [3.3, .6], [-1.2, 2.7]].map(([x, z], i) => {
      const g = group(x, WATER + .02, z);
      if (i === 3) cylinder(.16, .32, '#2f6f9c', 0, .05, 0, g, 10).rotation.z = Math.PI / 2;
      else { box(.7, .05, .06, '#6e5a44', 0, 0, 0, g); box(.3, .04, .05, '#6e5a44', .15, 0, .1, g).rotation.y = .7; }
      return { g, x, z };
    });
    // The banca and its boatman, kneeling at the stern with a single paddle.
    const boat = group(0, WATER, .9);
    box(2.2, .22, .52, '#e9e2cf', 0, .05, 0, boat);
    box(2.0, .06, .46, '#2f6f9c', 0, .17, 0, boat);
    box(.3, .2, .3, '#e9e2cf', 1.15, .08, 0, boat).rotation.z = -.5;
    for (const x of [-.5, .5]) box(.05, .05, 1.8, '#a98a5c', x, .22, 0, boat);
    for (const z of [-.86, .86]) box(1.6, .06, .07, '#a98a5c', 0, .16, z, boat);
    const man = W.person(-.65, 0, '#e5b34a', '#2f3640', .9, '#a8714e');
    boat.add(man.root); man.root.position.y = .1; man.root.rotation.y = Math.PI / 2;
    cylinder(.24, .04, '#d9c48a', 0, .14, 0, man.head, 12);
    ball(.12, '#d9c48a', 0, .2, 0, man.head).scale.y = .6;
    const paddle = group();
    boat.add(paddle);
    cylinder(.025, 1.25, '#8a6a46', 0, 0, 0, paddle, 6);
    box(.2, .34, .03, '#8a6a46', 0, -.72, 0, paddle);
    // Rain: thin falling streaks, built once.
    const rain = [];
    for (let i = 0; i < 70; i++) {
      const g = group(((i * 37) % 112) / 10 - 5.6, 0, ((i * 53) % 72) / 10 - 3.6);
      box(.012, .32, .012, '#c9d6e2', 0, 0, 0, g); rain.push({ g, off: (i * .173 + .05) % 1 }); // none wraps at the loop seam
    }
    return { water, ripples, streaks, debris, boat, man, paddle, rain };
  },
  tick({ t, parts, W }) {
    const u = t / D, swell = .02 * Math.sin(u * TAU * 2);
    parts.water.position.y = WATER + swell;
    parts.ripples.forEach((r, i) => { r.position.y = WATER + swell + .012; r.scale.setScalar(.95 + .15 * Math.sin(u * TAU * 2 + i)); });
    for (const s of parts.streaks) s.g.position.set(((s.x + 5.6 + u * 11.2 + .3) % 11.2) - 5.6, WATER + swell + .008, s.z);
    for (const d of parts.debris) d.g.position.set(((d.x + 5.6 + u * 11.2) % 11.2) - 5.6, WATER + .02 + swell, d.z + .1 * Math.sin(u * TAU + d.x));
    const b = parts.boat;
    b.position.set(1.6 * Math.sin(u * TAU), WATER + swell + .01 * Math.sin(u * TAU * 4), .9);
    b.rotation.y = .08 * Math.sin(u * TAU);
    // Stroke: reach forward, blade in at strokeAt, pull back along the side, lift and recover over the bow.
    const man = parts.man, s = ((t - strokeAt[0] + D) % (D / 2)) / (D / 2);
    const pull = s < .35 ? W.smooth(s / .35) : 1 - W.smooth((s - .35) / .65);
    W.plant(man, { crouch: .32, lean: .25 + .2 * (1 - pull), twist: -.2 });
    const reachX = -.1 + .55 * (1 - pull), blade = [reachX, -.06 + .22 * (s > .4 ? Math.sin(((s - .4) / .6) * Math.PI) : 0), .42];
    const grip = [blade[0] - .12, blade[1] + 1.05, .3];
    parts.paddle.position.set((blade[0] + grip[0]) / 2, (blade[1] + grip[1]) / 2 + .36, .38);
    parts.paddle.rotation.set(-.25, 0, .1);
    b.updateMatrixWorld(true);
    const world = v => { const p = new W.THREE.Vector3(...v); b.localToWorld(p); return p.toArray(); };
    parts.palm = W.reach(man, -1, world([grip[0], grip[1] - .05, grip[2]]));
    W.reach(man, 1, world([grip[0] + .05, grip[1] - .45, grip[2] + .03]));
    const tip = new W.THREE.Vector3(0, -.86, 0); parts.paddle.localToWorld(tip);
    parts.tip = tip.toArray(); parts.surface = WATER + swell;
    for (const r of parts.rain) r.g.position.y = 3.4 - ((u * 4 + r.off) % 1) * 3.0;
  },
  // At the catch, the blade's lowest point sits in the water surface.
  contacts({ parts }) { return [{ label: 'paddle blade at the water', a: parts.tip, b: [parts.tip[0], parts.surface, parts.tip[2]] }]; },
});
