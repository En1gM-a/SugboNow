import { useEffect, useRef } from 'react';
import { createRelief, progress, stopMarks, STOPS } from '@/lib/landing/relief';

interface ReliefProps {
  section: string;
  /** The hero is showing one of its scenes, which brings its own sky. */
  away: boolean;
  /** Still mode or reduced motion: one still frame per section, no travel. */
  still: boolean;
}

/** Sample, not for merging: the photo journey's place, as a flight over a paper Cebu that follows the scroll. */
export function Relief({ section, away, still }: ReliefProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ section, away, still });
  live.current = { section, away, still };
  const redraw = useRef(() => {});

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const relief = createRelief(el);
    let frame = 0;
    let last = '';
    const draw = () => {
      frame = 0;
      const { section, away, still } = live.current;
      if (away) return;
      const s = still ? Math.max(0, STOPS.findIndex((stop) => stop.at === section)) : progress(window.scrollY, stopMarks(), window.innerHeight);
      const scroll = still ? 0 : window.scrollY;
      // Nothing to change, nothing to draw: a still frame is drawn once per section.
      const key = `${s} ${scroll} ${el.width} ${el.height}`;
      if (key === last) return;
      last = key;
      relief.draw(s, scroll);
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      el.width = Math.round(el.clientWidth * dpr);
      el.height = Math.round(el.clientHeight * dpr);
      last = '';
      queue();
    };
    redraw.current = queue;
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    window.addEventListener('scroll', queue, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', queue);
    };
  }, []);

  useEffect(() => redraw.current(), [section, away, still]);

  return (
    <div className="lp-journey" data-away={away ? '' : undefined} aria-hidden="true">
      <canvas ref={canvas} className="lp-relief" />
      <div className="lp-j-grade" />
    </div>
  );
}
