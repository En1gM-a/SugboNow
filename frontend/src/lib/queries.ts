// Query keys and options, shared by the hooks and by route prefetching.
// staleTime follows the "Data freshness" table in docs/api-contract.md.

import { queryOptions } from '@tanstack/react-query';
import type {
  AlertsQuery,
  AlertsResponse,
  AreasResponse,
  BriefTodayResponse,
  LguPostsLatestResponse,
  LguSourcesResponse,
  LocationsResponse,
  NewsResponse,
  Profile,
  ScheduleResponse,
  WeatherAllResponse,
} from '@/types/api';
import { apiFetch } from './apiClient';

export const MIN = 60_000;

export const STALE = {
  alerts: 5 * MIN,
  brief: 5 * MIN,
  weather: 15 * MIN,
  news: 10 * MIN,
  posts: 10 * MIN,
  forever: Infinity,
} as const;

export const queries = {
  profile: () => queryOptions({ queryKey: ['profile'], queryFn: () => apiFetch<Profile>('/profile'), staleTime: STALE.forever }),
  areas: () =>
    queryOptions({ queryKey: ['areas'], queryFn: () => apiFetch<AreasResponse>('/areas'), staleTime: STALE.forever, select: (d) => d.areas }),
  lguSources: () =>
    queryOptions({
      queryKey: ['lgu-sources'],
      queryFn: () => apiFetch<LguSourcesResponse>('/lgu-sources'),
      staleTime: STALE.forever,
      select: (d) => d.sources,
    }),
  locations: () =>
    queryOptions({ queryKey: ['locations'], queryFn: () => apiFetch<LocationsResponse>('/locations'), staleTime: STALE.forever }),
  schedule: () =>
    queryOptions({ queryKey: ['schedule'], queryFn: () => apiFetch<ScheduleResponse>('/schedule'), staleTime: STALE.forever }),
  brief: () =>
    queryOptions({
      queryKey: ['brief', 'today'],
      queryFn: () => apiFetch<BriefTodayResponse>('/brief/today'),
      staleTime: STALE.brief,
      refetchInterval: STALE.brief,
    }),
  alerts: (q: AlertsQuery = {}) => {
    const params = new URLSearchParams();
    if (q.type?.length) params.set('type', q.type.join(','));
    if (q.severity?.length) params.set('severity', q.severity.join(','));
    if (q.area) params.set('area', q.area);
    if (q.relevant) params.set('relevant', 'true');
    if (q.limit) params.set('limit', String(q.limit));
    const qs = params.toString();
    return queryOptions({
      queryKey: ['alerts', qs],
      queryFn: () => apiFetch<AlertsResponse>(`/alerts${qs ? `?${qs}` : ''}`),
      staleTime: STALE.alerts,
      // Refetch every 5 minutes while the tab is visible (TanStack pauses in background tabs).
      refetchInterval: STALE.alerts,
    });
  },
  news: (limit = 20, area?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (area) params.set('area', area);
    return queryOptions({
      queryKey: ['news', limit, area ?? ''],
      queryFn: () => apiFetch<NewsResponse>(`/news?${params}`),
      staleTime: STALE.news,
    });
  },
  weatherAll: () =>
    queryOptions({ queryKey: ['weather'], queryFn: () => apiFetch<WeatherAllResponse>('/weather'), staleTime: STALE.weather }),
  lguPostsLatest: (limit: number, source?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (source) params.set('source', source);
    return queryOptions({
      queryKey: ['lgu-posts', 'latest', limit, source ?? 'mine'],
      queryFn: () => apiFetch<LguPostsLatestResponse>(`/lgu-posts/latest?${params}`),
      staleTime: STALE.posts,
    });
  },
};
