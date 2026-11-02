// Stand-ins for the pages that come after the home page and Today (News, Mayor, Weather, Traffic, Profile and
// onboarding), so the tabs, the bell and the avatar have somewhere to go. Profile already has the display switches
// and Sign out, which phones need because the nav rail with Sign out is desktop-only.

import { Link } from 'react-router-dom';
import { resetBell } from '@/components/layout/Bell';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { useAuth } from '@/context/AuthContext';
import { setLite, setStill, useDisplay } from '@/lib/display';
import { EntranceContext, pages, usePageEntrance } from '@/lib/entrance';
import { cx, vars } from '@/utils/cx';

const PAGES = {
  news: { question: "What's happening in Cebu?" },
  mayor: { question: 'What did my mayor post?' },
  weather: { question: "Will it rain where I'm going?" },
  traffic: { question: "What's in my way?" },
  profile: { question: 'Is my info right?' },
  welcome: { question: 'Welcome to SugboNow' },
} as const;

export type PlaceholderName = keyof typeof PAGES;

export default function PlaceholderPage({ page }: { page: PlaceholderName }) {
  const entrance = usePageEntrance(`/${page}`);
  const { lite, reduceAnimations } = useDisplay();
  const { signOut } = useAuth();
  const welcome = page === 'welcome';

  const handleSignOut = () => {
    pages.forget();
    resetBell();
    void signOut();
  };

  const content = (
    <div className={cx('page', welcome && 'welcome-page')} data-entrance={entrance.start !== null && entrance.mode !== 'none' ? entrance.mode : undefined}>
      <section className="card glass e-card placeholder" style={vars({ '--i': 0 })} aria-labelledby="ph-h">
        {welcome && <Logo />}
        <h2 id="ph-h" className="ph-q">
          {PAGES[page].question}
        </h2>
        <p className="muted">
          {welcome
            ? 'Picking your city, your mayor and a first trip comes next. You can start with Today and set things up later.'
            : 'This page comes next. Sign-in and Today are ready to try.'}
        </p>
        <Link to="/" className="btn btn-secondary">
          {welcome ? 'Go to Today' : 'Back to Today'}
        </Link>
      </section>
      {page === 'profile' && (
        <section className="card glass e-card" style={vars({ '--i': 1 })} aria-labelledby="display-h">
          <h2 id="display-h" className="card-title">
            Display
          </h2>
          <Switch label="Lite mode" description="Cheaper visuals for slower phones: solid panels and a lighter sky." checked={lite} onChange={setLite} />
          <Switch label="Reduce animations" description="Nothing moves. Every value and icon still shows." checked={reduceAnimations} onChange={setStill} />
          <div className="switch-row">
            <span className="switch-label">Sign out of SugboNow</span>
            <Button variant="secondary" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </section>
      )}
    </div>
  );

  return (
    <EntranceContext.Provider value={entrance}>
      {welcome ? (
        <main id="main" tabIndex={-1} className="page-host">
          {content}
        </main>
      ) : (
        content
      )}
    </EntranceContext.Provider>
  );
}
