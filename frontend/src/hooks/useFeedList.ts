// Feed behavior (handoff <scrolling>): new items wait behind a pill, and more cards appear as the end comes into view.

import { useEffect, useRef, useState } from 'react';

/**
 * New content after a refetch never moves what the reader is looking at. Items that arrive later are held back and
 * counted, until showNew() lets them in. Changing `key` (a filter) starts over, once `ready` says the data is for it.
 */
export function useHeldList<T extends { id: string }>(list: T[] | undefined, key: string, ready: boolean) {
  const [held, setHeld] = useState<{ key: string; ids: Set<string> } | null>(null);

  // Adjusting state during render: React re-renders at once, before anything paints.
  if (list && ready && held?.key !== key) setHeld({ key, ids: new Set(list.map((item) => item.id)) });

  const ids = held?.key === key ? held.ids : null;
  const visible = !list ? [] : ids ? list.filter((item) => ids.has(item.id)) : list;
  const newCount = list && ids ? list.filter((item) => !ids.has(item.id)).length : 0;

  const showNew = () => {
    if (list) setHeld({ key, ids: new Set(list.map((item) => item.id)) });
  };

  return { visible, newCount, showNew };
}

/**
 * Calls onReveal when the returned element comes near the viewport. `depends` re-arms it after each reveal: an observer
 * only fires when the element crosses the edge, and it may still be in view.
 */
export function useRevealOnScroll(onReveal: () => void, enabled: boolean, depends: number) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef(onReveal);

  useEffect(() => {
    latest.current = onReveal;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) latest.current();
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, depends]);

  return ref;
}
