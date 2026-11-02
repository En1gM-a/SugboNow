import { useEffect, useRef } from 'react';
import { useManilaTime } from '@/hooks/useManilaTime';
import { useDisplay } from '@/lib/display';
import { createSky, type SkyHandle, type SkyWeather } from '@/lib/sky';

/** Lets light glass rise when the sky is dark, and keeps the page background and theme-color on the sky's top color. */
function applyTone(tone: 'dark' | 'light', top: string) {
  const root = document.documentElement;
  root.dataset.tone = tone;
  root.style.setProperty('--page-bg', top);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', top);
}

/**
 * The live Cebu sky behind the whole app (handoff <design_system>, The sky). It starts after the first paint, pauses
 * while the tab is hidden, and in still mode draws one frame and redraws only when the time or the weather changes.
 */
export function Sky({ weather }: { weather: SkyWeather }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sky = useRef<SkyHandle | null>(null);
  const time = useManilaTime();
  const { lite, still } = useDisplay();
  const latest = useRef({ time, weather, lite, still });
  latest.current = { time, weather, lite, still };

  useEffect(() => {
    let cancelled = false;
    const begin = () => {
      if (cancelled || !canvas.current) return;
      const handle = createSky(canvas.current, applyTone);
      const now = latest.current;
      handle.setLite(now.lite);
      handle.setStill(now.still);
      handle.setTarget(now.time, now.weather);
      sky.current = handle;
    };
    const idle = 'requestIdleCallback' in window;
    const id = idle ? window.requestIdleCallback(begin, { timeout: 1200 }) : window.setTimeout(begin, 200);
    return () => {
      cancelled = true;
      if (idle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
      sky.current?.destroy();
      sky.current = null;
    };
  }, []);

  useEffect(() => {
    sky.current?.setTarget(time, weather);
  }, [time, weather]);

  useEffect(() => {
    sky.current?.setLite(lite);
  }, [lite]);

  useEffect(() => {
    sky.current?.setStill(still);
  }, [still]);

  return <canvas ref={canvas} className="sky" aria-hidden="true" />;
}
