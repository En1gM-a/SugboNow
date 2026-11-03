import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useState } from 'react';
import { NavLink, useLocation, useOutlet } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { useAuth } from '@/context/AuthContext';
import { useStretchyPill } from '@/hooks/useStretchyPill';
import { useDisplay } from '@/lib/display';
import { pages } from '@/lib/entrance';
import { activeTab, preloadRoute, TABS } from '@/lib/nav';
import { resetBell } from './Bell';
import { Header } from './Header';

/** Keeps the outlet it had when it mounted, so a leaving page keeps showing its own content while it exits. */
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

const preload = (to: string) => ({
  onPointerEnter: () => preloadRoute(to),
  onFocus: () => preloadRoute(to),
  onTouchStart: () => preloadRoute(to),
});

/** Desktop (≥ 1024px): a floating dark glass rail with the logo mark, the five tabs, a divider and Sign out. */
function NavRail({ onSignOut }: { onSignOut: () => void }) {
  const { pathname } = useLocation();
  const { box, pill } = useStretchyPill('y', activeTab(pathname), 999);
  return (
    <nav className="rail night" aria-label="Main">
      <span className="mark rail-mark" aria-hidden="true" />
      <div className="rail-tabs" ref={box}>
        <span className="rail-pill" ref={pill} aria-hidden="true" />
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className="rail-btn" data-tab aria-label={tab.label} title={tab.label} {...preload(tab.to)}>
            <Icon name={tab.icon} />
          </NavLink>
        ))}
      </div>
      <span className="rail-sep" aria-hidden="true" />
      <button type="button" className="rail-btn rail-out" aria-label="Sign out" title="Sign out" onClick={onSignOut}>
        <Icon name="sign-out" />
      </button>
    </nav>
  );
}

/** Phones and tablets (< 1024px): a floating glass tab bar, fixed 10px above the bottom edge. */
function TabBar() {
  const { pathname } = useLocation();
  const { box, pill } = useStretchyPill('x', activeTab(pathname), 18);
  return (
    <nav className="tabbar glass" aria-label="Main">
      <div className="tabbar-tabs" ref={box}>
        <span className="tab-pill" ref={pill} aria-hidden="true" />
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className="tab" data-tab {...preload(tab.to)}>
            <Icon name={tab.icon} />
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/**
 * The app shell for signed-in pages (handoff <layout>). Everything floats on the sky; the header, tabs and rail stay
 * still. Only the content area moves between pages: the leaving page fades, shrinks slightly and blurs (200 ms),
 * then the new page plays its own entrance.
 */
export function AppShell() {
  const location = useLocation();
  const { lite, still } = useDisplay();
  const { signOut } = useAuth();

  // Still mode keeps only a short fade (120 ms); Lite mode drops the blur.
  const leave = still ? { opacity: 0 } : { opacity: 0, scale: 0.985, ...(lite ? {} : { filter: 'blur(8px)' }) };

  const handleSignOut = () => {
    pages.forget();
    resetBell();
    void signOut();
  };

  return (
    <div className="app">
      <NavRail onSignOut={handleSignOut} />
      <div className="shell">
        <Header />
        <main id="main" className="page-host" tabIndex={-1}>
          <AnimatePresence mode="wait" initial={false}>
            <m.div key={location.pathname} className="page-slot" exit={leave} transition={{ duration: still ? 0.12 : 0.2, ease: [0.32, 0, 0.67, 0] }}>
              <FrozenOutlet />
            </m.div>
          </AnimatePresence>
        </main>
      </div>
      <TabBar />
    </div>
  );
}
