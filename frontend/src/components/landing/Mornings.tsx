import { Fragment, memo } from 'react';
import { BRIEF_TABS, BRIEFS, type BriefId } from '@/lib/landing/data';
import { cx } from '@/utils/cx';
import { Ic, RiseWords, ScrollText, Sym, vars, Word } from './parts';

const MORNINGS = [
  { art: 'lp-t-blue', icon: '#i-rain', title: 'Rain before you leave', was: 'You find out at the terminal, with no umbrella.', now: 'Your leave time moves earlier, and it says why.' },
  { art: 'lp-t-amber', icon: '#i-closure', title: 'A road closes on your way', was: 'You sit in the jam before you see the barricade.', now: "It's on your alerts, with how far it is from your places." },
  { art: 'lp-t-navy', icon: '#i-class', title: 'Classes get suspended', tag: 'Naay klase?', was: "You keep refreshing your mayor's page at 5 AM.", now: "Your mayor's latest post is on Today when you open it." },
  { art: 'lp-t-teal', icon: '#i-flood', title: 'Flooding near your places', was: 'You hear about it from someone already stuck.', now: 'The alert is matched to the places you saved.' },
  { art: 'lp-t-amber', icon: '#i-power', title: 'Power or water goes off', was: 'The notice was in a post you never saw.', now: 'Notices in the news show up as alerts for your area.' },
];

/** Three copies, so the rail can loop without an edge. Only the first is read out. */
const COPIES = [0, 1, 2];

/** "Read for you from TomTom, WeatherAPI, …", with each word and comma fading up in turn. */
function Sources() {
  return (
    <p className="lp-sources lp-sd-p" style={vars({ '--t': 21 })}>
      <Word text="Read" i={0} /> <Word text="for" i={1} /> <Word text="you" i={2} /> <Word text="from" i={3} />{' '}
      <b>
        <Word text="TomTom" i={4} />
      </b>
      <Word text="," i={5} />{' '}
      <b>
        <Word text="WeatherAPI" i={6} />
      </b>
      <Word text="," i={7} />{' '}
      <b>
        <Word text="SunStar" i={8} />
      </b>
      <Word text="," i={9} />{' '}
      <b>
        <Word text="Cebu" i={10} /> <Word text="Daily" i={11} /> <Word text="News" i={12} />
      </b>
      <Word text="," i={13} />{' '}
      <b>
        <Word text="GNews" i={14} />
      </b>{' '}
      <Word text="and" i={15} />{' '}
      <b>
        <Word text="official" i={16} /> <Word text="LGU" i={17} /> <Word text="Facebook" i={18} /> <Word text="pages" i={19} />
      </b>
      <Word text="." i={20} />
    </p>
  );
}

interface MorningsProps {
  brief: BriefId;
  /** Counts changes of the brief, so its words replay. */
  flip: number;
  play: boolean;
  onPick: (brief: BriefId) => void;
}

export const Mornings = memo(function Mornings({ brief, flip, play, onPick }: MorningsProps) {
  let word = 0;
  return (
    <section className="lp-sec" id="mornings" aria-labelledby="mornings-h">
      <div className="lp-wrap">
        <h2 id="mornings-h" className="lp-h2 lp-sd-h">
          <RiseWords text="Find out at home, not halfway there" />
        </h2>
        <ScrollText className="lp-intro" text="Most bad commutes start with something you could have known before you left. These are the mornings SugboNow is built for." />
        <Sources />
      </div>
      <div className="lp-rail" tabIndex={0} role="group" aria-label="Mornings SugboNow is built for. The cards move by themselves. Hover or focus to stop them.">
        <ul className="lp-rail-track">
          {COPIES.map((copy) =>
            MORNINGS.map((m) => (
              <li key={`${copy}-${m.title}`} className="lp-m-card lp-glass" aria-hidden={copy > 0 ? true : undefined}>
                <div className={cx('lp-m-art', m.art)} aria-hidden="true">
                  <Sym href={m.icon} />
                </div>
                <div className="lp-m-body">
                  <h3 className="lp-m-title">
                    {m.title}
                    {m.tag && <span className="lp-tag lp-tag-mango">{m.tag}</span>}
                  </h3>
                  <dl className="lp-m-list">
                    <div className="lp-m-row lp-was">
                      <dt className="lp-sr-only">Before</dt>
                      <Ic name="x" />
                      <dd>{m.was}</dd>
                    </div>
                    <div className="lp-m-row lp-now">
                      <dt className="lp-sr-only">With SugboNow</dt>
                      <Ic name="check" />
                      <dd>{m.now}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            )),
          )}
        </ul>
      </div>
      <div className="lp-wrap">
        <div className="lp-brief-card lp-glass">
          <div className="lp-brief-side">
            <h3 className="lp-brief-h">Your morning, in a few lines</h3>
            <span className="lp-tag lp-tag-quiet">Sample brief</span>
            <div className="lp-brief-tabs" role="group" aria-label="Choose a morning">
              {BRIEF_TABS.map(([id, label]) => (
                <button key={id} type="button" className="lp-chip" aria-pressed={id === brief} onClick={() => onPick(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="lp-brief-text" data-flip={play && flip ? (flip % 2 ? 'a' : 'b') : undefined} aria-live="polite">
            {BRIEFS[brief].map((line) => (
              <p key={line}>
                {line.split(' ').map((t, i) => (
                  <Fragment key={i}>
                    <span className="lp-bw" style={vars({ '--wi': word++ })}>
                      {t}
                    </span>{' '}
                  </Fragment>
                ))}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});
