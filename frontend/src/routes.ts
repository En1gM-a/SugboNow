// Route chunks and their main queries, so nav links can preload both on hover/focus/touch.

import { lazy } from 'react';
import { queries } from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';
import type { IconName } from '@/components/ui/Icon';

const loaders = {
  '/news': () => import('@/pages/NewsPage'),
  '/mayor': () => import('@/pages/MayorPage'),
  '/weather': () => import('@/pages/WeatherPage'),
  '/traffic': () => import('@/pages/TrafficPage'),
  '/profile': () => import('@/pages/ProfilePage'),
} as const;

export const NewsPage = lazy(loaders['/news']);
export const MayorPage = lazy(loaders['/mayor']);
export const WeatherPage = lazy(loaders['/weather']);
export const TrafficPage = lazy(loaders['/traffic']);
export const ProfilePage = lazy(loaders['/profile']);

const prefetchers: Record<string, () => unknown[]> = {
  '/': () => [queryClient.prefetchQuery(queries.brief())],
  '/news': () => [queryClient.prefetchQuery(queries.news(50))],
  '/mayor': () => [queryClient.prefetchQuery(queries.lguPostsLatest(10)), queryClient.prefetchQuery(queries.lguSources())],
  '/weather': () => [queryClient.prefetchQuery(queries.weatherAll()), queryClient.prefetchQuery(queries.alerts({ type: ['weather', 'flood'] }))],
  '/traffic': () => [queryClient.prefetchQuery(queries.alerts({ type: ['traffic', 'closure', 'flood'] }))],
  '/profile': () => [queryClient.prefetchQuery(queries.profile()), queryClient.prefetchQuery(queries.locations()), queryClient.prefetchQuery(queries.schedule())],
};

export function preloadRoute(path: string) {
  if (path in loaders) void loaders[path as keyof typeof loaders]();
  // prefetchQuery skips data that is still fresh, so repeated hovers are cheap.
  prefetchers[path]?.();
}

export const NAV: Array<{ to: string; label: string; short: string; icon: IconName }> = [
  { to: '/', label: 'Today', short: 'Today', icon: 'home' },
  { to: '/news', label: 'Cebu News', short: 'News', icon: 'news' },
  { to: '/mayor', label: 'Mayor', short: 'Mayor', icon: 'megaphone' },
  { to: '/weather', label: 'Weather', short: 'Weather', icon: 'cloudRain' },
  { to: '/traffic', label: 'Traffic', short: 'Traffic', icon: 'map' },
  { to: '/profile', label: 'Profile', short: 'Me', icon: 'user' },
];
