import { useEffect, useRef, useState } from 'react';
import { useDisplay } from '@/lib/display';
import { easeCount, tween } from '@/lib/ease';
import { useEntrance } from '@/lib/entrance';

/**
 * Count-ups (handoff: useCountUp; sample: countTo) for small stats. On a page's first open the value counts up from 0
 * over 1.1 s, starting `delay` ms after the page's entrance; later changes count from the old value to the new one
 * (700 ms). Returns the number to show.
 */
export function useCountUp(value: number, delay = 0): number {
  const { mode, start } = useEntrance();
  const { still } = useDisplay();
  const [shown, setShown] = useState(() => (mode === 'first' && !still ? 0 : value));
  const counted = useRef<number | null>(null);

  useEffect(() => {
    if (still || (mode !== 'first' && counted.current === null)) {
      counted.current = value;
      setShown(value);
      return;
    }
    const from = counted.current;
    if (from === value) return;
    if (from === null && start === null) return; // waiting for the entrance
    const wait = from === null ? Math.max(0, (start ?? 0) + delay - performance.now()) : 0;
    const stop = tween(from ?? 0, value, from === null ? 1100 : 700, easeCount, setShown, wait);
    counted.current = value;
    return () => {
      stop();
      counted.current = from;
    };
  }, [value, mode, start, still, delay]);

  return shown;
}
