import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { IconName } from '@/components/icons/Icon';
import { PHONE_MAP } from '@/lib/landing/art';
import { clampTo } from '@/lib/landing/pageMotion';
import { cx } from '@/utils/cx';
import { html, Ic, RiseWords, ScrollText, Sym } from './parts';

const TABS: ReadonlyArray<{ id: string; label: string; icon: IconName; href: string; ask: string; desc: string }> = [
  { id: 'today', label: 'Today', icon: 'house', href: '#t-today', ask: 'Do I need to change my plans today?', desc: 'Your next leave time, the weather, your brief and the alerts near your places.' },
  { id: 'news', label: 'News', icon: 'newspaper', href: '#t-news', ask: "What's happening in Cebu?", desc: 'Stories from the last 3 days, an Alerts only switch, and a link back to each source.' },
  { id: 'mayor', label: 'Mayor', icon: 'megaphone', href: '#t-mayor', ask: 'What did my mayor post?', desc: "Your LGU's latest posts in one place, with class suspensions marked." },
  { id: 'weather', label: 'Weather', icon: 'cloud-sun', href: '#t-weather', ask: "Will it rain where I'm going?", desc: 'Conditions now, the next 24 hours, and a rain map with an hour slider.' },
  { id: 'traffic', label: 'Traffic', icon: 'traffic-signal', href: '#t-traffic', ask: "What's in my way?", desc: 'Your commute or all of Cebu on a map, with the list right beside it.' },
];
const COUNT = TABS.length;
const POSITIONS = ['lp-pos-c', 'lp-pos-r', 'lp-pos-fr', 'lp-pos-fl', 'lp-pos-l'];
/** The phones' full height, before they scale down to fit a short window. */
const PHONE_HEIGHT = 584;

function TabBar({ active }: { active: number }) {
  return (
    <div className="lp-m-tabs">
      {TABS.map((tab, i) => (
        <span key={tab.id} className={cx('lp-mt', i === active && 'lp-on')}>
          <svg viewBox="0 0 256 256" fill="currentColor">
            <use href={tab.href} />
          </svg>
          <span>{tab.label}</span>
        </span>
      ))}
    </div>
  );
}

function RainBars({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={cx('lp-m-bars', className)} style={style}>
      {[70, 80, 80, 60, 40, 30].map((height, i) => (
        <i key={i} style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}

/** The five sample screens. They are decoration for the list beside them, so they're hidden from screen readers. */
function Phone({ index, phone, sky, children }: { index: number; phone: number; sky: string; children: ReactNode }) {
  return (
    <div className={cx('lp-phone', POSITIONS[(index - phone + COUNT) % COUNT])} aria-hidden="true">
      <div className="lp-screen" style={{ background: sky }}>
        {children}
        <TabBar active={index} />
      </div>
    </div>
  );
}

const Screens = memo(function Screens({ phone, sky }: { phone: number; sky: string }) {
  return (
    <>
      <Phone index={0} phone={phone} sky={sky}>
        <div className="lp-mg">
          <div className="lp-m-h">Maayong buntag, Thea</div>
          <div className="lp-m-s">Talamban · Updated 2 min ago</div>
        </div>
        <div className="lp-mg lp-m-inline">
          <i className="lp-m-dot" />
          <span className="lp-m-b">1 alert near your places</span>
        </div>
        <div className="lp-mn">
          <div className="lp-m-spread">
            <span className="lp-m-b">Your next trip</span>
            <span className="lp-m-chip lp-mango">+12 min · rain</span>
          </div>
          <div className="lp-m-big lp-tnum">
            <small>Leave by</small>6:43 AM
          </div>
          <div className="lp-m-s lp-m-gap">Classes · Home → School · arrive 7:30</div>
          <div className="lp-m-s">Usually 35 min · today 47 min</div>
        </div>
        <div className="lp-mg lp-m-inline">
          <Sym href="#i-rain" className="lp-ico lp-m-wx" />
          <div>
            <div className="lp-m-temp lp-tnum">25°</div>
            <div className="lp-m-s">Rain</div>
          </div>
          <RainBars />
        </div>
        <div className="lp-mg">
          <div className="lp-m-b">Today's brief</div>
          <div className="lp-m-s">Rain likely this morning. Leave by 6:43 AM to reach School by 7:30 AM.</div>
          <div className="lp-m-link">Read the full brief</div>
        </div>
        <div className="lp-mg">
          <div className="lp-m-b">Near your places</div>
          <div className="lp-m-alert">
            <Sym href="#i-traffic" />
            <span>Stationary traffic on Osmeña Blvd</span>
            <span className="lp-m-chip lp-med">Medium</span>
          </div>
        </div>
      </Phone>

      <Phone index={1} phone={phone} sky={sky}>
        <div className="lp-mg">
          <div className="lp-m-h">News</div>
          <div className="lp-m-s">Sample stories · Updated 8 min ago</div>
        </div>
        <div className="lp-mg lp-m-wrap">
          <span className="lp-m-chip lp-mango">All Cebu</span>
          <span className="lp-m-chip lp-quiet">Cebu City</span>
          <span className="lp-m-chip lp-quiet">Talisay</span>
          <span className="lp-m-chip lp-quiet">Alerts only</span>
        </div>
        <div className="lp-mg">
          <div className="lp-m-inline">
            <span className="lp-m-src lp-ss">SS</span>
            <span className="lp-m-s">
              <b>SunStar</b> · 1h · Talisay
            </span>
          </div>
          <div className="lp-m-b lp-m-gap">Scheduled power interruption in parts of Talisay</div>
          <span className="lp-m-img lp-t-amber" />
          <div className="lp-m-spread lp-m-gap">
            <span className="lp-m-chip lp-med">Power</span>
            <span className="lp-m-link">Read on SunStar</span>
          </div>
        </div>
        <div className="lp-mg">
          <div className="lp-m-inline">
            <span className="lp-m-src lp-cd">CD</span>
            <span className="lp-m-s">
              <b>Cebu Daily News</b> · 3h · Consolacion
            </span>
          </div>
          <div className="lp-m-b lp-m-gap">Flooding reported in Poblacion, Consolacion</div>
          <span className="lp-m-img lp-t-teal" />
          <div className="lp-m-spread lp-m-gap">
            <span className="lp-m-chip lp-high">Flood</span>
            <span className="lp-m-link">Read on Cebu Daily News</span>
          </div>
        </div>
      </Phone>

      <Phone index={2} phone={phone} sky={sky}>
        <div className="lp-mg">
          <div className="lp-cover lp-m-cover" />
          <div className="lp-m-spread lp-m-gap">
            <div className="lp-m-inline">
              <span className="lp-m-src lp-lgu">CC</span>
              <div>
                <div className="lp-m-h">Cebu City</div>
                <div className="lp-m-s">Your mayor · sample posts</div>
              </div>
            </div>
            <span className="lp-m-chip lp-quiet">Following</span>
          </div>
        </div>
        <div className="lp-mg">
          <div className="lp-m-spread">
            <div className="lp-m-inline">
              <span className="lp-m-src lp-lgu">CC</span>
              <span className="lp-m-s">
                <b>Cebu City</b> · 2h
              </span>
            </div>
            <span className="lp-m-chip lp-mango">Class suspension</span>
          </div>
          <div className="lp-m-gap">Sample post: Walay klase sa tanang lebel ugma</div>
          <span className="lp-m-img lp-t-navy" />
          <div className="lp-m-s lp-m-gap">4.8K reactions · 1.9K comments · 685 shares</div>
          <div className="lp-m-link">View on Facebook</div>
        </div>
        <div className="lp-mg">
          <div className="lp-m-spread">
            <div className="lp-m-inline">
              <span className="lp-m-src lp-lgu">CC</span>
              <span className="lp-m-s">
                <b>Cebu City</b> · 1d
              </span>
            </div>
            <span className="lp-m-chip lp-quiet">Traffic</span>
          </div>
          <div className="lp-m-gap">Sample post: N. Bacalso Ave drainage works</div>
        </div>
      </Phone>

      <Phone index={3} phone={phone} sky={sky}>
        <div className="lp-mg">
          <div className="lp-m-h">Weather</div>
          <div className="lp-m-s">Talamban · Updated 12 min ago</div>
        </div>
        <div className="lp-mg">
          <div className="lp-m-inline">
            <Sym href="#i-rain" className="lp-ico lp-m-wx-lg" />
            <div>
              <div className="lp-m-temp lp-tnum" style={{ fontSize: '1.75rem' }}>
                25°
              </div>
              <div className="lp-m-b">Rain</div>
              <div className="lp-m-s">Feels like 28°</div>
            </div>
          </div>
          <div className="lp-m-gap">Rain likely this morning. Bring an umbrella.</div>
          <div className="lp-m-spread lp-m-gap lp-m-s">
            <span>
              Rain <b>70%</b>
            </span>
            <span>
              Humidity <b>84%</b>
            </span>
            <span>
              Wind <b>12 km/h</b>
            </span>
          </div>
        </div>
        <div className="lp-mg lp-m-cells lp-m-s lp-tnum">
          {[
            ['7 AM', '25°', '70%'],
            ['8 AM', '25°', '80%'],
            ['9 AM', '24°', '80%'],
            ['10 AM', '25°', '60%'],
            ['11 AM', '26°', '40%'],
          ].map(([hour, temp, rain]) => (
            <div key={hour}>
              <b>{hour}</b>
              <br />
              {temp}
              <br />
              {rain}
            </div>
          ))}
        </div>
        <div className="lp-mg">
          <div className="lp-m-b">Rain chance, next 6 hours</div>
          <RainBars className="lp-m-gap" style={{ width: '100%', height: '72px', marginLeft: 0 }} />
        </div>
      </Phone>

      <Phone index={4} phone={phone} sky={sky}>
        <div className="lp-m-seg">
          <span className="lp-on">My commute</span>
          <span>All Cebu</span>
        </div>
        <div className="lp-mg lp-m-map">
          <svg viewBox="0 0 240 188" preserveAspectRatio="xMidYMid slice" dangerouslySetInnerHTML={html(PHONE_MAP)} />
        </div>
        <div className="lp-mg">
          <div className="lp-m-spread">
            <span className="lp-m-h lp-tnum">Leave by 6:43 AM</span>
            <span className="lp-m-chip lp-mango">+12 min</span>
          </div>
          <div className="lp-m-s">Approximate route · Home → School</div>
          <div className="lp-m-alert">
            <Sym href="#i-traffic" />
            <span>
              Stationary traffic on Osmeña Blvd
              <br />
              <span className="lp-m-s">Adds about 4 min</span>
            </span>
            <span className="lp-m-chip lp-med">Medium</span>
          </div>
          <div className="lp-m-alert">
            <Sym href="#i-closure" />
            <span>
              Road closure: N. Bacalso Ave
              <br />
              <span className="lp-m-s">1.2 km from School</span>
            </span>
            <span className="lp-m-chip lp-high">High</span>
          </div>
        </div>
      </Phone>
    </>
  );
});

interface AppTabsProps {
  /** The phones stay pinned while each stretch of scrolling is one tab. */
  pin: boolean;
  /** This section is the one on screen. */
  active: boolean;
  still: boolean;
  /** Today's sky, for the phones' screens. */
  sky: string;
}

export const AppTabs = memo(function AppTabs({ pin, active, still, sky }: AppTabsProps) {
  const [phone, setPhone] = useState(0);
  const [tour, setTour] = useState(true);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageHover = useRef(false);

  // While pinned, the phones have to fit the window, so they scale down on short screens.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      if (!pin) {
        stage.style.removeProperty('--ps');
        stage.style.marginBottom = '';
        return;
      }
      stage.style.setProperty('--ps', '1');
      stage.style.marginBottom = '0px';
      const sticky = stage.closest<HTMLElement>('.lp-app-sticky');
      if (!sticky) return;
      const over = sticky.offsetHeight - (window.innerHeight - 88);
      const scale = over > 0 ? Math.max(0.56, (PHONE_HEIGHT - over) / PHONE_HEIGHT) : 1;
      stage.style.setProperty('--ps', scale.toFixed(3));
      stage.style.marginBottom = `${(-(1 - scale) * PHONE_HEIGHT).toFixed(1)}px`;
    };
    fit();
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) fit();
    });
    window.addEventListener('resize', fit, { passive: true });
    return () => {
      live = false;
      window.removeEventListener('resize', fit);
    };
  }, [pin]);

  // While pinned, each stretch of scrolling is one tab.
  useEffect(() => {
    if (!pin) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = pinRef.current;
        const inner = el?.firstElementChild as HTMLElement | null;
        if (!el || !inner) return;
        const r = el.getBoundingClientRect();
        const range = r.height - inner.offsetHeight;
        if (range > 0) setPhone(Math.floor(clampTo((72 - r.top) / range, 0, 0.9999) * COUNT));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [pin]);

  // Not pinned, the screens take turns by themselves while this section is on screen.
  useEffect(() => {
    if (pin || !tour || !active || still) return;
    const id = window.setInterval(() => {
      if (!stageHover.current && !document.hidden) setPhone((cur) => (cur + 1) % COUNT);
    }, 4200);
    return () => window.clearInterval(id);
  }, [pin, tour, active, still]);

  const goTo = (i: number) => {
    if (pin) {
      const el = pinRef.current;
      const inner = el?.firstElementChild as HTMLElement | null;
      if (!el || !inner) return;
      const r = el.getBoundingClientRect();
      const range = r.height - inner.offsetHeight;
      const step = clampTo(i, 0, COUNT - 1);
      window.scrollTo({ top: window.scrollY + r.top - 72 + ((step + 0.5) / COUNT) * range, behavior: still ? 'auto' : 'smooth' });
    } else {
      setPhone((i + COUNT) % COUNT);
      setTour(false);
    }
  };

  const leaveStage = () => {
    stageHover.current = false;
    stageRef.current?.style.setProperty('--rx', '0deg');
    stageRef.current?.style.setProperty('--ry', '0deg');
  };

  return (
    <section className="lp-sec" id="app" aria-labelledby="app-h">
      <div className="lp-app-pin" ref={pinRef}>
        <div className="lp-wrap lp-app-sticky">
          <h2 id="app-h" className="lp-h2 lp-sd-h">
            <RiseWords text="Five tabs, five questions" />
          </h2>
          <ScrollText className="lp-intro" text="Every screen answers one thing first. The details wait behind a tap." />
          <div className="lp-app-grid">
            <div className="lp-app-left">
              <div className="lp-q-panel lp-glass">
                {TABS.map((tab, i) => (
                  <button key={tab.id} type="button" className="lp-q-row" aria-pressed={i === phone} onClick={() => goTo(i)}>
                    <Ic name={tab.icon} />
                    <span>
                      <span className="lp-q-label">{tab.label}</span>
                      <span className="lp-q-ask">{tab.ask}</span>
                      <span className="lp-q-desc">{tab.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="lp-app-right">
              <div
                className="lp-stage"
                ref={stageRef}
                onPointerEnter={() => {
                  stageHover.current = true;
                }}
                onPointerLeave={leaveStage}
                onFocus={() => {
                  stageHover.current = true;
                }}
                onBlur={() => {
                  stageHover.current = false;
                }}
              >
                <Screens phone={phone} sky={sky} />
              </div>
              <div className="lp-stage-ctl">
                <button type="button" className="lp-btn lp-btn-icon lp-on-sky" aria-label="Previous screen" onClick={() => goTo(phone - 1)}>
                  <Ic name="caret-left" />
                </button>
                <span className="lp-tnum" aria-live="polite">{`${phone + 1} of ${COUNT} · sample data`}</span>
                <button type="button" className="lp-btn lp-btn-icon lp-on-sky lp-tour-btn" aria-label="Play the screens by themselves" aria-pressed={tour} onClick={() => setTour((on) => !on)}>
                  <Ic name="pause" className="lp-ic-pause" />
                  <Ic name="play" className="lp-ic-play" />
                </button>
                <button type="button" className="lp-btn lp-btn-icon lp-on-sky" aria-label="Next screen" onClick={() => goTo(phone + 1)}>
                  <Ic name="caret-right" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="lp-app-spacer" aria-hidden="true" />
      </div>
    </section>
  );
});
