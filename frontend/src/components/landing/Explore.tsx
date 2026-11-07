import { Fragment, memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { HAP_ART, MAP_BASE, PINS } from '@/lib/landing/art';
import { SCENES, type BriefId, type Scene } from '@/lib/landing/data';
import { ExploreEngine, initialExploreState, type ExploreFilter } from '@/lib/landing/exploreEngine';
import type { SkyMix } from '@/lib/sky';
import type { SkyScene } from '@/lib/skyControl';
import { cx } from '@/utils/cx';
import { html, Ic, Sym, vars, Words } from './parts';

const FILTERS: ExploreFilter[] = ['all', 'Weather', 'Traffic'];
const LEDE = "SugboNow checks Cebu traffic, weather, floods and your mayor's posts, then tells you when to leave for every trip.";

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const tierOf = (amount: number) => (amount < 0.34 ? 0 : amount < 0.67 ? 1 : 2);

/** What a happening does to the example trip, at this position of its dial. */
function tripFor(scene: Scene, amount: number) {
  const tier = tierOf(amount);
  const delay = Math.round(lerp(scene.delay[0], scene.delay[1], amount));
  const stay = scene.stayAt !== undefined && tier >= scene.stayAt;
  const today = scene.trip.base + delay;
  const leave = scene.trip.arrive - today;
  const h24 = Math.floor(leave / 60);
  const h12 = h24 % 12 || 12;
  const m = leave % 60;
  return {
    tier,
    delay,
    stay,
    today,
    clock: `${h12}:${String(m).padStart(2, '0')}`,
    h12,
    m,
    ampm: h24 >= 12 ? 'PM' : 'AM',
    value: Math.round(amount * 100),
  };
}

/** The line of today's trip time on the little chart: it rises with the delay. */
function chartFor(delay: number) {
  const peak = 40 - delay * 0.62;
  const y = (base: number, by: number) => (base - delay * by).toFixed(1);
  return { peak, d: `M0 ${y(62, 0.14)}C60 ${y(58, 0.26)} 110 ${y(46, 0.5)} 160 ${peak.toFixed(1)}S260 ${y(50, 0.42)} 320 ${y(60, 0.2)}` };
}

const Hap = memo(function Hap({ scene, i, cls, amount, onOpen }: { scene: Scene; i: number; cls: string; amount: string; onOpen: (i: number) => void }) {
  const c = scene.card;
  return (
    <button
      type="button"
      id={`hap-${scene.id}`}
      className={cx('lp-hap', cls)}
      aria-label={`Step into: ${scene.title}, ${scene.place}, ${scene.date}`}
      onClick={() => onOpen(i)}
      style={vars({
        left: `${c.x}px`,
        top: `${c.y}px`,
        width: `${c.w}px`,
        height: `${c.h}px`,
        '--amt': amount,
        '--i': i,
        '--cx': c.x + c.w / 2,
        '--cy': c.y + c.h / 2,
        '--cw': c.w,
      })}
      dangerouslySetInnerHTML={html(HAP_ART[scene.id])}
    />
  );
});

interface ExploreProps {
  play: boolean;
  getStill: () => boolean;
  engineRef: RefObject<ExploreEngine | null>;
  onSceneSky: (scene: SkyScene | null) => void;
  onBrief: (brief: BriefId) => void;
}

/** The hero: the headline over a drawn map of Cebu, which opens into a list of real happenings you can step inside. */
export const Explore = memo(function Explore({ play, getStill, engineRef, onSceneSky, onBrief }: ExploreProps) {
  const [ui, setUi] = useState(initialExploreState);
  const xpRef = useRef<HTMLElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const engine = engineRef;
  const openCard = useCallback((i: number) => engine.current?.openCard(i), [engine]);

  // Before the first paint, so the map never shows at the wrong place.
  useLayoutEffect(() => {
    if (!xpRef.current || !worldRef.current) return;
    const made = new ExploreEngine({ xp: xpRef.current, world: worldRef.current, getStill, onState: setUi, onBrief });
    engine.current = made;
    made.start();
    return () => {
      made.destroy();
      engine.current = null;
    };
  }, [engine, getStill, onBrief]);

  useLayoutEffect(() => {
    engine.current?.committed();
  }, [engine, ui]);

  const { view, active, amounts } = ui;
  useEffect(() => {
    if (view !== 'scene') {
      onSceneSky(null);
      return;
    }
    const sc = SCENES[active];
    const mix: SkyMix = {};
    for (const [key, range] of Object.entries(sc.sky.mix)) mix[key as keyof SkyMix] = lerp(range[0], range[1], amounts[sc.id]);
    onSceneSky({ time: sc.sky.time, weather: sc.sky.weather, mix });
  }, [view, active, amounts, onSceneSky]);

  const cardClasses = SCENES.map((sc, i) => {
    const dim = ui.filter !== 'all' && sc.kind !== ui.filter;
    return cx(view === 'scene' && active === i && 'lp-on', dim && 'lp-dim', ui.peek === i && 'lp-peek', view === 'home' && ui.fits && !ui.fits[i] && 'lp-away');
  });

  const scene = SCENES[active];
  const trip = tripFor(scene, amounts[scene.id]);
  const chart = chartFor(trip.delay);
  const copyFlip = play ? (ui.flip % 2 ? 'a' : 'b') : undefined;

  return (
    <section className="lp-xp" id="top" ref={xpRef} data-view={view} aria-labelledby="hero-h" onKeyDown={(e) => engine.current?.onKey(e)}>
      <div className="lp-xp-clip">
        <div className="lp-xp-drift">
          <div className="lp-xp-world" ref={worldRef} inert={view === 'scene'}>
            <svg className="lp-map" viewBox="0 0 2400 1240" aria-hidden="true">
              <g dangerouslySetInnerHTML={html(MAP_BASE)} />
              {PINS.map((pin, i) => (
                <g key={pin.id} className={cx('lp-pin', cardClasses[i])}>
                  <path className="lp-pin-line" d={pin.line} />
                  <circle className="lp-pin-pulse" cx={pin.cx} cy={pin.cy} r="6.5" fill="#ffc233" />
                  <circle className="lp-pin-dot" cx={pin.cx} cy={pin.cy} r="5.6" fill="#ffc233" stroke="#0e1726" strokeWidth="1.6" />
                </g>
              ))}
            </svg>
            {SCENES.map((sc, i) => (
              <Hap key={sc.id} scene={sc} i={i} cls={cardClasses[i]} amount={amounts[sc.id].toFixed(3)} onOpen={openCard} />
            ))}
          </div>
        </div>
      </div>
      <div className="lp-shade lp-shade-home" aria-hidden="true" />
      <div className="lp-shade lp-shade-wall" aria-hidden="true" />
      <div className="lp-shade lp-shade-scene" aria-hidden="true" />

      <div className="lp-hud lp-hud-home" inert={view !== 'home'}>
        <div className="lp-hud-home-in">
          <div className="lp-hero-copy">
            <h1 id="hero-h" className="lp-display" data-rise={play ? 'big' : undefined}>
              {['Know', 'when', 'to', 'leave,'].map((word, i) => (
                <Fragment key={word}>
                  <span className="lp-w">
                    <span style={vars({ '--wi': i })}>{word}</span>
                  </span>{' '}
                </Fragment>
              ))}
              <span className="lp-sr-only">rain or shine.</span>
              <span className="lp-rot" aria-hidden="true">
                {['rain or shine.', 'haze or flood.', 'heat or storm.'].map((phrase, i) => (
                  <span key={phrase} className="lp-rot-p" style={vars({ '--r': i })}>
                    {phrase}
                  </span>
                ))}
              </span>
            </h1>
            <p className="lp-lede">
              <Words text={LEDE} />
            </p>
            <div className="lp-hero-cta" data-enter="" style={vars({ '--k': 1 })}>
              <Link className="lp-btn lp-btn-primary lp-magnet" to="/signup">
                Get started
                <Ic name="caret-right" />
              </Link>
              <button type="button" className="lp-btn lp-btn-explore lp-magnet" onClick={() => engine.current?.toWall()}>
                Explore Cebu
                <Ic name="arrow-up-right" />
              </button>
            </div>
            <p className="lp-facts" data-enter="" style={vars({ '--k': 2 })}>
              Traffic checked every{' '}
              <b className="lp-tnum">
                <span data-count="">15</span> min
              </b>{' '}
              · Your brief is ready by{' '}
              <b className="lp-tnum">
                <span className="lp-reel">
                  <span className="lp-sr-only">5:30</span>
                  <span className="lp-reel-row" aria-hidden="true">
                    <span className="lp-reel-d">
                      <span className="lp-reel-s" style={vars({ '--d': 5, '--n': 0 })} />
                    </span>
                    <span className="lp-reel-c">:</span>
                    <span className="lp-reel-d">
                      <span className="lp-reel-s" style={vars({ '--d': 3, '--n': 1 })} />
                    </span>
                    <span className="lp-reel-d">
                      <span className="lp-reel-s" style={vars({ '--d': 0, '--n': 2 })} />
                    </span>
                  </span>
                </span>{' '}
                AM
              </b>
            </p>
          </div>
        </div>
        <p className={cx('lp-hint', ui.hinted && 'lp-gone')}>
          <span className="lp-hint-dot" aria-hidden="true" />
          Drag the map, or tap a happening to step inside
        </p>
        <Link className="lp-scroll-cue" to="#mornings">
          See what it catches
          <Ic name="caret-down" />
        </Link>
      </div>

      <div className="lp-hud lp-hud-wall" inert={view !== 'wall'}>
        <div className="lp-wall-panel lp-glass">
          <div className="lp-wall-head">
            <h2 id="wall-h" className="lp-wall-h" tabIndex={-1}>
              Explore what slows Cebu down
            </h2>
            <button type="button" className="lp-btn lp-btn-icon" aria-label="Close the map" onClick={() => engine.current?.toHome()}>
              <Ic name="x" />
            </button>
          </div>
          <p className="lp-wall-sub">Real events from the last two years. Step into one and see what it does to your morning.</p>
          <div className="lp-filters" role="group" aria-label="Filter happenings">
            {FILTERS.map((f) => (
              <button key={f} type="button" className="lp-chip" aria-pressed={ui.filter === f} onClick={() => engine.current?.setFilter(f)}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
          <ul className="lp-hap-list">
            {SCENES.map((sc, i) => (
              <li key={sc.id} hidden={ui.filter !== 'all' && sc.kind !== ui.filter}>
                <button
                  type="button"
                  id={`row-${sc.id}`}
                  className={cx('lp-hap-row', ui.peek === i && 'lp-peek')}
                  onClick={() => engine.current?.openCard(i)}
                  onMouseEnter={() => engine.current?.peekRow(i)}
                  onFocus={() => engine.current?.peekRow(i)}
                >
                  <Sym href={sc.icon} />
                  <span className="lp-hap-row-main">
                    <b>{sc.short}</b>
                    <small>{sc.place}</small>
                  </span>
                  <span className="lp-tag lp-tag-quiet">{sc.date}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="lp-xp-legend">Real coastline, simplified roads. Scenes are drawn. Events are real.</p>
        </div>
        <div className="lp-xp-tools">
          <button type="button" className="lp-btn lp-btn-icon lp-on-sky" aria-label="Zoom out" onClick={() => engine.current?.zoomOut()}>
            <Ic name="minus" />
          </button>
          <button type="button" className="lp-btn lp-btn-icon lp-on-sky" aria-label="Zoom in" onClick={() => engine.current?.zoomIn()}>
            <Ic name="plus" />
          </button>
        </div>
      </div>

      <div className="lp-hud lp-hud-scene" inert={view !== 'scene'}>
        <div className="lp-scene-wrap">
          <div className="lp-scene-grid">
            <div className="lp-scene-copy" data-flip={copyFlip}>
              <h2 id="scene-h" className="lp-scene-title" tabIndex={-1} data-rise={copyFlip}>
                {scene.title.split(' ').map((word, i) => (
                  <Fragment key={`${scene.id}-${i}`}>
                    <span className="lp-w">
                      <span style={vars({ '--wi': i })}>{word}</span>
                    </span>{' '}
                  </Fragment>
                ))}
              </h2>
              <p className="lp-scene-place">{scene.place}</p>
              <p className="lp-scene-line">{scene.line}</p>
              <p className="lp-scene-real">
                {scene.real}{' '}
                {scene.srcs.map((src) => (
                  <Fragment key={src.u}>
                    <a href={src.u} target="_blank" rel="noopener noreferrer">
                      {src.t}
                    </a>{' '}
                  </Fragment>
                ))}
              </p>
            </div>
            <aside className="lp-trip lp-night" aria-label="Your trip in this example">
              <div className="lp-trip-top">
                <h3 className="lp-card-title">{scene.trip.label}</h3>
                <span className={cx('lp-tag', trip.stay ? 'lp-sev-high' : 'lp-tag-mango')}>{trip.stay ? 'Stay home' : `+${trip.delay} min · ${scene.why}`}</span>
              </div>
              {trip.stay ? (
                <p className="lp-big lp-stay">Walay klase</p>
              ) : (
                <p className="lp-big lp-tnum">
                  <small>Leave by</small>
                  <span className="lp-reel lp-reel-live">
                    <span className="lp-sr-only">{trip.clock}</span>
                    <span className="lp-reel-row" aria-hidden="true">
                      <span className={cx('lp-reel-d', trip.h12 < 10 && 'lp-is-off')}>
                        <span className="lp-reel-s" style={vars({ '--d': Math.floor(trip.h12 / 10), '--n': 0 })} />
                      </span>
                      <span className="lp-reel-d">
                        <span className="lp-reel-s" style={vars({ '--d': trip.h12 % 10, '--n': 0 })} />
                      </span>
                      <span className="lp-reel-c">:</span>
                      <span className="lp-reel-d">
                        <span className="lp-reel-s" style={vars({ '--d': Math.floor(trip.m / 10), '--n': 1 })} />
                      </span>
                      <span className="lp-reel-d">
                        <span className="lp-reel-s" style={vars({ '--d': trip.m % 10, '--n': 2 })} />
                      </span>
                    </span>
                  </span>{' '}
                  {trip.ampm}
                </p>
              )}
              <p className="lp-route">{trip.stay ? "Your mayor's post says classes are suspended. Stay home." : scene.trip.route}</p>
              <p className="lp-usual">{trip.stay ? `Usually ${scene.trip.base} min · no trip today` : `Usually ${scene.trip.base} min · today ${trip.today} min`}</p>
              <figure className="lp-trip-chart" aria-hidden="true">
                <svg viewBox="0 0 320 76">
                  <path d="M0 62C60 58 110 46 160 40S260 50 320 60" fill="none" stroke="rgba(200,213,230,0.55)" strokeWidth="2.5" strokeLinecap="round" />
                  <path d={chart.d} fill="none" stroke="#ffc233" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="160" cy={chart.peak.toFixed(1)} r="4.5" fill="#ffc233" />
                  <text x="160" y={(chart.peak - 9).toFixed(1)} textAnchor="middle" fontSize="11" fontWeight="800" fill="#eef3fa">
                    {trip.stay ? '' : `${trip.today} min`}
                  </text>
                </svg>
              </figure>
              <label className="lp-dial">
                <span className="lp-dial-q">{scene.ask}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={trip.value}
                  aria-valuetext={scene.stops[trip.tier]}
                  style={vars({ '--p': `${trip.value}%` })}
                  onChange={(e) => engine.current?.setAmount(Number(e.target.value) / 100)}
                />
                <span className="lp-dial-stops" aria-hidden="true">
                  {scene.stops.map((stop, i) => (
                    <span key={stop} className={i === trip.tier ? 'lp-on' : undefined}>
                      {stop}
                    </span>
                  ))}
                </span>
              </label>
              <ul className="lp-chain">
                {scene.chain.map((row) => (
                  <li key={row[0] + row[1]} className="lp-chain-row">
                    <Sym href={row[0]} />
                    <span>{row[trip.tier + 1]}</span>
                  </li>
                ))}
              </ul>
              <p className="lp-sample-note">The event is real. The trip and times are examples.</p>
            </aside>
          </div>
        </div>
      </div>

      <div className="lp-xp-dock-wrap" inert={view === 'home'}>
        <div className="lp-xp-dock lp-night" role="group" aria-label="Move through the happenings">
          <button type="button" className="lp-btn lp-dock-back" aria-label="Back to the map of Cebu" onClick={() => engine.current?.toWall()}>
            <Ic name="squares-four" />
            <span className="lp-dock-label">All of Cebu</span>
          </button>
          <button type="button" className="lp-btn lp-btn-icon lp-dock-btn" aria-label="Previous happening" onClick={() => engine.current?.prevScene()}>
            <Ic name="caret-left" />
          </button>
          <span className="lp-dock-mid">
            <span className="lp-tnum" aria-live={ui.tourPaused || !play ? 'polite' : 'off'}>
              {`${(view === 'scene' ? active : Math.max(ui.peek, 0)) + 1} of ${SCENES.length}`}
            </span>
            <i className="lp-tour-bar" aria-hidden="true">
              <i className="lp-tour-fill" />
            </i>
          </span>
          <button type="button" className="lp-btn lp-btn-icon lp-dock-btn lp-tour-toggle" aria-label="Pause the tour" aria-pressed={ui.tourPaused} onClick={() => engine.current?.toggleTour()}>
            <Ic name="pause" className="lp-ic-pause" />
            <Ic name="play" className="lp-ic-play" />
          </button>
          <button type="button" className="lp-btn lp-btn-icon lp-dock-btn" aria-label="Next happening" onClick={() => engine.current?.nextScene()}>
            <Ic name="caret-right" />
          </button>
        </div>
      </div>
      <a className="lp-map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
        Map data © OpenStreetMap contributors
      </a>
    </section>
  );
});
