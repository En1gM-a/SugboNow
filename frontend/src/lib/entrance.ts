// First-open entrances (handoff <motion>): a page plays its full entrance the first time it opens after sign-in, and a
// quick one on later visits.

import { createContext, useContext, useEffect, useState } from 'react';
import { useDisplay } from './display';

export type EntranceMode = 'first' | 'again' | 'none';

export interface Entrance {
  mode: EntranceMode;
  /** performance.now() when the page's entrance started; number reels and count-ups are timed from it. */
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

export const EntranceContext = createContext<Entrance>({ mode: 'none', start: null });

export function useEntrance(): Entrance {
  return useContext(EntranceContext);
}

/** The entrance for one page: full on its first open, quick after, none in still mode. It starts when the page mounts. */
export function usePageEntrance(page: string): Entrance {
  const { still } = useDisplay();
  const [mode] = useState<EntranceMode>(() => (still ? 'none' : pages.seen(page) ? 'again' : 'first'));
  const [start] = useState(() => performance.now());

  useEffect(() => {
    pages.mark(page);
  }, [page]);

  return { mode, start };
}
