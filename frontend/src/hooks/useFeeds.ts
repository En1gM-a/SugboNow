// Read-only feeds filled by the backend's scheduled jobs: brief, alerts, news, weather, mayor posts.

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queries } from '@/lib/queries';
import type { AlertsQuery } from '@/types/api';

export function useBrief() {
  return useQuery(queries.brief());
}

export function useAlerts(q: AlertsQuery = {}) {
  return useQuery({ ...queries.alerts(q), placeholderData: keepPreviousData, select: (d) => d.alerts });
}

export function useNews(limit = 20, area?: string) {
  return useQuery({ ...queries.news(limit, area), placeholderData: keepPreviousData, select: (d) => d.articles });
}

export function useWeatherAll() {
  return useQuery({ ...queries.weatherAll(), select: (d) => d.areas });
}

/** Saved posts without asking the backend to check Facebook. `source` previews another LGU (mock only). */
export function useLguPostsLatest(limit: number, source?: string, enabled = true) {
  return useQuery({ ...queries.lguPostsLatest(limit, source), placeholderData: keepPreviousData, enabled });
}
