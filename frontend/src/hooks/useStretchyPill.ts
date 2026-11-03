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
 * edge catches up (550 ms), so it stretches and then settles. Tabs are the box's [data-tab] children.
 */
export function useStretchyPill(axis: 'x' | 'y', active: number, radius: number) {
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
      const next: Insets =
        axis === 'x'
          ? { a: t.left - r.left, b: r.right - t.right, c: t.top - r.top, d: r.bottom - t.bottom }
          : { a: t.top - r.top, b: r.bottom - t.bottom, c: t.left - r.left, d: r.right - t.right };
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

  useLayoutEffect(() => {
    place(true);
  }, [place]);

  useEffect(() => {
    const onResize = () => place(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [place]);

  // Stop a running stretch only on unmount. In the effect above, the cleanup would run on every tab change, right
  // after the layout effect started the new stretch, and cancel it before it moved: the pill stayed one tab behind.
  useEffect(() => () => running.current.forEach((stop) => stop()), []);

  return { box, pill };
}
