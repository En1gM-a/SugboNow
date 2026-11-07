import { memo, useEffect, useRef, useState } from 'react';
import { ICON_FLOOD, ICON_POWER, ICON_RAIN, ICON_WATER } from '@/lib/landing/art';
import { ALERTS } from '@/lib/landing/data';
import { clampTo } from '@/lib/landing/pageMotion';
import { cx } from '@/utils/cx';
import { html, RiseWords, ScrollText, Sym } from './parts';

const BARS: ReadonlyArray<{ label: string; hour: string; percent: number; height: number }> = [
  { label: '7', hour: '7 AM', percent: 70, height: 52 },
  { label: '8', hour: '8 AM', percent: 80, height: 60 },
  { label: '9', hour: '9 AM', percent: 80, height: 60 },
  { label: '10', hour: '10 AM', percent: 60, height: 45 },
  { label: '11', hour: '11 AM', percent: 40, height: 30 },
  { label: '12', hour: '12 PM', percent: 30, height: 22 },
];

/** Sample rain chance. Moving across the bars reads out each hour. */
function RainChance() {
  const [at, setAt] = useState(-1);
  const bars = useRef<HTMLDivElement>(null);
  return (
    <>
      <div
        className="lp-bars lp-tnum"
        ref={bars}
        role="img"
        aria-label="Sample rain chance for the next 6 hours, highest at 8 and 9 AM."
        onPointerMove={(e) => {
          const r = bars.current?.getBoundingClientRect();
          if (r) setAt(clampTo(Math.floor(((e.clientX - r.left) / r.width) * BARS.length), 0, BARS.length - 1));
        }}
        onPointerLeave={() => setAt(-1)}
      >
        {BARS.map((bar, i) => (
          <div key={bar.label} className={cx('lp-bar', i === at && 'lp-on')}>
            <i style={{ height: `${bar.height}%` }} />
            <span>{bar.label}</span>
          </div>
        ))}
      </div>
      <p className="lp-bar-text" aria-hidden="true">
        {at >= 0 ? `Rain chance at ${BARS[at].hour}: ${BARS[at].percent}%` : 'Move across the bars to read each hour.'}
      </p>
    </>
  );
}

/** A clock that counts down to a scheduled check. lib/landing/pageMotion.ts writes its text once a second. */
function NextUp({ name }: { name: string }) {
  return (
    <span className="lp-next-up lp-tnum" data-next={name}>
      --:--
    </span>
  );
}

export const Checks = memo(function Checks({ active, still }: { active: boolean; still: boolean }) {
  const [tick, setTick] = useState(0);
  const [klase, setKlase] = useState({ on: false, flip: 0 });

  // The sample alerts take turns while this section is on screen.
  useEffect(() => {
    if (!active || still) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setTick((n) => n + 1);
    }, 3800);
    return () => window.clearInterval(id);
  }, [active, still]);

  const shown = [0, 1, 2].map((n) => ALERTS[(tick + n) % ALERTS.length]);

  return (
    <section className="lp-sec" id="checks" aria-labelledby="checks-h">
      <div className="lp-wrap">
        <h2 id="checks-h" className="lp-h2 lp-sd-h">
          <RiseWords text="Everything that can make you late, checked for you" />
        </h2>
        <ScrollText className="lp-intro" text="Scheduled checks collect it all and match it to your places, so your phone isn't the one doing the downloading." />
        <div className="lp-bento">
          <article className="lp-b-card lp-glass lp-s4">
            <div className="lp-b-split">
              <div style={{ display: 'grid', alignContent: 'start', gap: 10 }}>
                <h3 className="lp-b-title">Traffic</h3>
                <p className="lp-b-text">Incidents across Metro Cebu, from Naga City to Liloan and Talisay to Mactan.</p>
                <p className="lp-b-when">
                  Every 15 minutes, 5 AM to 10:45 PM. Next check in <NextUp name="traffic" />
                </p>
                <p className="lp-small lp-muted">Traffic data © TomTom</p>
              </div>
              <div className="lp-rows" role="group" aria-label="Sample alerts">
                {shown.map((alert, n) => (
                  <div key={n} className={cx('lp-row', tick % 2 ? 'lp-row-a' : 'lp-row-b')}>
                    <span className="lp-row-ico" aria-hidden="true">
                      <Sym href={alert.icon} />
                    </span>
                    <div className="lp-row-main">
                      <b>{alert.title}</b>
                      <span className="lp-small lp-muted">{alert.sub}</span>
                    </div>
                    <span className={cx('lp-tag', `lp-${alert.sev}`)}>{alert.label}</span>
                  </div>
                ))}
                <p className="lp-small lp-muted" style={{ paddingTop: 6 }}>
                  Sample alerts
                </p>
              </div>
            </div>
          </article>

          <article className="lp-b-card lp-glass lp-s2">
            <span className="lp-b-ico" aria-hidden="true" dangerouslySetInnerHTML={html(ICON_RAIN)} />
            <h3 className="lp-b-title">Weather</h3>
            <p className="lp-b-text">Only rain likely to disrupt a trip in the next 12 hours raises an alert.</p>
            <p className="lp-b-when">
              Every hour, for 9 areas. Next check in <NextUp name="weather" />
            </p>
            <RainChance />
          </article>

          <article className="lp-b-card lp-glass lp-s2">
            <span className="lp-b-ico" aria-hidden="true" dangerouslySetInnerHTML={html(ICON_FLOOD)} />
            <h3 className="lp-b-title">Floods and closures</h3>
            <p className="lp-b-text">Road reports and local news become alerts with a severity, and you see how far each one is from your places.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span className="lp-tag lp-sev-high">High</span>
              <span className="lp-tag lp-sev-medium">Medium</span>
              <span className="lp-tag lp-sev-low">Low</span>
            </div>
          </article>

          <article className="lp-b-card lp-glass lp-s4">
            <div className="lp-b-split">
              <div className="lp-cover" aria-hidden="true" />
              <div style={{ display: 'grid', alignContent: 'start', gap: 10 }}>
                <h3 className="lp-b-title">
                  Your mayor's posts
                  <button
                    type="button"
                    className={cx('lp-tag', klase.on ? 'lp-sev-high' : 'lp-tag-mango', 'lp-klase-btn', klase.flip % 2 ? 'lp-klase-flip-a' : 'lp-klase-flip-b')}
                    onClick={() => setKlase((k) => ({ on: !k.on, flip: k.flip + 1 }))}
                  >
                    {klase.on ? 'Walay klase' : 'Naay klase?'}
                  </button>
                </h3>
                <p className="lp-b-text">Cebu City, Mandaue and Lapu-Lapu decide their own class suspensions. Every other town follows the Province of Cebu.</p>
                <p className="lp-b-when">Checked when you sign in, at most every 10 minutes per page</p>
              </div>
            </div>
          </article>

          <article className="lp-b-card lp-glass lp-s3">
            <div className="lp-b-icons" aria-hidden="true">
              <span className="lp-b-ico" dangerouslySetInnerHTML={html(ICON_POWER)} />
              <span className="lp-b-ico" dangerouslySetInnerHTML={html(ICON_WATER)} />
            </div>
            <h3 className="lp-b-title">Power and water</h3>
            <p className="lp-b-text">Interruption notices in Cebu news are picked up in English, Cebuano and Tagalog, then shown as alerts.</p>
            <div className="lp-rows" role="group" aria-label="Sample alerts">
              <div className="lp-row lp-two">
                <div className="lp-row-main">
                  <b>Scheduled power interruption in parts of Talisay</b>
                </div>
                <span className="lp-tag lp-sev-medium">Medium</span>
              </div>
              <div className="lp-row lp-two">
                <div className="lp-row-main">
                  <b>Low water pressure in Lapu-Lapu City</b>
                </div>
                <span className="lp-tag lp-sev-low">Low</span>
              </div>
              <p className="lp-small lp-muted" style={{ paddingTop: 6 }}>
                Sample alerts
              </p>
            </div>
          </article>

          <article className="lp-b-card lp-glass lp-s3">
            <h3 className="lp-b-title">News</h3>
            <p className="lp-b-text">Cebu stories from the last 3 days. Every story links back to where it was published.</p>
            <div className="lp-src-rows">
              {[
                { mark: 'SS', cls: 'lp-src-ss', name: 'SunStar', every: 'Every 30 minutes.', next: 'sunstar' },
                { mark: 'CD', cls: 'lp-src-cd', name: 'Cebu Daily News', every: 'Every 30 minutes.', next: 'cdn' },
                { mark: 'GN', cls: 'lp-src-gn', name: 'GNews', every: 'Every 3 hours.', next: 'gnews' },
              ].map((src) => (
                <div key={src.mark} className="lp-src-row">
                  <span className={cx('lp-src', src.cls)} aria-hidden="true">
                    {src.mark}
                  </span>
                  <div className="lp-row-main">
                    <b>{src.name}</b>
                    <span className="lp-small lp-muted">
                      {src.every} Next in <NextUp name={src.next} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
});
