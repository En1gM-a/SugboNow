import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppTabs } from '@/components/landing/AppTabs';
import { Checks } from '@/components/landing/Checks';
import { Explore } from '@/components/landing/Explore';
import { Journey, JourneyNote } from '@/components/landing/Journey';
import { LandingNav } from '@/components/landing/LandingNav';
import { Faq, FinalCta, HowItWorks, Kinetic, LandingFooter, MadeForCebu } from '@/components/landing/LowerSections';
import { Mornings } from '@/components/landing/Mornings';
import { html } from '@/components/landing/parts';
import '@/components/landing/landing.css';
import { useManilaTime } from '@/hooks/useManilaTime';
import { useDisplay } from '@/lib/display';
import { SPRITE } from '@/lib/landing/art';
import type { BriefId } from '@/lib/landing/data';
import type { ExploreEngine } from '@/lib/landing/exploreEngine';
import { PageMotion, type PageLayout } from '@/lib/landing/pageMotion';
import { skyGradient, type SkyWeather } from '@/lib/sky';
import { controlSky, releaseSky, type SkyScene } from '@/lib/skyControl';
import type { TimeName } from '@/lib/time';

/** What the sky does as you move down the page: one day in Cebu, top to bottom. */
const SECTION_SKY: Record<string, [TimeName, SkyWeather]> = {
  mornings: ['buntag', 'rain'],
  app: ['buntag', 'clear'],
  checks: ['udto', 'cloudy'],
  how: ['hapon', 'clear'],
  place: ['hapon', 'cloudy'],
  faq: ['gabii', 'clear'],
  start: ['gabii', 'clear'],
};

const NIGHT: SkyScene = { time: 'gabii', weather: 'clear' };

/**
 * The signed-out front door at /: what SugboNow does, shown on real Cebu happenings, with the way into sign up and sign
 * in. It calls no API and no outside source. Motion here goes beyond the app's rules on purpose; docs/handoffs/frontend.md
 * ("The landing page") lists the exceptions. Pausing or the device's reduced-motion setting still stops all of it.
 */
export default function LandingPage() {
  const display = useDisplay();
  const clock = useManilaTime();
  const [paused, setPaused] = useState(false);
  const [section, setSection] = useState('top');
  const [layout, setLayout] = useState<PageLayout>({ pin: false, tall: false });
  const [sceneSky, setSceneSky] = useState<SkyScene | null>(null);
  const [brief, setBrief] = useState<{ id: BriefId; flip: number }>({ id: 'rain', flip: 0 });

  const still = display.still || paused;
  const play = !still;

  const root = useRef<HTMLDivElement>(null);
  const explore = useRef<ExploreEngine | null>(null);
  const motion = useRef<PageMotion | null>(null);
  const latest = useRef({ still, reduced: display.still, section });
  latest.current = { still, reduced: display.still, section };
  const getStill = useCallback(() => latest.current.still, []);

  // The scene you're in, else the section you're reading, else the real clock.
  const sky = useMemo<SkyScene>(() => {
    if (section === 'top' && sceneSky) return sceneSky;
    const stop = SECTION_SKY[section];
    if (!still && stop) return { time: stop[0], weather: stop[1] };
    return { time: clock, weather: 'clear' };
  }, [section, sceneSky, still, clock]);
  const screenSky = useMemo(() => skyGradient(sky.time, sky.weather), [sky.time, sky.weather]);

  // Sample: the photos cover the sky, so it holds one dark frame, which still sets the page's tone. Inside one of the
  // hero's scenes the photos step away and that scene's own sky plays.
  const inScene = section === 'top' && sceneSky !== null;
  useEffect(() => {
    if (inScene && sceneSky) controlSky(sceneSky, paused);
    else controlSky(NIGHT, true);
  }, [inScene, sceneSky, paused]);
  useEffect(() => releaseSky, []);

  useLayoutEffect(() => {
    if (!root.current) return;
    const made = new PageMotion({
      root: root.current,
      getStill,
      getReduced: () => latest.current.reduced,
      onSection: setSection,
      onLayout: setLayout,
    });
    motion.current = made;
    made.start();
    return () => {
      made.destroy();
      motion.current = null;
    };
  }, [getStill]);

  useEffect(() => {
    motion.current?.syncStill();
  }, [still]);

  // This page loads after the router has looked for a #section to scroll to, so a shared link does it here.
  useEffect(() => {
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, []);

  const togglePause = useCallback(() => setPaused((on) => !on), []);
  const openExplore = useCallback(() => {
    // From further down the page, this link just takes you back to the map and its buttons. It only opens the map when you're already there.
    if (explore.current?.state.view === 'home' && latest.current.section === 'top') explore.current.toWall();
  }, []);
  const showBrief = useCallback((id: BriefId) => setBrief((cur) => ({ id, flip: cur.flip + 1 })), []);

  return (
    <div ref={root} className="lp" data-still={still ? '' : undefined} data-play={play ? '' : undefined} data-pin={layout.pin ? '' : undefined} data-tall={layout.tall ? '' : undefined}>
      <Journey section={section} away={inScene} />
      <svg className="lp-sprite" aria-hidden="true">
        <defs dangerouslySetInnerHTML={html(SPRITE)} />
      </svg>

      <LandingNav paused={paused} isDark={display.mode === 'dark'} onPause={togglePause} onExplore={openExplore} />

      <main id="main" className="lp-page-main" tabIndex={-1}>
        <Explore play={play} getStill={getStill} engineRef={explore} onSceneSky={setSceneSky} onBrief={showBrief} />
        <div className="lp-below">
          <Mornings brief={brief.id} flip={brief.flip} play={play} onPick={showBrief} />
          <Kinetic band="a" />
          <AppTabs pin={layout.pin} active={section === 'app'} still={still} sky={screenSky} />
          <Checks active={section === 'checks'} still={still} />
          <HowItWorks />
          <MadeForCebu play={play} />
          <Kinetic band="b" />
          <Faq />
          <FinalCta />
          <LandingFooter />
        </div>
      </main>
      <JourneyNote section={section} away={inScene} />
    </div>
  );
}
