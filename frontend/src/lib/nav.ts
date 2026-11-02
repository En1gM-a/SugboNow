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

/** Today's main queries, fetched as soon as sign-in succeeds so the page opens with its data. */
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
  void loadPlaceholderPage();
}
