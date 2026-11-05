import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ApiError, apiFetch, jsonBody } from '@/lib/apiClient';
import { queries } from '@/lib/queries';
import { toast } from '@/lib/toast';
import type { Profile, ProfilePatch } from '@/types/api';

/** The signed-in user's profile. It never goes stale on its own; invalidate it after your own edits. */
export function useProfile() {
  const { status } = useAuth();
  return useQuery({ ...queries.profile(), enabled: status === 'signedIn' });
}

/** PATCH /api/profile: the screen updates first, and it rolls back with a toast if the API refuses. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  const key = queries.profile().queryKey;
  return useMutation({
    mutationFn: (patch: ProfilePatch) => apiFetch<Profile>('/profile', jsonBody('PATCH', patch)),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Profile>(key);
      if (previous) qc.setQueryData<Profile>(key, { ...previous, ...patch });
      return { previous };
    },
    onError: (err, _patch, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      // Validation errors show next to their fields instead.
      if (!(err instanceof ApiError && err.code === 'invalid_request')) toast.error("Couldn't save that. Your previous details are back.");
    },
    onSuccess: (profile) => qc.setQueryData(key, profile),
    onSettled: () => {
      // The city, the mayor and the commute all feed the brief and the mayor's posts.
      void qc.invalidateQueries({ queryKey: ['brief'] });
      void qc.invalidateQueries({ queryKey: ['lgu-posts'] });
    },
  });
}

export function useAreas() {
  return useQuery(queries.areas());
}

export function useLguSources() {
  return useQuery(queries.lguSources());
}
