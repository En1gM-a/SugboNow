import { memo, useEffect, useRef, useState } from 'react';
import { useDisplay } from '@/lib/display';
import { ROAD } from '@/lib/landing/art';
import type { RoadStage } from '@/lib/landing/diorama/road/stage';
import { ROAD_SCENES } from '@/lib/landing/road';
import type { SkyScene } from '@/lib/skyControl';
import { html, Sym } from './parts';

interface RoadDioramaProps {
  play: boolean;
  /** The sky this happening wants while the road is on screen, and null when it isn't. */
  onSky: (sky: SkyScene | null) => void;
}

/**
 * One Cebu road in 3D, the whole width of the page, going through what can happen to it: each happening is a shot with its
 * own light and weather. It moves on by itself, and the buttons jump to any of them. three.js and the street load only when
 * it's near the screen; without WebGL the drawn road takes its place.
 */
export const RoadDiorama = memo(function RoadDiorama({ play, onSky }: RoadDioramaProps) {
  const { lite } = useDisplay();
  const strip = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const stage = useRef<RoadStage | null>(null);
  const [state, setState] = useState<'wait' | 'on' | 'none'>('wait');
  const [at, setAt] = useState(0);
  const [onScreen, setOnScreen] = useState(false);
  const latest = useRef({ play, lite });
  latest.current = { play, lite };

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    let gone = false;
    let idle = 0;
    const canIdle = 'requestIdleCallback' in window;
    const build = async () => {
      if (gone) return;
      try {
        const { mountRoad } = await import('@/lib/landing/diorama/road/stage');
        if (gone) return;
        const made = await mountRoad(el, {
          lite: latest.current.lite,
          onScene: setAt,
          onProgress: (part) => {
            if (fill.current) fill.current.style.transform = `scaleX(${part.toFixed(3)})`;
          },
        });
        if (gone) {
          made?.dispose();
          return;
        }
        stage.current = made;
        made?.setPlaying(latest.current.play);
        setState(made ? 'on' : 'none');
      } catch {
        if (!gone) setState('none');
      }
    };
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((en) => en.isIntersecting)) return;
        near.disconnect();
        idle = canIdle ? window.requestIdleCallback(build, { timeout: 1200 }) : window.setTimeout(build, 200);
      },
      { rootMargin: '1500px 0px' },
    );
    const seen = new IntersectionObserver((entries) => setOnScreen(entries[entries.length - 1].isIntersecting), { threshold: 0.12 });
    near.observe(el);
    seen.observe(el);
    return () => {
      gone = true;
      if (canIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      near.disconnect();
      seen.disconnect();
      stage.current?.dispose();
      stage.current = null;
    };
  }, []);

  useEffect(() => stage.current?.setPlaying(play), [play]);

  useEffect(() => {
    onSky(state === 'on' && onScreen ? ROAD_SCENES[at].sky : null);
  }, [state, onScreen, at, onSky]);
  useEffect(() => () => onSky(null), [onSky]);

  if (state === 'none') return <div className="lp-road" aria-hidden="true" dangerouslySetInnerHTML={html(ROAD)} />;

  return (
    <div className="lp-rd" data-on={state === 'on' ? '' : undefined}>
      <div ref={strip} className="lp-rd-strip" aria-hidden="true" />
      <div className="lp-rd-picks lp-night" role="group" aria-label="What happens on the road">
        {ROAD_SCENES.map((scene, i) => (
          <button key={scene.id} type="button" className="lp-rd-pick" aria-pressed={i === at} onClick={() => stage.current?.go(i)}>
            {i === at && <span ref={fill} className="lp-rd-fill" aria-hidden="true" />}
            <Sym href={scene.icon} />
            {scene.label}
          </button>
        ))}
      </div>
      {play && <p className="lp-rd-hint lp-night">Drag to look along the road. Tap a jeepney to say hi.</p>}
    </div>
  );
});
