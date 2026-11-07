// The Explore hero: a camera over a drawn map of Cebu that you can drag, zoom and step into. The camera, the drag and the
// tour live here, outside React, because they run every frame. React renders from `state` and calls the methods below.

import { clampTo } from './pageMotion';
import { SCENES, type BriefId } from './data';

export type ExploreView = 'home' | 'wall' | 'scene';
export type ExploreFilter = 'all' | 'Weather' | 'Traffic';

export interface ExploreState {
  view: ExploreView;
  /** The happening you're inside, when the view is 'scene'. */
  active: number;
  filter: ExploreFilter;
  /** Each happening's dial, from 0 to 1. */
  amounts: Record<string, number>;
  /** Counts scene changes, so the copy's entrance replays. */
  flip: number;
  /** The happening the camera has brought into view without stepping inside. */
  peek: number;
  /** The "drag the map" hint goes away for good once you've done anything here. */
  hinted: boolean;
  /** At home on a mid-size window, which cards fit beside the hero copy. Null means all of them. */
  fits: boolean[] | null;
  /** The tour's own pause button. */
  tourPaused: boolean;
}

export function initialExploreState(): ExploreState {
  return {
    view: 'home',
    active: 0,
    filter: 'all',
    amounts: Object.fromEntries(SCENES.map((s) => [s.id, s.amt])),
    flip: 0,
    peek: 0,
    hinted: false,
    fits: null,
    tourPaused: false,
  };
}

interface Cam {
  x: number;
  y: number;
  s: number;
}

interface Drag {
  id: number;
  sx: number;
  sy: number;
  cx: number;
  cy: number;
  lx: number;
  ly: number;
  lt: number;
  vx: number;
  vy: number;
  moved: boolean;
}

interface Options {
  xp: HTMLElement;
  world: HTMLElement;
  getStill: () => boolean;
  onState: (state: ExploreState) => void;
  /** Stepping into a happening also turns the Mornings section's sample brief to that kind of day. */
  onBrief: (brief: BriefId) => void;
}

const WORLD = { w: 2400, h: 1240 };
/** Where all of Cebu sits in the world: the middle of the province, its northern tip, and its height. */
const ISLE = { cx: 1234, top: 62, h: 1096 };
/** At home the map and its six happenings stay beside the hero copy: where the leftmost card starts, and how wide they span. */
const HOME_LEFT = 492;
const HOME_SPAN = 1342;
/** Explore moves on by itself this often. */
const TOUR_MS = 3500;

const xf = (c: Cam) => `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, 0) scale(${c.s.toFixed(4)})`;

/** A spring as a CSS easing, so the camera settles the way a real thing does. */
const SPRING = (() => {
  const zeta = 0.86;
  const omega = 11;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const v = 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
    pts.push(v.toFixed(4));
  }
  pts[40] = '1';
  return `linear(${pts.join(', ')})`;
})();

export class ExploreEngine {
  state: ExploreState = initialExploreState();

  private readonly o: Options;
  private readonly xp: HTMLElement;
  private readonly world: HTMLElement;
  private cam: Cam = { x: 0, y: 0, s: 0.7 };
  private wallCam: Cam | null = null;
  private flight: Animation | null = null;
  private drag: Drag | null = null;
  private glideRaf = 0;
  private justDragged = false;
  private afterCommit: (() => void) | null = null;
  private fitKey = 'all';

  private elapsed = 0;
  private tourRaf = 0;
  private tourLast = 0;
  private lastFill = '';
  private tourFill: HTMLElement | null = null;
  private hold = false;
  private press = false;
  private focused = false;
  private off = false;

  private offs: Array<() => void> = [];
  private timers = new Set<number>();
  private observers: Array<IntersectionObserver | ResizeObserver> = [];
  private destroyed = false;

  constructor(options: Options) {
    this.o = options;
    this.xp = options.xp;
    this.world = options.world;
  }

  start() {
    this.tourFill = this.xp.querySelector<HTMLElement>('.lp-tour-fill');
    this.cam = this.camFor('home');
    this.applyCam();
    this.syncHomeFit();
    // The hero copy changes height once its font arrives, and on a phone the map sits right under it.
    void document.fonts?.ready.then(() => {
      if (this.destroyed) return;
      this.syncHomeFit();
      if (this.state.view === 'home' && !this.flight) {
        this.cam = this.camFor('home');
        this.applyCam();
      }
    });
    this.bindStage();
    this.bindVisibility();
    this.startTour();
  }

  destroy() {
    this.destroyed = true;
    this.timers.forEach((t) => window.clearTimeout(t));
    this.offs.forEach((off) => off());
    this.observers.forEach((observer) => observer.disconnect());
    this.flight?.cancel();
    cancelAnimationFrame(this.tourRaf);
    cancelAnimationFrame(this.glideRaf);
  }

  /** React calls this once it has committed a state change, so focus can move onto what just became interactive. */
  committed() {
    const then = this.afterCommit;
    this.afterCommit = null;
    then?.();
  }

  private set(patch: Partial<ExploreState>, then?: () => void) {
    this.state = { ...this.state, ...patch };
    if (then) this.afterCommit = then;
    this.o.onState(this.state);
  }

  private on<K extends string>(el: EventTarget, type: K, fn: (e: never) => void) {
    el.addEventListener(type, fn as EventListener);
    this.offs.push(() => el.removeEventListener(type, fn as EventListener));
  }

  /* ---------- The tour: Explore moves on every 3.5 seconds, and waits while you're using what's in front of you ---------- */
  private startTour() {
    if (this.tourRaf || this.off) return;
    this.tourLast = performance.now();
    this.tourRaf = requestAnimationFrame(this.tourFrame);
  }

  private tourFrame = (now: number) => {
    this.tourRaf = 0;
    const dt = Math.min(100, now - this.tourLast);
    this.tourLast = now;
    const waiting = this.state.tourPaused || this.o.getStill() || this.hold || this.press || this.focused || this.drag;
    if (!waiting) {
      this.elapsed += dt;
      if (this.elapsed >= TOUR_MS) {
        this.elapsed -= TOUR_MS;
        this.tourAdvance();
      }
    }
    if (this.tourFill) {
      const p = clampTo(this.elapsed / TOUR_MS, 0, 1).toFixed(3);
      if (p !== this.lastFill) {
        this.lastFill = p;
        this.tourFill.style.transform = `scaleX(${p})`;
      }
    }
    if (!this.off) this.tourRaf = requestAnimationFrame(this.tourFrame);
  };

  private tourAdvance() {
    if (this.state.view === 'scene') this.openScene((this.state.active + 1) % SCENES.length, { auto: true });
    else this.stepPeek(1);
  }

  private visibleScenes(): number[] {
    const { filter, view, fits } = this.state;
    const list = SCENES.map((_, i) => i).filter((i) => filter === 'all' || SCENES[i].kind === filter);
    if (view !== 'home' || !fits) return list;
    const shown = list.filter((i) => fits[i]);
    return shown.length ? shown : list;
  }

  /**
   * At home, a card that would run off the screen or under the hero copy waits until you open the map. On a phone
   * there's no room around the island, so one card at a time takes the open water in its south-east.
   */
  private syncHomeFit() {
    const { W, H } = this.size();
    const cam = this.camFor('home');
    if (W < 900) {
      const w = Math.min(W * 0.5, 200);
      const h = w * 0.675;
      const sx = W - w / 2 - 12;
      // Just south of Metro Cebu, so the card never covers the pin it belongs to.
      const sy = Math.min(H - h / 2 - 44, cam.y + 720 * cam.s + 10 + h / 2);
      this.world.style.setProperty('--slot-x', ((sx - cam.x) / cam.s).toFixed(1));
      this.world.style.setProperty('--slot-y', ((sy - cam.y) / cam.s).toFixed(1));
      this.world.style.setProperty('--slot-w', (w / cam.s).toFixed(1));
      if (this.state.fits) this.set({ fits: null });
      return;
    }
    const left = Math.max(16, (W - 1200) / 2) + 490;
    const next = SCENES.map((sc) => {
      const c = sc.card;
      return cam.x + c.x * cam.s >= left && cam.x + (c.x + c.w) * cam.s <= W - 8;
    });
    const all = next.every(Boolean);
    const key = all ? 'all' : next.map(Number).join('');
    if (key !== this.fitKey) {
      this.fitKey = key;
      this.set({ fits: all ? null : next });
    }
  }

  private stepPeek(dir: number) {
    const list = this.visibleScenes();
    const at = list.indexOf(this.state.peek);
    const from = at < 0 ? (dir > 0 ? -1 : 0) : at;
    this.peekTo(list[(from + dir + list.length) % list.length]);
  }

  /** Bring one happening into view without stepping inside it. */
  private peekTo(i: number) {
    const { W, H } = this.size();
    const { view } = this.state;
    const narrow = W < 900;
    const c = SCENES[i].card;
    this.set({ peek: i });
    if (view === 'home') {
      // All of Cebu stays in view at home. The camera only leans a little toward the happening.
      if (narrow) return;
      const home = this.camFor('home');
      const lean = 0.045 * home.s;
      this.flyTo({ x: home.x + (ISLE.cx - (c.x + c.w / 2)) * lean, y: home.y + (ISLE.top + ISLE.h / 2 - (c.y + c.h / 2)) * lean, s: home.s }, { ms: 1600 });
      return;
    }
    const s = this.cam.s;
    const fx = narrow ? W / 2 : (W + 390) / 2;
    const fy = narrow ? H * 0.34 : H / 2;
    this.flyTo(this.clampCam({ x: fx - (c.x + c.w / 2) * s, y: fy - (c.y + c.h / 2) * s, s }), { ms: 1000 });
    if (narrow && view === 'wall') {
      const list = this.xp.querySelector('.lp-hap-list');
      const row = document.getElementById(`row-${SCENES[i].id}`)?.parentElement;
      if (list instanceof HTMLElement && row) list.scrollTo({ left: row.offsetLeft - list.offsetLeft, behavior: this.o.getStill() ? 'auto' : 'smooth' });
    }
  }

  /* ---------- The camera ---------- */
  private size() {
    return { W: this.xp.clientWidth, H: this.xp.clientHeight };
  }

  private camFor(view: ExploreView, i = 0): Cam {
    const { W, H } = this.size();
    const narrow = W < 900;
    if (view === 'home') {
      if (narrow) {
        // On a phone the whole island sits under the hero copy, in whatever room is left.
        const copy = this.xp.querySelector<HTMLElement>('.lp-hero-copy');
        const top = copy ? copy.offsetTop + copy.offsetHeight + 14 : H * 0.5;
        const s = clampTo((H - top - 64) / ISLE.h, 0.2, 0.46);
        return { x: W / 2 - ISLE.cx * s, y: top - ISLE.top * s, s };
      }
      const left = Math.max(16, (W - 1200) / 2) + 500;
      const s = clampTo(Math.min((H - 148) / ISLE.h, (W - 22 - left) / HOME_SPAN), 0.42, 0.62);
      return { x: left - HOME_LEFT * s, y: (H - ISLE.h * s) / 2 - ISLE.top * s + 10, s };
    }
    if (view === 'wall') {
      if (narrow) {
        const s = clampTo((H - 372) / ISLE.h, 0.28, 0.46);
        return this.clampCam({ x: W / 2 - ISLE.cx * s, y: 132 - ISLE.top * s, s });
      }
      const s = clampTo((H - 40) / WORLD.h, 0.56, 0.7);
      return this.clampCam({ x: (W + 390) / 2 - ISLE.cx * s, y: (H - WORLD.h * s) / 2 + 6, s });
    }
    const c = SCENES[i].card;
    if (narrow) {
      // On a phone the story takes the lower half, so the subject sits in the top half and fades into the sky.
      const sn = Math.max(W / c.w, (H * 0.66) / c.h) * 1.04;
      const xn = clampTo(W / 2 - (c.x + c.w * c.fxn) * sn, W - (c.x + c.w) * sn, -c.x * sn);
      const yn = Math.min(H * 0.27 - (c.y + c.h * c.fyn) * sn, -c.y * sn);
      return { x: xn, y: yn, s: sn };
    }
    const s = Math.max(W / c.w, H / c.h) * 1.04;
    let x = W / 2 - (c.x + c.w * c.fx) * s;
    let y = H / 2 - (c.y + c.h * c.fy) * s;
    x = clampTo(x, W - (c.x + c.w) * s, -c.x * s);
    y = clampTo(y, H - (c.y + c.h) * s, -c.y * s);
    return { x, y, s };
  }

  private clampCam(c: Cam): Cam {
    const { W, H } = this.size();
    const padX = Math.max(180, W * 0.42);
    const padY = W < 900 ? H * 0.56 : 180;
    const ww = WORLD.w * c.s;
    const wh = WORLD.h * c.s;
    const x = ww + padX * 2 <= W ? (W - ww) / 2 : clampTo(c.x, W - ww - padX, padX);
    const y = wh + padY * 2 <= H ? (H - wh) / 2 : clampTo(c.y, H - wh - padY, padY);
    return { x, y, s: c.s };
  }

  private applyCam() {
    this.world.style.transform = xf(this.cam);
  }

  private currentCam(): Cam {
    const raw = getComputedStyle(this.world).transform;
    if (!raw || raw === 'none') return this.cam;
    const m = new DOMMatrixReadOnly(raw);
    return { x: m.e, y: m.f, s: m.a };
  }

  private stopGlide() {
    cancelAnimationFrame(this.glideRaf);
    this.glideRaf = 0;
  }

  private flyTo(target: Cam, opts: { ms?: number; swoop?: boolean } = {}) {
    const { ms = 850, swoop = false } = opts;
    const el = this.world;
    this.stopGlide();
    const from = this.flight ? this.currentCam() : this.cam;
    if (this.flight) {
      this.flight.cancel();
      this.flight = null;
    }
    this.cam = target;
    this.applyCam();
    // The towns of Metro Cebu are too close together to name until you've zoomed in.
    el.toggleAttribute('data-near', target.s >= 1.3);
    if (this.o.getStill() || !el.animate) return;
    const frames: Keyframe[] = [{ transform: xf(from) }, { transform: xf(target) }];
    if (swoop) {
      const { W, H } = this.size();
      const a = { x: (W / 2 - from.x) / from.s, y: (H / 2 - from.y) / from.s };
      const b = { x: (W / 2 - target.x) / target.s, y: (H / 2 - target.y) / target.s };
      const s = Math.max(0.5, Math.min(from.s, target.s) * 0.34);
      frames.splice(1, 0, { transform: xf({ x: W / 2 - ((a.x + b.x) / 2) * s, y: H / 2 - ((a.y + b.y) / 2) * s, s }) });
    }
    el.classList.add('lp-flying');
    const anim = el.animate(frames, { duration: ms, easing: swoop ? 'cubic-bezier(0.65, 0, 0.35, 1)' : SPRING });
    this.flight = anim;
    const done = () => {
      if (this.flight === anim) {
        this.flight = null;
        el.classList.remove('lp-flying');
      }
    };
    anim.onfinish = done;
    anim.oncancel = done;
  }

  /* ---------- Views ---------- */
  toWall = () => {
    const from = this.state.view;
    this.elapsed = 0;
    this.set({ view: 'wall', peek: from === 'scene' ? this.state.active : this.state.peek, hinted: true }, () => {
      const el = from === 'scene' ? document.getElementById(`row-${SCENES[this.state.active].id}`) : document.getElementById('wall-h');
      el?.focus({ preventScroll: true });
    });
    this.flyTo(from === 'scene' && this.wallCam ? this.wallCam : this.camFor('wall'), { ms: from === 'scene' ? 700 : 900 });
  };

  toHome = () => {
    this.elapsed = 0;
    this.set({ view: 'home', filter: 'all', peek: this.state.peek < 0 ? 0 : this.state.peek }, () => {
      this.xp.querySelector<HTMLElement>('.lp-btn-explore')?.focus({ preventScroll: true });
    });
    this.flyTo(this.camFor('home'), { ms: 800 });
  };

  /**
   * You've moved on to the rest of the page, so Explore goes back to the map and its two buttons. It's out of sight by
   * now, so nothing flies, and it doesn't pull your focus or your scroll back up here.
   */
  private resetExplore() {
    this.elapsed = 0;
    this.hold = false;
    this.focused = false;
    this.press = false;
    this.wallCam = null;
    if (this.drag) {
      this.drag = null;
      this.xp.classList.remove('lp-dragging');
    }
    this.stopGlide();
    if (this.flight) {
      this.flight.cancel();
      this.flight = null;
    }
    const { view, filter, tourPaused } = this.state;
    if (view !== 'home' || filter !== 'all' || tourPaused) this.set({ view: 'home', filter: 'all', tourPaused: false, peek: 0 });
    this.cam = this.camFor('home');
    this.applyCam();
  }

  private openScene(i: number, opts: { auto?: boolean; keepFocus?: boolean } = {}) {
    const { auto = false, keepFocus = false } = opts;
    const was = this.state.view;
    if (was === 'wall') this.wallCam = this.cam;
    const sc = SCENES[i];
    if (!auto) this.elapsed = 0;
    this.o.onBrief(sc.brief);
    // The tour never takes your focus, and Next and Previous keep it on the button you just pressed.
    const focusTitle = auto || keepFocus ? undefined : () => document.getElementById('scene-h')?.focus({ preventScroll: true });
    this.set({ view: 'scene', active: i, flip: this.state.flip + 1, peek: -1, hinted: true }, focusTitle);
    this.flyTo(this.camFor('scene', i), was === 'scene' ? { ms: 1000, swoop: true } : { ms: 950 });
  }

  private stepScene(dir: number) {
    this.elapsed = 0;
    if (this.state.view === 'scene') this.openScene((this.state.active + dir + SCENES.length) % SCENES.length, { keepFocus: true });
    else this.stepPeek(dir);
  }

  prevScene = () => this.stepScene(-1);
  nextScene = () => this.stepScene(1);

  toggleTour = () => {
    this.elapsed = 0;
    this.set({ tourPaused: !this.state.tourPaused });
  };

  openCard = (i: number) => {
    if (!this.justDragged) this.openScene(i);
  };

  peekRow = (i: number) => {
    if (this.state.view !== 'wall' || i === this.state.peek) return;
    this.elapsed = 0;
    this.peekTo(i);
  };

  setFilter = (filter: ExploreFilter) => {
    this.elapsed = 0;
    this.set({ filter, peek: -1 });
  };

  private zoom(by: number) {
    const { W, H } = this.size();
    const s = clampTo(this.cam.s * by, 0.26, 3);
    this.elapsed = -4000;
    const wx = (W / 2 - this.cam.x) / this.cam.s;
    const wy = (H / 2 - this.cam.y) / this.cam.s;
    this.flyTo(this.clampCam({ x: W / 2 - wx * s, y: H / 2 - wy * s, s }), { ms: 420 });
  }

  zoomIn = () => this.zoom(1.5);
  zoomOut = () => this.zoom(1 / 1.5);

  onKey = (e: { key: string; target: EventTarget; preventDefault(): void }) => {
    const { view } = this.state;
    if (e.key === 'Escape') {
      if (view === 'scene') this.toWall();
      else if (view === 'wall') this.toHome();
      return;
    }
    if ((e.target as Element).tagName === 'INPUT') return;
    if (view === 'scene' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      this.stepScene(e.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if (view === 'wall') {
      const moves: Record<string, [number, number]> = { ArrowLeft: [150, 0], ArrowRight: [-150, 0], ArrowUp: [0, 110], ArrowDown: [0, -110] };
      const move = moves[e.key];
      if (move) {
        e.preventDefault();
        this.elapsed = -4000;
        this.flyTo(this.clampCam({ x: this.cam.x + move[0], y: this.cam.y + move[1], s: this.cam.s }), { ms: 360 });
      }
    }
  };

  setAmount = (value: number) => {
    const id = SCENES[this.state.active].id;
    this.set({ amounts: { ...this.state.amounts, [id]: value } });
  };

  /* ---------- Drag the world. A short drag is a look around; a long one moves you from the hero into the map. ---------- */
  private bindStage() {
    const { xp } = this;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || this.state.view === 'scene') return;
      if ((e.target as Element).closest('.lp-hud a, .lp-hud button, .lp-hud input, .lp-wall-panel')) return;
      this.stopGlide();
      if (this.flight) {
        this.cam = this.currentCam();
        this.flight.cancel();
        this.flight = null;
        this.applyCam();
      }
      this.drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: this.cam.x, cy: this.cam.y, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0, moved: false };
    };
    const move = (e: PointerEvent) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (!d.moved) {
        if (Math.hypot(dx, dy) < 7) return;
        d.moved = true;
        xp.classList.add('lp-dragging');
        try {
          xp.setPointerCapture(d.id);
        } catch {
          // The pointer may already be gone.
        }
        if (this.state.view === 'home' || !this.state.hinted) this.set({ view: 'wall', hinted: true });
      }
      const now = performance.now();
      const dt = Math.max(1, now - d.lt);
      d.vx = (e.clientX - d.lx) / dt;
      d.vy = (e.clientY - d.ly) / dt;
      d.lx = e.clientX;
      d.ly = e.clientY;
      d.lt = now;
      this.cam = this.clampCam({ x: d.cx + dx, y: d.cy + dy, s: this.cam.s });
      this.applyCam();
    };
    const up = (e: PointerEvent) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      xp.classList.remove('lp-dragging');
      if (!d.moved) return;
      // You were looking around, so the tour gives you a few extra seconds before it moves the map again.
      this.elapsed = -4000;
      this.justDragged = true;
      const t = window.setTimeout(() => {
        this.timers.delete(t);
        this.justDragged = false;
      }, 0);
      this.timers.add(t);
      if (e.type === 'pointerup' && !this.o.getStill()) this.glide(d.vx * 16, d.vy * 16);
    };
    this.on(xp, 'pointerdown', down);
    this.on(xp, 'pointermove', move);
    this.on(xp, 'pointerup', up);
    this.on(xp, 'pointercancel', up);
    // The tour waits while the cursor is on something you might be reading or reaching for.
    this.on(xp, 'pointerover', (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      this.hold = !!(e.target as Element).closest('.lp-hap, .lp-wall-panel, .lp-trip, .lp-scene-copy, .lp-xp-dock, .lp-xp-tools, .lp-hero-cta');
    });
    this.on(xp, 'pointerleave', () => {
      this.hold = false;
    });
    this.on(xp, 'pointerdown', (e: PointerEvent) => {
      if ((e.target as Element).closest('.lp-trip, .lp-wall-panel, .lp-xp-dock')) this.press = true;
    });
    const release = () => {
      this.press = false;
    };
    this.on(window, 'pointerup', release);
    this.on(window, 'pointercancel', release);
    this.on(xp, 'focusin', (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      this.focused = el.id !== 'scene-h' && el.id !== 'wall-h' && el.matches(':focus-visible');
    });
    this.on(xp, 'focusout', () => {
      this.focused = false;
    });
    const resized = new ResizeObserver(() => {
      this.syncHomeFit();
      if (this.flight) return;
      this.cam = this.state.view === 'scene' ? this.camFor('scene', this.state.active) : this.camFor(this.state.view);
      this.applyCam();
    });
    resized.observe(xp);
    this.observers.push(resized);
  }

  private glide(startX: number, startY: number) {
    let vx = startX;
    let vy = startY;
    const step = () => {
      vx *= 0.93;
      vy *= 0.93;
      if (Math.abs(vx) < 0.3 && Math.abs(vy) < 0.3) {
        this.glideRaf = 0;
        return;
      }
      this.cam = this.clampCam({ x: this.cam.x + vx, y: this.cam.y + vy, s: this.cam.s });
      this.applyCam();
      this.glideRaf = requestAnimationFrame(step);
    };
    this.glideRaf = requestAnimationFrame(step);
  }

  private bindVisibility() {
    const seen = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        this.off = !en.isIntersecting;
        if (en.isIntersecting) this.startTour();
      });
    });
    seen.observe(this.xp);
    // Past the point where only the last bit of Explore shows, you've moved on. A window taller than the hero never gets here.
    const away = new IntersectionObserver(
      (entries) => {
        const en = entries[entries.length - 1];
        if (en.intersectionRatio < 0.2 && en.boundingClientRect.top < 0) this.resetExplore();
      },
      { threshold: [0, 0.2] },
    );
    away.observe(this.xp);
    this.observers.push(seen, away);
  }
}
