// The jeepney ride (rebuilt from jeepIn, jeepRev, jeepOut, pose and jeepSmoke in docs/handoffs/frontend-sample.html,
// with the same timings). The jeepney pulls in from the right edge, stops and coughs out three puffs, then floors it
// off the screen while its smoke covers the auth card (switching forms) or the whole screen (logging in).
// This module loads with a dynamic import after the first paint (see rideBridge.ts).

import { animate } from 'motion';
import { JEEP } from './jeepArt';
import { createSmoke } from './smoke';

interface Jeep {
  root: HTMLElement;
  body: HTMLElement;
  wheels: HTMLElement[];
  x: number;
  y: number;
  scale: number;
  tilt: number;
  shake: number;
  /** Bumped by every new ride, so a jeepney still driving off from the last one stops instead of fighting it. */
  run: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

let jeep: Jeep | null = null;
let smoke: ReturnType<typeof createSmoke> | null = null;
let smokeHost: HTMLElement | null = null;

function setup() {
  const lane = document.getElementById('jeep-lane');
  const host = document.getElementById('smoke');
  if (!lane || !host) throw new Error('The jeepney ride needs #jeep-lane and #smoke in the root layout.');
  if (!jeep || !lane.contains(jeep.root)) {
    lane.innerHTML = JEEP;
    const root = lane.querySelector<HTMLElement>('.jeep')!;
    jeep = {
      root,
      body: root.querySelector<HTMLElement>('.jeep-body')!,
      wheels: Array.from(root.querySelectorAll<HTMLElement>('.wheel')),
      x: 0,
      y: 0,
      scale: 1,
      tilt: 0,
      shake: 0,
      run: 0,
    };
  }
  if (!smoke || smokeHost !== host) {
    smoke = createSmoke(host);
    smokeHost = host;
  }
  return { lane, j: jeep, puffs: smoke };
}

/** Places the jeepney; its wheels turn and its body bounces with the distance traveled. */
function pose(j: Jeep, x: number) {
  j.x = x;
  j.root.style.transform = `translate(${x}px,${j.y}px) scale(${j.scale})`;
  const turn = (x / (Math.PI * 20 * j.scale)) * 360;
  j.wheels.forEach((w) => (w.style.transform = `rotate(${turn}deg)`));
  j.body.style.transform = `translateY(${Math.sin(x / (6 * j.scale)) * 0.9 + j.shake}px) rotate(${j.tilt}deg)`;
}

const tail = (j: Jeep) => ({ x: j.x + 150 * j.scale, y: j.y + 53 * j.scale });

/**
 * 0–0.3 s: pulls in from just off the right edge, its wheels on the card's bottom edge (at most 8px above the bottom of
 * the screen). On wide screens it passes behind the glass card and stops 18px left of it; on phones it drives in front
 * of the card and stops in the middle of the screen. Then it moves in front of its own smoke.
 */
function pullIn(lane: HTMLElement, j: Jeep, card: HTMLElement): Promise<void> {
  const run = ++j.run;
  const r = card.getBoundingClientRect();
  const wide = window.innerWidth >= 900;
  j.scale = wide ? 1.3 : 1;
  j.tilt = 0;
  j.shake = 0;
  j.y = Math.min(r.bottom, window.innerHeight - 8) + j.scale - 70 * j.scale;
  const x0 = window.innerWidth + 10;
  const x1 = wide ? r.left - 18 - 150 * j.scale : (window.innerWidth - 150 * j.scale) / 2;
  lane.style.zIndex = wide ? '1' : '3';
  pose(j, x0);
  j.root.style.visibility = 'visible';
  return new Promise((resolve) => {
    animate(x0, x1, {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (x) => {
        if (run === j.run) pose(j, x);
      },
    }).then(() => {
      if (run === j.run) lane.style.zIndex = '90';
      resolve();
    });
  });
}

/** 0.3–0.44 s: the stop. The nose dips 2.4° and comes back, the body shakes, and three small puffs come out. */
function stop(j: Jeep, puffs: ReturnType<typeof createSmoke>): Promise<void> {
  const run = j.run;
  const t = tail(j);
  let next = 0;
  return new Promise((resolve) => {
    animate(0, 1, {
      duration: 0.14,
      onUpdate: (v) => {
        if (run !== j.run) return;
        j.tilt = -2.4 * Math.sin(Math.PI * v);
        j.shake = Math.sin(v * 40) * (1 - v) * 1.2;
        pose(j, j.x);
        if (v >= next) {
          next += 0.34;
          puffs.puff(t.x, t.y, rand(9, 13) * j.scale);
        }
      },
    }).then(() => {
      if (run === j.run) {
        j.tilt = 0;
        j.shake = 0;
        pose(j, j.x);
      }
      resolve();
    });
  });
}

/** 0.44–0.84 s: floors it to the left and off the screen, leaving one small puff every 46px of road, then hides. */
function driveOff(lane: HTMLElement, j: Jeep, puffs: ReturnType<typeof createSmoke>): Promise<void> {
  const run = j.run;
  const x0 = j.x;
  const x1 = -150 * j.scale - 30;
  const ty = tail(j).y;
  let lastPuff = x0;
  return new Promise((resolve) => {
    animate(x0, x1, {
      duration: 0.4,
      ease: [0.5, 0, 0.9, 0.4],
      onUpdate: (x) => {
        if (run !== j.run) return;
        j.tilt = 2.2 * Math.sin(Math.PI * Math.min(1, (x0 - x) / 180));
        pose(j, x);
        while (lastPuff - x >= 46) {
          lastPuff -= 46;
          const px = lastPuff + 150 * j.scale;
          if (px > -20) puffs.puff(px, ty + rand(-4, 4), rand(12, 22) * j.scale);
        }
      },
    }).then(() => {
      if (run === j.run) {
        j.root.style.visibility = 'hidden';
        lane.style.zIndex = '';
      }
      resolve();
    });
  });
}

/** Runs the ride and resolves the moment the area is covered; the jeepney keeps driving off on its own. */
async function ride(card: HTMLElement, wholeScreen: boolean): Promise<void> {
  const { lane, j, puffs } = setup();
  await pullIn(lane, j, card);
  const r = card.getBoundingClientRect();
  const t = tail(j);
  const area = wholeScreen
    ? { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight, n: 56 }
    : { x: r.left, y: r.top, w: r.width, h: r.height, n: 34 };
  const covered = puffs.cover(area, t.x, t.y, wholeScreen ? 0.42 : 0.3);
  void stop(j, puffs).then(() => driveOff(lane, j, puffs));
  await covered;
}

/** Sign in ↔ sign up: the card is covered 0.6 s after the press. */
export const coverCard = (card: HTMLElement) => ride(card, false);

/** Logging in: the whole screen is covered 0.72 s after the jeepney starts. */
export const coverScreen = (card: HTMLElement) => ride(card, true);

/** The cloud pops away (about 0.36 s). */
export function clearSmoke(): Promise<void> {
  return smoke ? smoke.clear() : Promise.resolve();
}
