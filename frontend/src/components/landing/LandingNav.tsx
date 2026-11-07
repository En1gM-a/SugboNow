import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toggleMode } from '@/lib/display';
import { cx } from '@/utils/cx';
import { Ic } from './parts';

const LINKS: ReadonlyArray<[section: string, label: string]> = [
  ['mornings', 'Mornings'],
  ['app', 'The app'],
  ['checks', 'What it checks'],
  ['how', 'How it works'],
  ['faq', 'FAQ'],
];

interface LandingNavProps {
  paused: boolean;
  isDark: boolean;
  onPause: () => void;
  /** The Explore link: already at the hero, it opens the map as well. */
  onExplore: () => void;
}

/** The floating nav. Its road fills as you scroll and a small jeepney drives along it (lib/landing/pageMotion.ts). */
export const LandingNav = memo(function LandingNav({ paused, isDark, onPause, onExplore }: LandingNavProps) {
  const [menu, setMenu] = useState(false);
  const closeMenu = () => setMenu(false);

  return (
    <header className="lp-nav-wrap">
      <nav className="lp-nav lp-glass" aria-label="Main">
        <span className="lp-nav-road" aria-hidden="true">
          <i className="lp-nav-fill" />
          <span className="lp-nav-jeep lp-to-right">
            <svg viewBox="0 0 150 70" aria-hidden="true">
              <use href="#i-jeep" />
            </svg>
          </span>
        </span>
        <Link className="lp-brand" to="#top">
          <span className="lp-mark" aria-hidden="true" />
          SugboNow
        </Link>
        <div className={cx('lp-nav-links', menu && 'lp-open')} id="nav-links">
          <span className="lp-nav-pill" aria-hidden="true" />
          <Link
            className="lp-nav-link"
            data-sec="top"
            to="#top"
            onClick={() => {
              closeMenu();
              onExplore();
            }}
          >
            Explore
          </Link>
          {LINKS.map(([section, label]) => (
            <Link key={section} className="lp-nav-link" data-sec={section} to={`#${section}`} onClick={closeMenu}>
              {label}
            </Link>
          ))}
          <Link className="lp-nav-link lp-menu-only" to="/login">
            Sign in
          </Link>
        </div>
        <div className="lp-nav-end">
          <button type="button" className="lp-btn lp-btn-icon lp-pause-btn" aria-label="Pause animations" aria-pressed={paused} onClick={onPause}>
            <Ic name="pause" className="lp-ic-pause" />
            <Ic name="play" className="lp-ic-play" />
          </button>
          <button type="button" className="lp-btn lp-btn-icon lp-theme-btn" aria-label="Dark mode" aria-pressed={isDark} onClick={(e) => toggleMode(e.currentTarget)}>
            <span className="lp-ts-sun">
              <Ic name="sun" />
            </span>
            <span className="lp-ts-moon">
              <Ic name="moon" />
            </span>
          </button>
          <Link className="lp-btn lp-btn-secondary lp-sign-btn" to="/login">
            Sign in
          </Link>
          <button type="button" className="lp-btn lp-btn-icon lp-menu-btn" aria-label="Menu" aria-expanded={menu} aria-controls="nav-links" onClick={() => setMenu((open) => !open)}>
            <Ic name="list" className="lp-ic-open" />
            <Ic name="x" className="lp-ic-close" />
          </button>
        </div>
      </nav>
    </header>
  );
});
