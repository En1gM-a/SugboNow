import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { JEEP_BODY, KIN_A, KIN_B, ROAD, ROUTE_JEEP, WHEEL } from '@/lib/landing/art';
import { TOWNS } from '@/lib/landing/data';
import { cx } from '@/utils/cx';
import { html, Ic, RiseWords, ScrollText, vars } from './parts';

/** A band of big moving type between sections. It's decoration: everything it says is said elsewhere. */
export const Kinetic = memo(function Kinetic({ band }: { band: 'a' | 'b' }) {
  return <div className="lp-kin" aria-hidden="true" dangerouslySetInnerHTML={html(band === 'a' ? KIN_A : KIN_B)} />;
});

const STEPS = [
  { title: 'Tonight, tell us your week', text: 'Pin home and the places you go, then add your weekly trips and the time you need to arrive.' },
  { title: 'All day, we read Cebu for you', text: 'Scheduled checks collect traffic, weather, news and advisories, then match them to your places.' },
  { title: 'By 5:30 AM, your brief is ready', text: 'A short summary of the day for your city and your trips, written automatically.' },
  { title: 'Before you go, you get one time to leave', text: "Your trip time plus today's delay, with the reasons one tap away. It's worked out again each time you look." },
  { title: 'On the way, the bell shows what changed', text: 'When a new alert near your places comes in, the bell rings and shows how many.' },
];

export const HowItWorks = memo(function HowItWorks() {
  return (
    <section className="lp-sec" id="how" aria-labelledby="how-h">
      <div className="lp-wrap lp-how-grid">
        <div className="lp-how-head">
          <h2 id="how-h" className="lp-h2 lp-sd-h">
            <RiseWords text="Set it up once. It checks every day." />
          </h2>
          <ScrollText className="lp-intro" text="You tell it where you go and when you need to be there. The rest happens before you wake up." />
        </div>
        <div className="lp-steps">
          <span className="lp-route-jeep" aria-hidden="true" dangerouslySetInnerHTML={html(ROUTE_JEEP)} />
          {STEPS.map((step) => (
            <div key={step.title} className="lp-step">
              <h3 className="lp-step-title">{step.title}</h3>
              <ScrollText className="lp-step-text" text={step.text} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

export const MadeForCebu = memo(function MadeForCebu({ play }: { play: boolean }) {
  const [picked, setPicked] = useState({ town: 0, flip: 0 });
  const [name, sign, rule] = TOWNS[picked.town];
  const go = play && picked.flip ? (picked.flip % 2 ? 'a' : 'b') : undefined;
  return (
    <section className="lp-sec" id="place" aria-labelledby="place-h">
      <div className="lp-wrap">
        <div className="lp-place-card lp-glass">
          <div>
            <h2 id="place-h" className="lp-place-h lp-sd-h">
              <RiseWords text="Made for Metro Cebu" />
            </h2>
            <p className="lp-b-text" style={{ marginTop: 10, maxWidth: '58ch' }}>
              Asa ka nagpuyo? Your home city sets your weather and whose class suspensions you see.
            </p>
            <div className="lp-towns" role="group" aria-label="Choose a town">
              {TOWNS.map((town, i) => (
                <button key={town[0]} type="button" className="lp-town" aria-pressed={i === picked.town} style={vars({ '--i': i })} onClick={() => setPicked((p) => ({ town: i, flip: p.flip + 1 }))}>
                  {town[0]}
                </button>
              ))}
            </div>
            <p className="lp-town-rule" data-flip={go} aria-live="polite">
              {name}
              {rule}
            </p>
          </div>
          <div className="lp-jeep-still" data-go={go} aria-hidden="true">
            <span className="lp-jeep-shadow" />
            <span className="lp-jeep-body" dangerouslySetInnerHTML={html(JEEP_BODY.replace('%SIGN%', sign))} />
            <span className="lp-wheel lp-wheel-1" dangerouslySetInnerHTML={html(WHEEL)} />
            <span className="lp-wheel lp-wheel-2" dangerouslySetInnerHTML={html(WHEEL)} />
          </div>
        </div>
      </div>
    </section>
  );
});

const QUESTIONS: ReadonlyArray<[question: string, answer: string]> = [
  ['Where does the information come from?', "Traffic comes from TomTom and weather from WeatherAPI. News comes from SunStar, Cebu Daily News and GNews, and mayors' posts come from official LGU Facebook pages."],
  ['How fresh is it?', 'Traffic is checked every 15 minutes from 5 AM to 10:45 PM, and weather every hour. SunStar and Cebu Daily News are read every 30 minutes and GNews every 3 hours.'],
  ['How is my leave time worked out?', 'It starts from when you need to arrive, then counts back your estimated trip time plus extra time for alerts near the start or end of your trip. Tap the delay to see the reasons.'],
  ['Who writes the Daily Brief?', "It's written automatically once a day, at 5:30 AM or the first time you open it that day, from your trips, the weather and current alerts."],
  ['Whose class suspensions will I see?', 'You pick the mayor to follow when you sign up, and you can change it later in Profile. Cebu City, Mandaue and Lapu-Lapu decide their own class suspensions. Every other town follows the Province of Cebu.'],
  ['Do you copy whole articles or Facebook comments?', 'No. Only the headline, a short snippet, the image link and the story link are kept, and the app always links back to the source. Facebook comments are never stored.'],
  ['Are the events on this page real?', 'Yes. Each scene links to the report it comes from. The trips, delays and sliders are examples that show how a day like that would change your leave time.'],
  ['Will it work on a cheap phone?', "It's built for that. SugboNow runs in your phone's browser, and Lite mode turns on by itself on weaker phones. You can also switch it, and Reduce animations, in Profile."],
];

export const Faq = memo(function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="lp-sec" id="faq" aria-labelledby="faq-h">
      <div className="lp-wrap lp-faq-grid">
        <div>
          <h2 id="faq-h" className="lp-h2 lp-sd-h">
            <RiseWords text="What people ask first" />
          </h2>
          <ScrollText className="lp-intro" text="Short answers. The app shows the rest when you need it." />
        </div>
        <div className="lp-faq lp-glass">
          {QUESTIONS.map(([question, answer], i) => (
            <div key={question} className={cx('lp-qa', open === i && 'lp-open')}>
              <button type="button" className="lp-qa-q" aria-expanded={open === i} aria-controls={`faq-${i}`} onClick={() => setOpen((cur) => (cur === i ? -1 : i))}>
                {question}
                <Ic name="plus" />
              </button>
              <div className="lp-qa-a" id={`faq-${i}`}>
                <div>
                  <p>{answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

export const FinalCta = memo(function FinalCta() {
  return (
    <section className="lp-final" id="start" aria-labelledby="final-h">
      <div className="lp-wrap">
        <h2 id="final-h" className="lp-h2 lp-sd-h">
          <RiseWords text="Bag-o ka diri? Start with one trip." />
        </h2>
        <ScrollText className="lp-intro" text="Add your home, one place you go and the time you need to be there. SugboNow does the checking from there." />
        <div className="lp-final-cta">
          <Link className="lp-btn lp-btn-primary lp-magnet" to="/signup">
            Get started
            <Ic name="caret-right" />
          </Link>
          <Link className="lp-link-sky" to="/login">
            Already riding with us? Sign in
          </Link>
        </div>
      </div>
      <div className="lp-road" aria-hidden="true" dangerouslySetInnerHTML={html(ROAD)} />
    </section>
  );
});

const FOOT_LINKS: ReadonlyArray<[section: string, label: string]> = [
  ['mornings', 'Mornings'],
  ['app', 'The app'],
  ['checks', 'What it checks'],
  ['how', 'How it works'],
  ['faq', 'FAQ'],
];
const SIGN_OFF = 'Ingat sa dalan!';

export const LandingFooter = memo(function LandingFooter() {
  return (
    <footer className="lp-foot">
      <div className="lp-wrap">
        <div className="lp-foot-grid">
          <div>
            <Link className="lp-brand" to="#top">
              <span className="lp-mark" aria-hidden="true" />
              SugboNow
            </Link>
            <p style={{ marginTop: 6, maxWidth: '40ch' }}>
              Know when to leave, rain or shine.{' '}
              <span className="lp-wave">
                <span className="lp-sr-only">{SIGN_OFF}</span>
                {[...SIGN_OFF].map((letter, i) =>
                  letter === ' ' ? (
                    <span key={i} className="lp-wave-gap" aria-hidden="true" />
                  ) : (
                    <span key={i} style={vars({ '--li': i })} aria-hidden="true">
                      {letter}
                    </span>
                  ),
                )}
              </span>
            </p>
          </div>
          <div>
            <h3 className="lp-foot-h">On this page</h3>
            <ul>
              {FOOT_LINKS.map(([section, label]) => (
                <li key={section}>
                  <Link className="lp-foot-link" to={`#${section}`}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="lp-foot-h">Data</h3>
            <p>Traffic data © TomTom</p>
            <p>Weather by WeatherAPI.com</p>
            <p>Maps © OpenStreetMap contributors</p>
          </div>
        </div>
        <p className="lp-foot-note">© 2026 SugboNow. The trips, alerts, posts and times shown here are sample data.</p>
      </div>
    </footer>
  );
});
