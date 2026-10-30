// The signed-in user's profile, with an optimistic PATCH.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, jsonBody } from '@/lib/apiClient';
import { queries } from '@/lib/queries';
import { toast } from '@/lib/toast';
import type { Profile, ProfilePatch } from '@/types/api';

export function useProfile() {
  return useQuery(queries.profile());
}

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
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      toast.error("Couldn't save your profile. Your previous details are back.");
    },
    onSuccess: (profile) => qc.setQueryData(key, profile),
    onSettled: () => {
      // City, mayor and commute places all feed the brief and the mayor's posts.
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
