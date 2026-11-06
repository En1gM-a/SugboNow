// The five tabs in the tab bar (phones and tablets) and the nav rail (desktop), and route preloading.

import type { IconName } from '@/components/icons/Icon';
import { queries } from './queries';
import { queryClient } from './queryClient';

export const TABS: ReadonlyArray<{ to: string; label: string; icon: IconName }> = [
  { to: '/', label: 'Today', icon: 'house' },
  { to: '/news', label: 'News', icon: 'newspaper' },
  { to: '/mayor', label: 'Mayor', icon: 'megaphone' },
  { to: '/weather', label: 'Weather', icon: 'cloud-sun' },
  { to: '/traffic', label: 'Traffic', icon: 'traffic-signal' },
];

/** The active tab for a path, or -1 for pages that aren't tabs (Profile, onboarding). */
export function activeTab(pathname: string): number {
  return TABS.findIndex((t) => (t.to === '/' ? pathname === '/' : pathname === t.to || pathname.startsWith(`${t.to}/`)));
}

export const loadPlaceholderPage = () => import('@/pages/PlaceholderPage');
export const loadWelcomePage = () => import('@/pages/WelcomePage');
export const loadNewsPage = () => import('@/pages/NewsPage');
export const loadMayorPage = () => import('@/pages/MayorPage');
export const loadWeatherPage = () => import('@/pages/WeatherPage');
export const loadTrafficPage = () => import('@/pages/TrafficPage');

/** Today's main queries, fetched while the log-in smoke covers the screen so the page opens with its data. */
export function prefetchToday() {
  void queryClient.prefetchQuery(queries.profile());
  void queryClient.prefetchQuery(queries.brief());
  void queryClient.prefetchQuery(queries.news(3));
  void queryClient.prefetchQuery(queries.alerts({ relevant: true }));
}

/** When a tab is hovered, focused or touched: load its page's code and prefetch its main query. */
export function preloadRoute(to: string) {
  if (to === '/') {
    void queryClient.prefetchQuery(queries.brief());
    void queryClient.prefetchQuery(queries.news(3));
    return;
  }
  if (to === '/news') {
    void loadNewsPage();
    void queryClient.prefetchQuery(queries.news(50));
    void queryClient.prefetchQuery(queries.areas());
    return;
  }
  if (to === '/mayor') {
    void loadMayorPage();
    void queryClient.prefetchQuery(queries.lguSources());
    void queryClient.prefetchQuery(queries.lguPostsLatest(10));
    return;
  }
  if (to === '/weather') {
    void loadWeatherPage();
    void queryClient.prefetchQuery(queries.weatherAll());
    return;
  }
  if (to === '/traffic') {
    void loadTrafficPage();
    void queryClient.prefetchQuery(queries.locations());
    void queryClient.prefetchQuery(queries.schedule());
    void queryClient.prefetchQuery(queries.alerts({ relevant: true }));
    return;
  }
  void loadPlaceholderPage();
}
