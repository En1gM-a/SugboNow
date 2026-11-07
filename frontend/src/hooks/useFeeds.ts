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

export function useNews(limit = 20, area?: string, enabled = true) {
  return useQuery({ ...queries.news(limit, area), placeholderData: keepPreviousData, select: (d) => d.articles, enabled });
}

export function useWeatherAll() {
  return useQuery({ ...queries.weatherAll(), select: (d) => d.areas });
}

/** PAGASA's Visayas forecast. A 404 (nothing saved yet) is an error, and the panel stays hidden. */
export function usePagasa() {
  return useQuery(queries.pagasa());
}

/** One area's weather, e.g. the user's home city. Waits until the area is known. */
export function useWeather(area: string | null | undefined) {
  return useQuery({ ...queries.weather(area ?? ''), enabled: Boolean(area) });
}

/** Saved posts without asking the backend to check Facebook. `source` previews another LGU (mock only). */
export function useLguPostsLatest(limit: number, source?: string, enabled = true) {
  return useQuery({ ...queries.lguPostsLatest(limit, source), placeholderData: keepPreviousData, enabled });
}
