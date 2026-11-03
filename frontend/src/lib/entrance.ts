// First-open entrances (handoff <motion>). A page plays its full entrance the first time it opens after sign-in and a
// quick one on later visits. While the jeepney's smoke covers the screen, the next page waits under it and starts
// its entrance as the smoke clears.

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { useDisplay } from './display';

export type EntranceMode = 'first' | 'again' | 'none';

export interface Entrance {
  mode: EntranceMode;
  /** performance.now() when the entrance started, or null while it waits under the smoke. */
  start: number | null;
}

const seenPages = new Set<string>();

export const pages = {
  seen: (page: string) => seenPages.has(page),
  mark: (page: string) => {
    seenPages.add(page);
  },
  /** Called on sign-out, so every page plays its full entrance again next time. */
  forget: () => seenPages.clear(),
};

let held = false;
let resolveDrawn: (() => void) | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const gate = {
  /** Holds the next page's entrance; resolves once that page has drawn its first frame. */
  hold(): Promise<void> {
    held = true;
    emit();
    return new Promise((resolve) => {
      resolveDrawn = resolve;
    });
  },
  release() {
    held = false;
    emit();
  },
};

/** Pages call this when they mount. The log-in ride waits for it before clearing its smoke. */
export function reportFirstFrame() {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      resolveDrawn?.();
      resolveDrawn = null;
    }),
  );
}

export function useGateHeld(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => held,
  );
}

export const EntranceContext = createContext<Entrance>({ mode: 'none', start: null });

export function useEntrance(): Entrance {
  return useContext(EntranceContext);
}

/**
 * The entrance for one page: full on its first open, quick after, none in still mode. It starts when the page mounts,
 * or, when the page opens under the log-in smoke, as the smoke clears.
 */
export function usePageEntrance(page: string): Entrance {
  const { still } = useDisplay();
  const isHeld = useGateHeld();
  const [mode] = useState<EntranceMode>(() => (still ? 'none' : pages.seen(page) ? 'again' : 'first'));
  const [start, setStart] = useState<number | null>(() => (held ? null : performance.now()));

  useEffect(() => {
    pages.mark(page);
    reportFirstFrame();
  }, [page]);

  useEffect(() => {
    if (!isHeld && start === null) setStart(performance.now());
  }, [isHeld, start]);

  return { mode, start };
}
