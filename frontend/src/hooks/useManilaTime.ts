import { useEffect, useState } from 'react';
import { timeName, type TimeName } from '@/lib/time';

/** The Manila time of day, checked every 30 s. It also keeps <html data-time> current for the first-paint colors. */
export function useManilaTime(): TimeName {
  const [time, setTime] = useState<TimeName>(() => timeName());

  useEffect(() => {
    const id = window.setInterval(() => setTime(timeName()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.time = time;
  }, [time]);

  return time;
}
