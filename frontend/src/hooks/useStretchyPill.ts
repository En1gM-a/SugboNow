import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useDisplay } from '@/lib/display';
import { easeOut, tween } from '@/lib/ease';

interface Insets {
  /** Insets along the axis: the two edges that stretch. */
  a: number;
  b: number;
  /** Insets across the axis. */
  c: number;
  d: number;
}

/**
 * The stretchy mango pill behind the active tab (handoff <motion>; sample: slidePill). The pill is a full-size element
 * clipped with clip-path: inset(... round ...). When it moves, the leading edge arrives first (360 ms) and the trailing
 * edge catches up (550 ms), so it stretches and then settles. Tabs are the box's [data-tab] children. Pass the number of
 * tabs as `count` when they can arrive later: a box that fills its parent doesn't change size when they do.
 */
export function useStretchyPill(axis: 'x' | 'y', active: number, radius: number, count?: number) {
  const box = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const current = useRef<Insets | null>(null);
  const running = useRef<Array<() => void>>([]);
  const { still } = useDisplay();

  const place = useCallback(
    (animate: boolean) => {
      const container = box.current;
      const shape = pill.current;
      if (!container || !shape) return;
      const tab = container.querySelectorAll<HTMLElement>('[data-tab]')[active];
      // Hidden at this screen size, or not a tab page: no pill.
      if (!tab || container.offsetParent === null) {
        shape.style.opacity = '0';
        current.current = null;
        return;
      }
      shape.style.opacity = '1';
      const r = container.getBoundingClientRect();
      const t = tab.getBoundingClientRect();
      // Screen sizes include any scale on an ancestor, such as a card's entrance (scale .96) or a page's exit, but the
      // clip-path is drawn in the box's own pixels. Dividing by that scale keeps the pill on its tab once it ends.
      const sx = container.offsetWidth ? r.width / container.offsetWidth : 1;
      const sy = container.offsetHeight ? r.height / container.offsetHeight : 1;
      const left = (t.left - r.left) / sx;
      const right = (r.right - t.right) / sx;
      const top = (t.top - r.top) / sy;
      const bottom = (r.bottom - t.bottom) / sy;
      const next: Insets = axis === 'x' ? { a: left, b: right, c: top, d: bottom } : { a: top, b: bottom, c: left, d: right };
      const write = (v: Insets) => {
        shape.style.clipPath =
          axis === 'x'
            ? `inset(${v.c}px ${v.b}px ${v.d}px ${v.a}px round ${radius}px)`
            : `inset(${v.a}px ${v.d}px ${v.b}px ${v.c}px round ${radius}px)`;
      };
      running.current.forEach((stop) => stop());
      running.current = [];
      const prev = current.current;
      current.current = next;
      if (!animate || !prev || still) {
        write(next);
        return;
      }
      const live = { ...prev, c: next.c, d: next.d };
      const forward = next.a > prev.a;
      running.current = [
        tween(prev.a, next.a, forward ? 550 : 360, easeOut, (v) => {
          live.a = v;
          write(live);
        }),
        tween(prev.b, next.b, forward ? 360 : 550, easeOut, (v) => {
          live.b = v;
          write(live);
        }),
      ];
    },
    [active, axis, radius, still],
  );

  const latest = useRef(place);

  useLayoutEffect(() => {
    latest.current = place;
    place(true);
  }, [place]);

  useLayoutEffect(() => {
    latest.current(false);
  }, [count]);

  // Follow the box's size: the window resizing, the rail or tab bar appearing at its breakpoint, or a segmented
  // control's options arriving from the API. Only a real change counts: the observer also fires once when it starts,
  // and placing the pill then would cancel a stretch that has just begun.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let size = '';
    const observer = new ResizeObserver(([entry]) => {
      const next = `${entry.contentRect.width}x${entry.contentRect.height}`;
      if (size && size !== next) latest.current(false);
      size = next;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Stop a running stretch only on unmount. A cleanup tied to `place` would run on every tab change, right after the
  // layout effect started the new stretch, and cancel it before it moved: the pill stayed one tab behind.
  useEffect(() => () => running.current.forEach((stop) => stop()), []);

  return { box, pill };
}
