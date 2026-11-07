// The landing page's page-wide motion, outside React: everything that follows the scroll position or the pointer, or
// runs on its own clock. Scrolling and pointer moves never cause a React render here; only a change of section or of
// the pinning layout reaches React, through the callbacks.

import { nudgeSky } from '@/lib/skyControl';
import { clockText, manilaSeconds, secondsLeft, type ScheduleName } from './schedules';

export const clampTo = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const SECTION_IDS = ['top', 'mornings', 'app', 'checks', 'how', 'place', 'faq', 'start'];

export interface PageLayout {
  /** The phones stay pinned while each stretch of scrolling is one tab. */
  pin: boolean;
  /** A window so tall that the hero and the phones don't need to fill it. */
  tall: boolean;
}

interface Options {
  root: HTMLElement;
  /** Nothing moves: the device or Profile's setting, or the page's own pause button. */
  getStill: () => boolean;
  /** The device or Profile's setting alone. Pausing shouldn't change the page's length under you. */
  getReduced: () => boolean;
  onSection: (id: string) => void;
  onLayout: (layout: PageLayout) => void;
}

export class PageMotion {
  private readonly o: Options;
  private readonly root: HTMLElement;
  private readonly xp: HTMLElement | null;
  private readonly rail: HTMLElement | null;
  private readonly track: HTMLElement | null;
  private readonly steps: HTMLElement | null;
  private readonly routeJeep: HTMLElement | null;
  private readonly navFill: HTMLElement | null;
  private readonly navJeep: HTMLElement | null;
  private readonly pill: HTMLElement | null;
  private readonly kinEls: HTMLElement[];
  private readonly stepEls: HTMLElement[];
  private readonly counters: Array<{ node: ChildNode | null; name: ScheduleName }>;

  private offs: Array<() => void> = [];
  private timers = new Set<number>();
  private observers: Array<IntersectionObserver | ResizeObserver> = [];
  private clock = 0;
  private probeClock = 0;
  private destroyed = false;

  private section = 'top';
  private pin = false;
  private tall = false;
  private pillHover: HTMLElement | null = null;

  private px: number | null = null;
  private py: number | null = null;
  private lastPointer: PointerEvent | null = null;
  private pointerRaf = 0;
  private magnetEl: HTMLElement | null = null;

  private railAnim: Animation | null = null;
  private railSet = 0;
  private railDur = 0;
  private railRate = 1;
  private railBoost = 0;
  private railHold = false;
  private railFocus = false;
  private railDrag = false;
  private railOff = false;
  private railIgnore: { x: number | null; y: number | null } | null = null;
  private liftEl: Element | null = null;

  private skew = 0;
  private skewTarget = 0;
  private lastSkew = '';
  private loopRaf = 0;

  private scrollDir = 1;
  private scrollV = 0;
  private lastY = 0;
  private lastT = 0;
  private lastScrollAt = 0;
  private scrollRaf = 0;

  constructor(options: Options) {
    this.o = options;
    const { root } = options;
    this.root = root;
    const find = (selector: string) => root.querySelector<HTMLElement>(selector);
    this.xp = find('.lp-xp');
    this.rail = find('.lp-rail');
    this.track = find('.lp-rail-track');
    this.steps = find('.lp-steps');
    this.routeJeep = find('.lp-route-jeep');
    this.navFill = find('.lp-nav-fill');
    this.navJeep = find('.lp-nav-jeep');
    this.pill = find('.lp-nav-pill');
    this.kinEls = Array.from(root.querySelectorAll<HTMLElement>('.lp-kin-skew'));
    this.stepEls = Array.from(root.querySelectorAll<HTMLElement>('.lp-step'));
    this.counters = Array.from(root.querySelectorAll<HTMLElement>('[data-next]')).map((el) => ({
      node: el.firstChild,
      name: el.getAttribute('data-next') as ScheduleName,
    }));
  }

  start() {
    this.bindPointer();
    this.bindRail();
    this.bindSections();
    this.tick();
    this.clock = window.setInterval(() => this.tick(), 1000);
    if (!this.o.getStill()) this.countUp();
    this.movePill();
    this.updateRoute();
    this.updateProgress();
    this.syncStill();
    // Web fonts change the widths the nav pill sits on.
    void document.fonts?.ready.then(() => {
      if (!this.destroyed) this.movePill();
    });
  }

  /** Things that depend on the window's size or on still mode. */
  syncStill() {
    const h = window.innerHeight;
    const w = this.xp ? this.xp.clientWidth : 0;
    const tall = h >= 1600;
    const pin = !this.o.getReduced() && !tall && w >= 900 && h >= 560;
    if (tall !== this.tall || pin !== this.pin) {
      this.tall = tall;
      this.pin = pin;
      this.o.onLayout({ pin, tall });
    }
    const still = this.o.getStill();
    if (still && this.railAnim) {
      this.railAnim.cancel();
      this.railAnim = null;
    } else if (!still && !this.railAnim) {
      this.buildRail();
    }
  }

  destroy() {
    this.destroyed = true;
    window.clearInterval(this.clock);
    window.clearInterval(this.probeClock);
    this.timers.forEach((t) => window.clearTimeout(t));
    this.offs.forEach((off) => off());
    this.observers.forEach((observer) => observer.disconnect());
    this.railAnim?.cancel();
    cancelAnimationFrame(this.loopRaf);
    cancelAnimationFrame(this.pointerRaf);
    cancelAnimationFrame(this.scrollRaf);
  }

  private on<K extends string>(el: EventTarget | null, type: K, fn: (e: never) => void, opts?: AddEventListenerOptions) {
    if (!el) return;
    el.addEventListener(type, fn as EventListener, opts);
    this.offs.push(() => el.removeEventListener(type, fn as EventListener, opts));
  }

  private later(ms: number, fn: () => void) {
    const t = window.setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
  }

  /* ---------- The pointer: magnets, the phones' tilt, clouds ---------- */
  private bindPointer() {
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      this.px = e.clientX;
      this.py = e.clientY;
      this.lastPointer = e;
      // Back on the mouse: keyboard focus left on the rail stops holding it, so nothing can stay stuck until the next click.
      if (this.railFocus) {
        this.railFocus = false;
        this.kick();
      }
      if (!this.pointerRaf) this.pointerRaf = requestAnimationFrame(this.flushPointer);
    };
    const leave = () => {
      this.px = null;
      this.py = null;
      this.railProbe();
      this.clearMagnet();
    };
    this.on(this.root, 'pointermove', move, { passive: true });
    this.on(this.root, 'pointerdown', move, { passive: true });
    this.on(this.root, 'pointerleave', leave);
    const nav = this.pill?.parentElement ?? null;
    this.on(nav, 'pointerover', (e: PointerEvent) => {
      const link = (e.target as Element).closest<HTMLElement>('.lp-nav-link');
      if (link) {
        this.pillHover = link;
        this.movePill();
      }
    });
    this.on(nav, 'pointerleave', () => {
      this.pillHover = null;
      this.movePill();
    });
  }

  private clearMagnet() {
    this.magnetEl?.style.setProperty('--tx', '0px');
    this.magnetEl?.style.setProperty('--ty', '0px');
    this.magnetEl = null;
  }

  private flushPointer = () => {
    this.pointerRaf = 0;
    this.railProbe();
    const e = this.lastPointer;
    if (!e || this.o.getStill()) return;
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const magnet = t.closest<HTMLElement>('.lp-magnet');
    if (magnet !== this.magnetEl) this.clearMagnet();
    this.magnetEl = magnet;
    if (magnet) {
      const r = magnet.getBoundingClientRect();
      magnet.style.setProperty('--tx', `${((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1)}px`);
      magnet.style.setProperty('--ty', `${((e.clientY - r.top - r.height / 2) * 0.22).toFixed(1)}px`);
    }
    const stage = t.closest<HTMLElement>('.lp-stage');
    if (stage) {
      const r = stage.getBoundingClientRect();
      stage.style.setProperty('--rx', `${((0.5 - (e.clientY - r.top) / r.height) * 7).toFixed(2)}deg`);
      stage.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 12).toFixed(2)}deg`);
    }
    nudgeSky.pointer(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
  };

  /* ---------- The Mornings rail: always heading right, and it waits when you reach for a card ---------- */
  private buildRail() {
    const track = this.track;
    if (!track || !track.animate || this.o.getStill()) return;
    const set = track.offsetWidth / 3;
    if (!set || (set === this.railSet && this.railAnim)) return;
    const dur = (set / 40) * 1000;
    const progress = this.railAnim ? ((this.railAnim.currentTime as number) % this.railDur) / this.railDur : 0;
    this.railAnim?.cancel();
    this.railSet = set;
    this.railDur = dur;
    this.railAnim = track.animate(
      [{ transform: `translate3d(${(-set).toFixed(1)}px, 0, 0)` }, { transform: 'translate3d(0, 0, 0)' }],
      { duration: dur, iterations: Infinity },
    );
    // Start deep into the loop, so a hard flick backwards can never run off the start of the animation.
    this.railAnim.currentTime = dur * (2000 + progress);
    this.railAnim.playbackRate = this.railRate;
    // The rate may have been caught part way down when this was paused, so let it ease back up.
    this.kick();
  }

  private nudgeRail(px: number) {
    if (!this.railAnim) return;
    this.railAnim.currentTime = (this.railAnim.currentTime as number) + px * (this.railDur / this.railSet);
  }

  private bindRail() {
    const rail = this.rail;
    if (!rail) return;
    this.buildRail();
    this.probeClock = window.setInterval(this.railProbe, 120);
    this.on(rail, 'focusin', () => {
      // Only keyboard focus stops the rail. A mouse click focuses it too, and that must not hold it until the next click elsewhere.
      this.railFocus = rail.matches(':focus-visible');
      this.kick();
    });
    this.on(rail, 'focusout', () => {
      this.railFocus = false;
      this.kick();
    });
    this.on(rail, 'keydown', (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      this.nudgeRail(e.key === 'ArrowRight' ? 342 : -342);
    });
    let d: { x: number; lx: number; lt: number; v: number; moved: boolean; id: number } | null = null;
    const finish = (e?: PointerEvent) => {
      if (!d || (e && e.pointerId !== d.id)) return;
      const { moved, v, lt } = d;
      d = null;
      rail.classList.remove('lp-dragging');
      this.railDrag = false;
      this.kick();
      if (!moved) return;
      // A flick carries on as speed, then eases back to the rail's own pace. If you stopped before letting go, there's no flick.
      const flicked = performance.now() - lt < 90;
      this.railRate = flicked ? clampTo(v * (this.railDur / this.railSet), -14, 14) : 0;
      // You're still on a card when you let go. The rail carries on anyway, and hover counts again once the cursor moves.
      this.railIgnore = { x: this.px, y: this.py };
    };
    this.on(rail, 'pointerdown', (e: PointerEvent) => {
      // A second finger doesn't take over from the first: its release would leave the first drag holding the rail for good.
      if (e.button !== 0 || !this.railAnim || (d && d.id !== e.pointerId)) return;
      d = { x: e.clientX, lx: e.clientX, lt: performance.now(), v: 0, moved: false, id: e.pointerId };
    });
    this.on(rail, 'dragstart', (e: Event) => e.preventDefault());
    // The button can come up where we can't hear it, with the cursor already off the rail. Catch that on the next move anywhere.
    this.on(
      window,
      'pointermove',
      (e: PointerEvent) => {
        if (d && e.pointerType === 'mouse' && e.buttons === 0) finish(e);
      },
      { passive: true },
    );
    this.on(rail, 'pointermove', (e: PointerEvent) => {
      if (!d || e.pointerId !== d.id) return;
      // The button came up somewhere we didn't hear about. Don't start a drag nobody is holding.
      if (e.pointerType === 'mouse' && e.buttons === 0) {
        finish(e);
        return;
      }
      if (!d.moved) {
        if (Math.abs(e.clientX - d.x) < 6) return;
        d.moved = true;
        this.railDrag = true;
        this.setLift(null);
        rail.classList.add('lp-dragging');
        try {
          rail.setPointerCapture(d.id);
        } catch {
          // The pointer may already be gone.
        }
        this.kick();
      }
      const now = performance.now();
      this.nudgeRail(e.clientX - d.lx);
      d.v = (e.clientX - d.lx) / Math.max(1, now - d.lt);
      d.lx = e.clientX;
      d.lt = now;
    });
    // Listen on the window: the button can come up anywhere, not only over the rail.
    this.on(window, 'pointerup', finish);
    this.on(window, 'pointercancel', finish);
    this.on(rail, 'lostpointercapture', finish);
  }

  /**
   * Which Mornings card is the cursor on? This asks the page directly on a timer, because hover and pointer events
   * don't fire when a card glides under a still cursor or the page scrolls under one.
   */
  private railProbe = () => {
    const rail = this.rail;
    if (!rail || (this.railOff && !this.liftEl)) return;
    let card: Element | null = null;
    const { px, py } = this;
    const scrolling = performance.now() - this.lastScrollAt < 130;
    if (px != null && py != null && !this.railDrag && !scrolling) {
      const ignore = this.railIgnore;
      if (ignore && ignore.x != null && ignore.y != null && Math.hypot(px - ignore.x, py - ignore.y) > 8) this.railIgnore = null;
      if (!this.railIgnore) {
        const r = rail.getBoundingClientRect();
        if (py >= r.top && py <= r.bottom && px >= r.left && px <= r.right) {
          const el = document.elementFromPoint(px, py);
          if (el && rail.contains(el)) card = el.closest('.lp-m-card');
        }
      }
    }
    this.setLift(card);
  };

  private setLift(card: Element | null) {
    if (card === this.liftEl) return;
    this.liftEl?.classList.remove('lp-lift');
    card?.classList.add('lp-lift');
    this.liftEl = card;
    this.railHold = !!card;
    this.kick();
  }

  private kick() {
    if (!this.loopRaf) this.loopRaf = requestAnimationFrame(this.motionLoop);
  }

  /** One small loop for the things that ease toward a target. It sleeps when they arrive. */
  private motionLoop = () => {
    this.loopRaf = 0;
    let busy = false;
    const anim = this.railAnim;
    if (anim) {
      const hold = this.railHold || this.railFocus || this.railDrag || this.railOff;
      const want = hold ? 0 : 1 + this.railBoost;
      this.railRate += (want - this.railRate) * (hold ? 0.17 : 0.08);
      if (Math.abs(want - this.railRate) < 0.004) this.railRate = want;
      else busy = true;
      anim.playbackRate = this.railRate;
      this.railBoost *= 0.93;
      if (this.railBoost < 0.01) this.railBoost = 0;
      else busy = true;
    }
    this.skewTarget *= 0.86;
    this.skew += (this.skewTarget - this.skew) * 0.2;
    if (Math.abs(this.skew) < 0.02 && Math.abs(this.skewTarget) < 0.02) this.skew = 0;
    else busy = true;
    const tf = this.skew ? `skewX(${this.skew.toFixed(2)}deg)` : '';
    if (tf !== this.lastSkew) {
      this.lastSkew = tf;
      this.kinEls.forEach((el) => {
        el.style.transform = tf;
      });
    }
    if (busy) this.kick();
  };

  /* ---------- Sections: the sky, the nav pill, the jeepney, and pausing what's off screen ---------- */
  private bindSections() {
    const sections = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting && this.section !== en.target.id) {
            this.section = en.target.id;
            this.movePill();
            this.o.onSection(en.target.id);
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) sections.observe(el);
    });
    const off = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        en.target.toggleAttribute('data-off', !en.isIntersecting);
        if (en.target.id === 'mornings') {
          this.railOff = !en.isIntersecting;
          this.kick();
        }
      });
    });
    // Scroll effects only attach near the screen, so the browser isn't holding hundreds of them at once.
    const near = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => en.target.toggleAttribute('data-near', en.isIntersecting));
      },
      { rootMargin: '420px 0px' },
    );
    this.root.querySelectorAll('.lp-xp, .lp-sec, .lp-final, .lp-foot, .lp-kin').forEach((el) => off.observe(el));
    this.root.querySelectorAll('.lp-sec, .lp-final, .lp-foot').forEach((el) => near.observe(el));
    this.observers.push(sections, off, near);

    this.lastY = window.scrollY;
    this.lastT = performance.now();
    const onScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      const dy = y - this.lastY;
      if (dy) {
        this.scrollDir = dy > 0 ? 1 : -1;
        this.lastScrollAt = now;
      }
      this.scrollV = dy / Math.max(1, now - this.lastT);
      this.lastY = y;
      this.lastT = now;
      if (this.scrollRaf) return;
      this.scrollRaf = requestAnimationFrame(() => {
        this.scrollRaf = 0;
        this.updateRoute();
        this.updateProgress();
        this.feedVelocity();
      });
    };
    this.on(window, 'scroll', onScroll, { passive: true });
    this.on(
      window,
      'resize',
      () => {
        onScroll();
        this.movePill();
        this.syncStill();
      },
      { passive: true },
    );
    if (this.xp) {
      const resized = new ResizeObserver(() => {
        this.movePill();
        this.syncStill();
        this.buildRail();
      });
      resized.observe(this.xp);
      this.observers.push(resized);
    }
  }

  /** How fast you scroll feeds the wind, the big type's lean and the rail's speed. The rail still only ever heads right. */
  private feedVelocity() {
    if (this.o.getStill()) return;
    const v = this.scrollV;
    this.skewTarget = clampTo(-v * 3.4, -9, 9);
    this.railBoost = Math.max(this.railBoost, Math.min(4, Math.abs(v) * 2));
    nudgeSky.wind(Math.abs(v));
    this.kick();
  }

  private updateProgress() {
    const fill = this.navFill;
    const jeep = this.navJeep;
    if (!fill || !jeep) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? clampTo(window.scrollY / max, 0, 1) : 0;
    const track = fill.parentElement?.clientWidth ?? 0;
    fill.style.transform = `scaleX(${p.toFixed(4)})`;
    jeep.style.transform = `translateX(${(p * (track - 30)).toFixed(1)}px)`;
    jeep.classList.toggle('lp-to-right', this.scrollDir >= 0);
  }

  private updateRoute() {
    const el = this.steps;
    const jeep = this.routeJeep;
    if (!el || !jeep) return;
    const r = el.getBoundingClientRect();
    if (r.bottom < -80 || r.top > window.innerHeight + 80) return;
    const travel = Math.max(0, r.height - 56);
    const y = clampTo(window.innerHeight * 0.55 - r.top, 0, travel);
    jeep.style.transform = `translateY(${y.toFixed(1)}px)`;
    // Scrolling back up, the jeepney turns around instead of reversing.
    jeep.classList.toggle('lp-up', this.scrollDir < 0);
    this.stepEls.forEach((step) => step.classList.toggle('lp-lit', step.offsetTop <= y + 28));
  }

  private movePill() {
    const pill = this.pill;
    const nav = pill?.parentElement;
    if (!pill || !nav) return;
    const link = this.pillHover ?? nav.querySelector<HTMLElement>(`[data-sec="${this.section}"]`);
    if (!link || !link.offsetWidth) {
      pill.style.opacity = '0';
      return;
    }
    pill.style.opacity = '1';
    pill.style.transform = `translateX(${link.offsetLeft}px) scaleX(${(link.offsetWidth / 100).toFixed(3)})`;
  }

  /* ---------- Live bits ---------- */
  private tick() {
    if (document.hidden) return;
    const now = manilaSeconds();
    this.counters.forEach((c) => {
      if (c.node) c.node.nodeValue = clockText(secondsLeft(c.name, now));
    });
  }

  /** The hero's "every 15 min" counts up once when the page opens. */
  private countUp() {
    const node = this.root.querySelector('[data-count]')?.firstChild;
    if (!node) return;
    node.nodeValue = '0';
    this.later(550, () => {
      const start = performance.now();
      const step = (now: number) => {
        if (this.destroyed) return;
        const p = clampTo((now - start) / 1100, 0, 1);
        node.nodeValue = String(Math.round(15 * (1 - Math.pow(1 - p, 4))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    this.later(1800, () => {
      node.nodeValue = '15';
    });
  }
}
