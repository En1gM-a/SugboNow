// Latest official Facebook posts from the user's subscribed mayor/governor.
//
// Runs once per signed-in user: it asks the backend to check the page for new
// posts (the browser never contacts Facebook) and returns the 2 latest saved
// posts. Pass the signed-in user's id, or null while signed out.
//
//   const { data, isPending } = useLguPosts(session?.user.id ?? null);
//   data?.posts.map(...)

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import type { LguPostsRefreshResponse } from '@/types/api';

export function useLguPosts(userId: string | null) {
  return useQuery({
    queryKey: ['lgu-posts', userId],
    queryFn: () => apiFetch<LguPostsRefreshResponse>('/lgu-posts/refresh', { method: 'POST' }),
    enabled: userId !== null,
    // Matches the backend's per-page check interval; no point asking sooner.
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
