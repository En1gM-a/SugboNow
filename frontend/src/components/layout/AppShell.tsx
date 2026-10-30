// Navy header with the Sinulog ribbon, top nav on desktop, bottom tab bar on phones,
// skip link, offline banner, and focus moved to the page's h1 on every route change.

import { Suspense, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useOnline } from '@/hooks/useBrowser';
import { NAV, preloadRoute } from '@/routes';
import { cx } from '@/utils/cx';
import { formatTime } from '@/utils/format';
import { Icon } from '../ui/Icon';
import { SinulogRibbon } from '../ui/Card';
import { ThemeToggle } from './ThemeToggle';
import { PageSkeleton } from './PageSkeleton';

export function Logo({ onDark = true }: { onDark?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight', onDark ? 'text-white' : 'text-ink')}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#C8102E" />
        <path d="M6 20c4-7 8 3 12-4s6-6 8-5" fill="none" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
        <path d="M6 25c4-6 8 2 12-3s6-5 8-4" fill="none" stroke="#FFF8EC" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      Sugbo Now
    </span>
  );
}

function prefetchProps(to: string) {
  return { onMouseEnter: () => preloadRoute(to), onFocus: () => preloadRoute(to), onTouchStart: () => preloadRoute(to) };
}

function OfflineBanner() {
  const online = useOnline();
  const qc = useQueryClient();
  if (online) return null;
  // "Info from" means when the cached data was fetched, not when the connection dropped.
  const lastFetched = Math.max(0, ...qc.getQueryCache().getAll().map((q) => q.state.dataUpdatedAt));
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-marigold px-4 py-2 text-sm font-semibold text-on-accent">
      <Icon name="wifiOff" size={16} />
      {lastFetched ? `You’re offline. Showing info from ${formatTime(new Date(lastFetched))}.` : 'You’re offline. Connect to load your brief.'}
    </div>
  );
}

/** Connection and refresh status, always visible in the header. */
function LiveStatus() {
  const online = useOnline();
  const fetching = useIsFetching() > 0;
  return (
    <span className="inline-flex min-w-[5.5rem] items-center justify-end gap-1.5 text-xs font-semibold text-white/80">
      <span aria-hidden="true" className={cx('size-2 rounded-full', online ? 'bg-live' : 'bg-marigold')} />
      {!online ? 'Offline' : fetching ? 'Updating…' : 'Live'}
    </span>
  );
}

export function AppShell() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);

  // Move focus to the new page's h1 (not on first load, to keep the browser's default).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    const t = setTimeout(() => mainRef.current?.querySelector<HTMLElement>('[data-page-heading]')?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0">
      <a
        href="#main"
        className="sr-only z-50 rounded-xl bg-marigold px-4 py-3 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 bg-mactan-navy">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-16 lg:px-8">
          <NavLink to="/" className="rounded-lg focus-visible:outline-marigold" aria-label="Sugbo Now, today" {...prefetchProps('/')}>
            <Logo />
          </NavLink>
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    {...prefetchProps(item.to)}
                    className={({ isActive }) =>
                      cx(
                        'relative flex min-h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-marigold',
                        isActive ? 'text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon name={item.icon} size={18} />
                        {item.label}
                        {isActive && <span aria-hidden="true" className="absolute inset-x-3 -bottom-[10px] h-[3px] rounded-full bg-sinulog-red" />}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-1">
            <LiveStatus />
            <ThemeToggle />
          </div>
        </div>
        <SinulogRibbon />
      </header>
      <OfflineBanner />

      <main id="main" ref={mainRef} className="mx-auto max-w-6xl px-4 pt-5 pb-10 sm:px-6 sm:pt-7 lg:px-8">
        <Suspense fallback={<PageSkeleton />}>
          <div key={location.pathname} className="animate-page-in motion-reduce:animate-fade-in">
            <Outlet />
          </div>
        </Suspense>
      </main>

      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-mactan-navy lg:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-6">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                {...prefetchProps(item.to)}
                className={({ isActive }) =>
                  cx(
                    'relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-marigold focus-visible:-outline-offset-4',
                    isActive ? 'text-white' : 'text-white/70 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span aria-hidden="true" className="absolute inset-x-4 top-0 h-[3px] rounded-b-full bg-sinulog-red" />}
                    <Icon name={item.icon} size={22} />
                    {item.short}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
