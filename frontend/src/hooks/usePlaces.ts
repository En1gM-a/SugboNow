// Saved places and weekly trips. Edits update the screen first and roll back with a toast if the API refuses.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch, jsonBody } from '@/lib/apiClient';
import { queries } from '@/lib/queries';
import { toast } from '@/lib/toast';
import type { Location, LocationInput, LocationsResponse, PlaceRef, ScheduleEntry, ScheduleInput, ScheduleResponse } from '@/types/api';

const LOCATIONS = queries.locations().queryKey;
const SCHEDULE = queries.schedule().queryKey;

export function useLocations() {
  return useQuery({ ...queries.locations(), select: (d) => d.locations });
}

export function useSchedule() {
  return useQuery({ ...queries.schedule(), select: (d) => d.entries });
}

/** The road routes between two saved places, with and without CCLEX (GET /api/routes). Off until both are known. */
export function useRoutes(from: string | null | undefined, to: string | null | undefined) {
  return useQuery({ ...queries.routes(from ?? '', to ?? ''), enabled: Boolean(from && to && from !== to) });
}

/** Validation errors show next to their fields, so only other failures get a toast. */
const unlessValidation = (err: unknown, message: string) => {
  if (!(err instanceof ApiError && err.code === 'invalid_request')) toast.error(message);
};

export function useSaveLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: LocationInput }) =>
      id ? apiFetch<Location>(`/locations/${id}`, jsonBody('PUT', input)) : apiFetch<Location>('/locations', jsonBody('POST', input)),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: LOCATIONS });
      const previous = qc.getQueryData<LocationsResponse>(LOCATIONS);
      const now = new Date().toISOString();
      const tempId = `temp-${now}`;
      if (previous) {
        qc.setQueryData<LocationsResponse>(LOCATIONS, {
          locations: id
            ? previous.locations.map((l) => (l.id === id ? { ...l, ...input, updatedAt: now } : l))
            : [...previous.locations, { id: tempId, ...input, createdAt: now, updatedAt: now }],
        });
      }
      return { previous, tempId };
    },
    // Swap the temporary row for the real one before the caller continues: a trip can't point at a temporary id.
    onSuccess: (saved, { id }, ctx) => {
      qc.setQueryData<LocationsResponse>(LOCATIONS, (list) =>
        list ? { locations: list.locations.map((l) => (l.id === (id ?? ctx?.tempId) ? saved : l)) } : list,
      );
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(LOCATIONS, ctx.previous);
      unlessValidation(err, "Couldn't save that place. Please try again.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: LOCATIONS });
      void qc.invalidateQueries({ queryKey: SCHEDULE });
      void qc.invalidateQueries({ queryKey: ['brief'] });
      void qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/locations/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: LOCATIONS });
      const previous = qc.getQueryData<LocationsResponse>(LOCATIONS);
      if (previous) qc.setQueryData<LocationsResponse>(LOCATIONS, { locations: previous.locations.filter((l) => l.id !== id) });
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(LOCATIONS, ctx.previous);
      toast.error(
        err instanceof ApiError && err.status === 409
          ? 'A weekly trip still uses this place. Change or delete that trip first.'
          : "Couldn't delete that place. Please try again.",
      );
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: LOCATIONS });
      void qc.invalidateQueries({ queryKey: ['profile'] });
      void qc.invalidateQueries({ queryKey: ['brief'] });
      void qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

function placeRef(locations: Location[] | undefined, id: string): PlaceRef {
  const place = locations?.find((l) => l.id === id);
  return { id, label: place?.label ?? 'Saved place', kind: place?.kind ?? 'other' };
}

export function useSaveTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ScheduleInput }) =>
      id ? apiFetch<ScheduleEntry>(`/schedule/${id}`, jsonBody('PUT', input)) : apiFetch<ScheduleEntry>('/schedule', jsonBody('POST', input)),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: SCHEDULE });
      const previous = qc.getQueryData<ScheduleResponse>(SCHEDULE);
      const now = new Date().toISOString();
      const tempId = `temp-${now}`;
      if (previous) {
        const places = qc.getQueryData<LocationsResponse>(LOCATIONS)?.locations;
        const entry = { ...input, origin: placeRef(places, input.originLocationId), destination: placeRef(places, input.destinationLocationId), updatedAt: now };
        qc.setQueryData<ScheduleResponse>(SCHEDULE, {
          entries: id
            ? previous.entries.map((e) => (e.id === id ? { ...e, ...entry } : e))
            : [...previous.entries, { id: tempId, createdAt: now, ...entry }].sort((a, b) => a.arriveBy.localeCompare(b.arriveBy)),
        });
      }
      return { previous, tempId };
    },
    onSuccess: (saved, { id }, ctx) => {
      qc.setQueryData<ScheduleResponse>(SCHEDULE, (list) =>
        list ? { entries: list.entries.map((e) => (e.id === (id ?? ctx?.tempId) ? saved : e)) } : list,
      );
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(SCHEDULE, ctx.previous);
      unlessValidation(err, "Couldn't save that trip. Please try again.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: SCHEDULE });
      void qc.invalidateQueries({ queryKey: ['brief'] });
    },
  });
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/schedule/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: SCHEDULE });
      const previous = qc.getQueryData<ScheduleResponse>(SCHEDULE);
      if (previous) qc.setQueryData<ScheduleResponse>(SCHEDULE, { entries: previous.entries.filter((e) => e.id !== id) });
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(SCHEDULE, ctx.previous);
      toast.error("Couldn't delete that trip. Please try again.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: SCHEDULE });
      void qc.invalidateQueries({ queryKey: ['brief'] });
    },
  });
}
