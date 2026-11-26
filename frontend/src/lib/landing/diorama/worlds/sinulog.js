import { defineWorld } from '../world.js';

// Sinulog on a Cebu City street. One 2.4 s count of three: two steps forward, one back, the Santo Niño raised high.
// Drummers hit on every 0.4 s beat, alternating hands; the dancers step on the drum.
const TAU = Math.PI * 2;
const BEAT = 0.4;
const DANCERS = [];
for (const x of [-2.2, -0.75, 0.7, 2.15]) for (const z of [-0.6, 0.6]) DANCERS.push([x, z]);
const DRUMMERS = [[-4.15, -0.75], [-4.3, 0], [-4.15, 0.75]];
// Each hand hits every other beat (right on 0, 0.8, 1.6; left on 0.4, 1.2, 2.0). Over its 0.8 s cycle the stick
// rebounds, holds up, then comes down fast to land exactly on its beat: height above the skin, 0 on the hit.
const stickPhase = (t, side) => (((t - (side > 0 ? 0 : BEAT)) % (2 * BEAT)) + 2 * BEAT) % (2 * BEAT) / (2 * BEAT);
const stickHeight = (u, smooth) => (u < .15 ? .32 * smooth(u / .15) : u < .85 ? .32 : .32 * (1 - smooth((u - .85) / .15)));

export default defineWorld({
  name: 'sinulog', title: 'Sinulog on the boulevard',
  description: 'A Sinulog street dance on a Cebu City street: eight dancers in red and gold costumes with feather headdresses step forward, forward and back, raising images of the Santo Niño, while three drummers keep the beat and people watch from behind barricades under strings of coloured flags.',
  duration: 2.4, still: 0.42,
  bounds: [[-5.7, -0.4, -3.9], [5.7, 4.1, 3.9]],
  contactTimes: [0, 0.4, 0.8, 1.2],
  build(W) {
    const { box, ball, cylinder, line, group, THREE } = W;
    const cones = new Map(), coneGeo = W.own(new THREE.ConeGeometry(1, 1, 10));
    const cone = (r, h, color, x, y, z, parent) => {
      if (!cones.has(color)) cones.set(color, W.own(new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })));
      const m = new THREE.Mesh(coneGeo, cones.get(color)); m.scale.set(r, h, r); m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true; parent.add(m); return m;
    };

    W.terrain(11.4, 7.8, '#a49d90', 23);
    W.surface(11.4, 3.3, '#56595e', 0, .025, 0, 31, .1);
    for (const z of [-2.25, 2.25]) W.surface(11.4, 1.15, '#cfc6b6', 0, .04, z, 41, .08);
    for (let x = -5; x <= 5; x += 1.25) box(.55, .012, .07, '#e2cf7c', x, .035, 0);

    // Shophouses across the street: storefronts, awnings, windows, signboards.
    const walls = ['#e7d2a6', '#cfdfd0', '#efc6aa', '#c8d4e6', '#e6dcc4'];
    for (let i = 0; i < 5; i++) {
      const x = -4.6 + i * 2.3, h = 2.5 + (i % 3) * 0.45, house = group(x, 0, -3.35);
      box(2.2, h, 1.2, walls[i], 0, h / 2, 0, house);
      box(2.26, .12, 1.26, '#8a8172', 0, h + .06, 0, house);
      box(1.7, .9, .06, '#3b4048', 0, .5, .61, house);
      const awning = box(2.1, .08, .6, ['#c0392b', '#2f6f9c', '#d9a43a', '#3f8a5a', '#a54d7a'][i], 0, 1.18, .82, house);
      awning.rotation.x = .28;
      box(1.5, .32, .05, ['#2f6f9c', '#c0392b', '#3f8a5a', '#d9a43a', '#2f6f9c'][i], 0, 1.62, .63, house);
      box(1.1, .06, .02, '#f4eee0', 0, 1.63, .66, house);
      for (const wx of [-.55, .55]) for (let f = 1; f * 1.05 + 1 < h - .3; f++) box(.42, .5, .05, '#46505a', wx, f * 1.05 + 1.05, .61, house);
    }
    // A power pole and its sagging wires, the street's own drawing.
    for (const px of [5.1, -5.5]) {
      cylinder(.07, 3.9, '#7c776d', px, 1.95, -2.75);
      box(.9, .07, .07, '#6b665d', px, 3.6, -2.75);
    }
    for (const dz of [-.35, 0, .35]) {
      const sag = [];
      for (let i = 0; i <= 10; i++) { const u = i / 10; sag.push([5.1 - u * 10.6, 3.6 - Math.sin(u * Math.PI) * .35, -2.75 + dz]); }
      line(sag, '#26292c', .012);
    }

    // Buntings: strings across the street with small flags.
    const flagColors = ['#d23b3b', '#f0c419', '#2f7fc1', '#3aa05a', '#f4f0e6'];
    for (const bx of [-3.2, -.5, 2.3]) {
      cylinder(.04, 3, '#8a8578', bx + .3, 1.5, 2.85);
      const pts = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([bx + u * .3, 3.05 - Math.sin(u * Math.PI) * .32, -2.75 + u * 5.6]); }
      line(pts, '#3a3a3a', .01);
      for (let i = 1; i < 12; i++) {
        const [px, py, pz] = pts[i], f = box(.16, .2, .015, flagColors[i % 5], px, py - .12, pz);
        f.rotation.z = Math.PI / 4; f.rotation.y = Math.PI / 2;
      }
    }

    // The Santo Niño on a decorated float at the head of the parade.
    const float = group(4.25, 0, 0);
    box(1.15, .45, .9, '#c9a03b', 0, .33, 0, float);
    for (let i = 0; i < 9; i++) ball(.09, ['#d23b3b', '#f4f0e6', '#f0c419'][i % 3], -.5 + (i % 5) * .25, .6, i < 5 ? .42 : -.42, float);
    for (const [px, pz] of [[-.45, -.33], [.45, -.33], [-.45, .33], [.45, .33]]) cylinder(.025, .95, '#e9d38a', px, 1.0, pz, float);
    box(1.05, .06, .8, '#b8322f', 0, 1.5, 0, float);
    cone(.16, .5, '#b8322f', 0, .82, 0, float);
    ball(.09, '#d7a173', 0, 1.13, 0, float);
    cylinder(.07, .09, '#f0c419', 0, 1.24, 0, float);
    ball(.05, '#f0c419', .13, .98, 0, float);

    // Barricades and the people behind them.
    for (const z of [1.95, -1.95]) {
      box(10.6, .06, .04, '#efe8d6', 0, .62, z);
      box(10.6, .06, .04, '#efe8d6', 0, .32, z);
      for (let x = -5.2; x <= 5.2; x += 1.3) box(.05, .65, .05, '#c9c2b0', x, .33, z);
    }
    const shirts = ['#f2efe6', '#2f6f9c', '#c0392b', '#e5b34a', '#5c7d4f', '#7a5a9a', '#e57f5a'];
    const crowd = [];
    let k = 0;
    for (const [z, face] of [[2.6, Math.PI], [-2.15, 0]]) { // the back row stands clear of the shop awnings
      for (let x = -4.6; x <= 4.4; x += 1.05 + (k % 3) * .12) {
        const p = W.person(x, z, shirts[k % shirts.length], ['#2f3640', '#4b5563', '#6b5a48'][k % 3], .9 + (k % 4) * .03, ['#c89670', '#b07c58', '#d6a77f'][k % 3]);
        p.root.rotation.y = face; crowd.push({ p, cheer: k % 3 === 0, seed: k * 1.7 }); k++;
      }
    }

    // Dancers: red and gold, feather fans on their headdresses, skirts, and a Santo Niño in the right hand.
    const dancers = DANCERS.map(([x, z], i) => {
      const p = W.person(x, z, i % 2 ? '#d23b3b' : '#f0c419', '#7a1f1f', .95, ['#b9805a', '#c89670', '#a8714e'][i % 3]);
      p.root.rotation.y = Math.PI / 2;
      cone(.3, .42, i % 2 ? '#f0c419' : '#d23b3b', 0, -.18, 0, p.body).rotation.x = Math.PI;
      const crown = group(0, .1, -.06, p.head);
      cylinder(.17, .03, '#e9c35a', 0, 0, 0, crown, 12).rotation.x = Math.PI / 2;
      for (let f = 0; f < 7; f++) {
        const a = (f / 6 - .5) * 2.2, plume = box(.05, .42, .015, ['#d23b3b', '#f0c419', '#f4f0e6'][f % 3], Math.sin(a) * .2, .22 + Math.cos(a) * .17, -.04, crown);
        plume.rotation.z = -a;
      }
      // The image held up: the forearm points up when raised, so the figure extends along the hand's -y.
      cone(.05, .16, '#b8322f', 0, -.14, 0, p.rightHand).rotation.x = Math.PI;
      ball(.035, '#d7a173', 0, -.25, 0, p.rightHand);
      cylinder(.03, .035, '#f0c419', 0, -.29, 0, p.rightHand);
      return { p, x, z, beat: i % 2 ? 0 : BEAT / 2 };
    });

    // Drummers with their drums slung at the hips; sticks ride in the hands.
    const drummers = DRUMMERS.map(([x, z], i) => {
      const p = W.person(x, z, '#f4f0e6', '#2f3640', .95, ['#b07c58', '#c89670', '#a8714e'][i]);
      p.root.rotation.y = Math.PI / 2;
      const drum = group(x + .38, .98, z);
      cylinder(.22, .32, '#b8322f', 0, 0, 0, drum, 14);
      cylinder(.225, .02, '#f4efe1', 0, .17, 0, drum, 14);
      for (const side of [-1, 1]) cylinder(.012, .3, '#d9b77a', 0, -.12, 0, side < 0 ? p.leftHand : p.rightHand, 6);
      return { p, x, z, drumTop: [x + .38, 1.16, z] };
    });
    return { dancers, drummers, crowd, hits: [] };
  },
  tick({ t, parts, W }) {
    // Everyone here faces +x along the street, so a right hand (+1) is on the -z side and a left hand on +z.
    for (const d of parts.dancers) {
      const c = ((t + d.beat) % 2.4) / 0.8, beat = c % 1, step = Math.floor(c);
      const travel = step < 2 ? (step + W.smooth(beat)) * .12 : (2 - W.smooth(beat) * 2) * .12;
      d.p.root.position.x = d.x + travel;
      W.plant(d.p, { crouch: .03 + .05 * Math.sin(beat * Math.PI), lean: .1, twist: .18 * Math.sin((c / 3) * TAU) });
      // The lifting foot: right on counts one and three, left on count two.
      const lift = Math.sin(beat * Math.PI) * .55, side = step === 1 ? d.p.leftLeg : d.p.rightLeg, shin = step === 1 ? d.p.leftShin : d.p.rightShin;
      side.rotation.x -= lift; shin.rotation.x += lift * 1.4;
      const x = d.p.root.position.x, sway = Math.sin(c * TAU / 3);
      W.reach(d.p, 1, [x + .18, 2.05 + .1 * sway, d.z - .28 - .12 * sway]); // the Santo Niño, raised high
      W.reach(d.p, -1, [x + .42, 1.35 + .18 * Math.sin(c * TAU / 3 + 1), d.z + .38]);
    }
    parts.hits = [];
    for (const d of parts.drummers) {
      W.plant(d.p, { crouch: .02, lean: .12 });
      for (const side of [-1, 1]) {
        const top = d.drumTop, u = stickPhase(t, side), skin = [top[0] - .02, top[1] + .1, top[2] - side * .07];
        const palm = W.reach(d.p, side, [skin[0], skin[1] + stickHeight(u, W.smooth), skin[2]]);
        if (u < .02 || u > .98) parts.hits.push({ label: `${side > 0 ? 'right' : 'left'} stick, drummer at z ${d.z.toFixed(2)}`, a: palm, b: skin });
      }
    }
    for (const c of parts.crowd) {
      W.plant(c.p, { crouch: .01, lean: .03 });
      if (!c.cheer) continue;
      // Facing the parade: the front row looks toward -z (right hand on -x), the back row toward +z.
      const r = c.p.root.position, ahead = c.p.root.rotation.y ? -1 : 1, up = .1 * Math.sin(t * TAU / 1.2 + c.seed);
      W.reach(c.p, 1, [r.x + .15 * ahead, 2.1 + up, r.z + .2 * ahead]);
    }
  },
  // On each beat, the hand whose turn it is brings its grip down to just above the drum skin (the stick spans the rest).
  contacts({ parts }) { return parts.hits; },
});
