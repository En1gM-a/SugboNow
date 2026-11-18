import { defineWorld } from '../world.js';

// Morning jam on the old Mandaue–Mactan bridge. In 6 s the jammed lane rolls forward twice in a stop-and-go wave
// (brake lights on while it waits) and the other lane keeps moving; a traffic enforcer waves it on; a banca passes under.
const TAU = Math.PI * 2;
const D = 6, L = 13, EDGE = 5.7;
const wrap = x => ((((x + L / 2) % L) + L) % L) - L / 2;
// Monotonic stop-and-go progress over one loop: two pauses, never backwards, returns to the same phase at D.
const crawl = t => t / D - Math.sin((TAU * 2 * t) / D) / (TAU * 2);
const crawlSpeed = t => (1 - Math.cos((TAU * 2 * t) / D)) / D; // its rate: 0 when the lane stands still

export default defineWorld({
  name: 'bridge-traffic', title: 'Morning jam on the bridge',
  description: 'A morning traffic jam on the Mandaue–Mactan bridge over the channel: jeepneys and cars in one lane inch forward and stop with their brake lights on, the other lane flows, a traffic enforcer at the foot of the bridge waves cars on, and a small banca passes underneath.',
  duration: D, still: 1.2,
  bounds: [[-5.9, -0.4, -3.9], [5.9, 3.2, 3.9]],
  build(W) {
    const { box, ball, cylinder, group } = W;
    W.terrain(11.6, 7.6, '#3f7eab', 61); // the channel
    for (const x of [-5.05, 5.05]) {
      W.surface(1.6, 7.4, '#b9b19d', x, .06, 0, 63, .08);
      for (const z of [-2.6, 2.7]) {
        const house = group(x + (x < 0 ? -.2 : .2), 0, z);
        box(.9, .7, .8, ['#e4d6b4', '#d3e1d4'][z < 0 ? 0 : 1], 0, .41, 0, house);
        box(1.0, .12, .9, '#a8473b', 0, .82, 0, house);
        box(.25, .4, .02, '#4a4038', .1, .26, .41, house);
      }
      W.tree(x + (x < 0 ? .35 : -.35), -1.35, .45, x < 0 ? 5 : 9);
    }
    // The deck with a raised sidewalk each side, its parapet and railing, piers down into the water, lamp posts.
    box(11.6, .22, 3.9, '#bfb9aa', 0, 1.25, 0);
    for (const z of [-1.62, 1.62]) box(11.6, .06, .6, '#d9d3c4', 0, 1.39, z);
    for (const z of [-1.95, 1.95]) {
      box(11.6, .3, .14, '#d6d0c1', 0, 1.33, z);
      box(11.6, .05, .05, '#9aa4a8', 0, 1.72, z);
      for (let x = -5.6; x <= 5.6; x += .7) box(.05, .32, .05, '#9aa4a8', x, 1.56, z);
    }
    for (const x of [-3.3, 0, 3.3]) { box(.55, 1.15, 2.8, '#a9a395', x, .58, 0); box(.8, .12, 3.3, '#b8b2a3', x, 1.12, 0); }
    for (let x = -4.5; x <= 4.5; x += 3) {
      cylinder(.035, 1.15, '#7d8589', x, 1.95, -1.95);
      box(.42, .04, .05, '#7d8589', x, 2.5, -1.8).rotation.y = Math.PI / 2;
      box(.12, .06, .14, '#f4e9c8', x, 2.47, -1.64);
    }
    for (let x = -5.2; x <= 5.2; x += 1.1) box(.55, .012, .06, '#f2ead2', x, 1.37, 0);

    // Each vehicle reports how far it reaches ahead of (f) and behind (b) its origin, so spacing uses real lengths.
    // Jeepney: long low passenger body, open window band with pillars, thin silver roof with painted trim,
    // a longer bonnet with chrome grille and hood ornament, side art, an open door at the back.
    const jeepney = (body, stripe) => {
      const g = group();
      box(1.6, .4, .78, body, -.2, .55, 0, g);
      box(1.45, .21, .8, '#2a2f35', -.22, .86, 0, g);
      for (let x = -.85; x <= .4; x += .31) box(.05, .21, .81, body, x, .86, 0, g);
      box(1.72, .05, .86, '#98a0a7', -.2, 1.0, 0, g);
      box(1.72, .07, .87, stripe, -.2, .945, 0, g);
      for (const z of [-.37, .37]) box(1.55, .03, .03, '#e9ebec', -.2, 1.06, z, g);
      box(1.6, .06, .79, stripe, -.2, .46, 0, g);
      box(1.6, .025, .79, '#f4f0e6', -.2, .52, 0, g);
      box(.02, .44, .4, '#1b1f24', -1.0, .58, 0, g);
      box(.6, .28, .7, body, .79, .48, 0, g);
      ball(.035, '#e9ebec', 1.0, .66, 0, g);
      box(.04, .25, .66, '#2a2f35', .49, .8, 0, g).rotation.z = .3;
      box(.04, .22, .5, '#e6e8ea', 1.1, .47, 0, g);
      box(.08, .08, .82, '#e6e8ea', 1.12, .3, 0, g);
      for (const z of [-.24, .24]) box(.04, .08, .1, '#f6eec9', 1.11, .56, z, g);
      for (const [x, z] of [[.78, -.4], [.78, .4], [-.62, -.4], [-.62, .4]]) cylinder(.17, .1, '#202326', x, .17, z, g, 10).rotation.x = Math.PI / 2;
      for (const z of [-.3, .3]) box(.04, .08, .12, '#6b1f1f', -1.0, .45, z, g);
      const glow = group(-1.03, .45, 0, g);
      for (const z of [-.3, .3]) box(.03, .1, .14, '#ff3b30', 0, 0, z, glow);
      return { g, glow, f: 1.16, b: 1.05 };
    };
    const car = (body) => {
      const g = group();
      box(1.15, .3, .62, body, 0, .3, 0, g);
      box(.62, .24, .56, '#2c3238', -.08, .55, 0, g);
      box(.66, .05, .58, body, -.08, .69, 0, g);
      for (const [x, z] of [[.38, -.31], [.38, .31], [-.38, -.31], [-.38, .31]]) cylinder(.13, .08, '#202326', x, .13, z, g, 10).rotation.x = Math.PI / 2;
      for (const z of [-.22, .22]) box(.03, .06, .1, '#6b1f1f', -.58, .36, z, g);
      const glow = group(-.6, .36, 0, g);
      for (const z of [-.22, .22]) box(.03, .08, .12, '#ff3b30', 0, 0, z, glow);
      return { g, glow, f: .58, b: .6 };
    };
    const deck = 1.36;
    // Jammed lane toward Mactan (+z side, heading -x); free lane toward Mandaue (-z side, heading +x).
    // Bumper to bumper round the 13-unit loop, the same gap after every vehicle's real length. The queue stops and
    // goes as one, so the gaps never change and nothing can run into the vehicle ahead, the wrap-around pair included.
    const jammed = [jeepney('#c0392b', '#f0c419'), car('#e8e4da'), jeepney('#2f6f9c', '#f0c419'), jeepney('#3a8a5a', '#d23b3b'), car('#3d4a57'), jeepney('#e0a12e', '#2f6f9c')];
    const gap = (L - jammed.reduce((sum, v) => sum + v.f + v.b, 0)) / jammed.length;
    jammed.forEach((v, i) => {
      v.g.position.set(0, deck, .72); v.g.rotation.y = Math.PI;
      v.x0 = i ? jammed[i - 1].x0 + jammed[i - 1].b + gap + v.f : -5.4;
    });
    // Self-check over the whole loop (heading -x, so a front edge is x - f and a back edge x + b); the look check
    // fails on any console error, so a later edit that makes two vehicles touch cannot pass unnoticed.
    let closest = Infinity;
    for (let k = 0; k < 240; k++) {
      const X = v => v.x0 - L * crawl((k / 240) * D);
      jammed.forEach((v, i) => {
        const ahead = jammed[(i + jammed.length - 1) % jammed.length], shift = i ? 0 : -L;
        closest = Math.min(closest, X(v) - v.f - (X(ahead) + shift + ahead.b));
      });
    }
    if (closest < .2) console.error(`bridge-traffic: jammed vehicles come within ${closest.toFixed(2)} units`);
    const flowing = [car('#c9a03b'), jeepney('#7a5a9a', '#f4f0e6'), car('#b8322f')]
      .map((v, i) => { v.g.position.set(0, deck, -.72); return { ...v, x0: -5 + i * 4.3 }; });

    // Traffic enforcer on the sidewalk, facing the lanes.
    const enforcer = W.person(3.2, 1.62, '#f4f0e6', '#24406b', .95, '#b07c58');
    enforcer.root.position.y = 1.42; enforcer.root.rotation.y = Math.PI;
    const cap = ball(.15, '#24406b', 0, .09, -.01, enforcer.head); cap.scale.y = .45;
    box(.22, .02, .12, '#24406b', 0, .06, .12, enforcer.head);

    // A banca with outriggers drifting under the bridge.
    const banca = group(-2, .05, 0);
    box(1.2, .18, .3, '#e9e2cf', 0, .1, 0, banca);
    box(1.0, .05, .26, '#2f6f9c', 0, .2, 0, banca);
    for (const x of [-.3, .3]) box(.04, .04, 1.3, '#a98a5c', x, .2, 0, banca);
    for (const z of [-.62, .62]) box(1.1, .05, .06, '#a98a5c', 0, .12, z, banca);
    ball(.07, '#30363d', .35, .32, 0, banca);
    return { jammed, flowing, enforcer, banca };
  },
  tick({ t, parts, W }) {
    const show = (v, x) => { v.g.position.x = x; v.g.scale.setScalar(1 - W.smooth((Math.abs(x) - EDGE + .3) / .4)); };
    const stopped = crawlSpeed(t) * D < .35; // brake lights while the queue waits
    for (const v of parts.jammed) { show(v, wrap(v.x0 - L * crawl(t))); v.glow.scale.setScalar(stopped ? 1 : .01); }
    for (const v of parts.flowing) { show(v, wrap(v.x0 + (L * 2 * t) / D)); v.glow.scale.setScalar(.01); }
    // Facing -z, his right hand is on the -x side; it waves above the lane edge, clear of the jeepney roofs.
    const e = parts.enforcer, r = e.root.position, wave = Math.sin((t / D) * TAU * 4);
    W.plant(e, { crouch: .02, lean: .05, twist: .1 });
    W.reach(e, 1, [r.x - .2, r.y + 1.75 + .25 * Math.max(0, wave), r.z - .42 + .08 * wave]);
    W.reach(e, -1, [r.x + .12, r.y + .95, r.z - .05]);
    // Once across per loop, wrapping out of sight off the far edge, so it is back where it began when the loop does.
    const b = parts.banca, z = ((((t / D) * 6.8 + 3.4) % 6.8) + 6.8) % 6.8 - 3.4; // starts under the bridge, wraps mid-loop
    b.position.set(-2.1 + .15 * Math.sin((t / D) * TAU), .05 + .03 * Math.sin((t / D) * TAU * 3), z);
    b.rotation.y = Math.PI / 2;
    b.scale.setScalar(1 - W.smooth((Math.abs(z) - 3.1) / .3));
  },
});
