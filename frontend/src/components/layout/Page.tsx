import { useEffect, useState, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EntranceContext, usePageEntrance } from '@/lib/entrance';
import { cx, vars } from '@/utils/cx';

/**
 * A signed-in page: it plays its entrance when it opens (full on the first open, quick after), then settles. Content
 * that mounts later, like the next stories in a feed or a tab opened again, just appears.
 */
export function Page({ name, className, children }: { name: string; className?: string; children: ReactNode }) {
  const entrance = usePageEntrance(name);
  const [settled, setSettled] = useState(false);
  const playing = entrance.start !== null && entrance.mode !== 'none';

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setSettled(true), 2200);
    return () => window.clearTimeout(timer);
  }, [playing]);

  return (
    <EntranceContext.Provider value={entrance}>
      <div className={cx('page', className)} data-entrance={playing && !settled ? entrance.mode : undefined}>
        {children}
      </div>
    </EntranceContext.Provider>
  );
}

/** Shown while a page's code loads, so the screen is never blank. */
export function PageSkeleton() {
  return (
    <div className="page" aria-hidden="true">
      {[0, 1].map((k) => (
        <div key={k} className="card glass post-skel" style={vars({ '--i': k })}>
          <Skeleton className="skel-line w-36" />
          <Skeleton className="skel-row" />
          <Skeleton className="skel-line w-64" />
        </div>
      ))}
    </div>
  );
}
