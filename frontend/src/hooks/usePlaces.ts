// Saved places and weekly trips, with optimistic create/update/delete.

import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { ApiError, apiFetch, jsonBody } from '@/lib/apiClient';
import { queries } from '@/lib/queries';
import { toast } from '@/lib/toast';
import type {
  Location,
  LocationInput,
  LocationsResponse,
  ScheduleEntry,
  ScheduleInput,
  ScheduleResponse,
} from '@/types/api';

export function useLocations() {
  return useQuery({ ...queries.locations(), select: (d) => d.locations });
}

export function useSchedule() {
  return useQuery({ ...queries.schedule(), select: (d) => d.entries });
}

function useListMutation<TVars, TResult, TList>(opts: {
  key: QueryKey;
  request: (vars: TVars) => Promise<TResult>;
  optimistic: (list: TList, vars: TVars) => TList;
  errorMessage: (err: unknown) => string | null;
  alsoInvalidate?: QueryKey[];
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: opts.request,
    onMutate: async (vars: TVars) => {
      await qc.cancelQueries({ queryKey: opts.key });
      const previous = qc.getQueryData<TList>(opts.key);
      if (previous) qc.setQueryData<TList>(opts.key, opts.optimistic(previous, vars));
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(opts.key, ctx.previous);
      const message = opts.errorMessage(err);
      if (message) toast.error(message);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: opts.key });
      void qc.invalidateQueries({ queryKey: ['brief'] });
      for (const k of opts.alsoInvalidate ?? []) void qc.invalidateQueries({ queryKey: k });
    },
  });
}

/** Validation errors are shown next to the fields, so only toast other failures. */
const unlessValidation = (fallback: string) => (err: unknown) =>
  err instanceof ApiError && err.code === 'invalid_request' ? null : fallback;

export function useSaveLocation() {
  return useListMutation<{ id?: string; input: LocationInput }, Location, LocationsResponse>({
    key: queries.locations().queryKey,
    request: ({ id, input }) =>
      id ? apiFetch<Location>(`/locations/${id}`, jsonBody('PUT', input)) : apiFetch<Location>('/locations', jsonBody('POST', input)),
    optimistic: (list, { id, input }) => {
      const now = new Date().toISOString();
      return {
        locations: id
          ? list.locations.map((l) => (l.id === id ? { ...l, ...input, updatedAt: now } : l))
          : [...list.locations, { id: `temp-${now}`, ...input, createdAt: now, updatedAt: now }],
      };
    },
    errorMessage: unlessValidation("Couldn't save that place. Please try again."),
    alsoInvalidate: [['schedule']],
  });
}

export function useDeleteLocation() {
  return useListMutation<string, void, LocationsResponse>({
    key: queries.locations().queryKey,
    request: (id) => apiFetch<void>(`/locations/${id}`, { method: 'DELETE' }),
    optimistic: (list, id) => ({ locations: list.locations.filter((l) => l.id !== id) }),
    errorMessage: (err) =>
      err instanceof ApiError && err.status === 409
        ? 'A weekly trip still uses this place. Change or delete that trip first.'
        : "Couldn't delete that place. Please try again.",
    alsoInvalidate: [['profile']],
  });
}

function placeRef(locations: Location[] | undefined, id: string) {
  const l = locations?.find((x) => x.id === id);
  return { id, label: l?.label ?? '…', kind: l?.kind ?? ('other' as const) };
}

export function useSaveTrip() {
  const qc = useQueryClient();
  return useListMutation<{ id?: string; input: ScheduleInput }, ScheduleEntry, ScheduleResponse>({
    key: queries.schedule().queryKey,
    request: ({ id, input }) =>
      id ? apiFetch<ScheduleEntry>(`/schedule/${id}`, jsonBody('PUT', input)) : apiFetch<ScheduleEntry>('/schedule', jsonBody('POST', input)),
    optimistic: (list, { id, input }) => {
      const now = new Date().toISOString();
      const locs = qc.getQueryData<LocationsResponse>(queries.locations().queryKey)?.locations;
      const entry = {
        ...input,
        origin: placeRef(locs, input.originLocationId),
        destination: placeRef(locs, input.destinationLocationId),
        updatedAt: now,
      };
      return {
        entries: id
          ? list.entries.map((e) => (e.id === id ? { ...e, ...entry } : e))
          : [...list.entries, { id: `temp-${now}`, createdAt: now, ...entry }].sort((a, b) => a.arriveBy.localeCompare(b.arriveBy)),
      };
    },
    errorMessage: unlessValidation("Couldn't save that trip. Please try again."),
  });
}

export function useDeleteTrip() {
  return useListMutation<string, void, ScheduleResponse>({
    key: queries.schedule().queryKey,
    request: (id) => apiFetch<void>(`/schedule/${id}`, { method: 'DELETE' }),
    optimistic: (list, id) => ({ entries: list.entries.filter((e) => e.id !== id) }),
    errorMessage: () => "Couldn't delete that trip. Please try again.",
  });
}
