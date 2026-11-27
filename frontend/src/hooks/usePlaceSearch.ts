import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useMemo } from 'react';
import { searchPlaces } from '@/lib/placeSearch';
import { queries } from '@/lib/queries';

/** Cebu places matching the text. The list downloads once, the first time `enabled` turns on (the search gets focus). */
export function usePlaceSearch(text: string, near: { lat: number; lng: number }, enabled: boolean) {
  const { data: index, isError, refetch } = useQuery({ ...queries.cebuPlaces(), enabled });
  const query = useDeferredValue(text);
  const { lat, lng } = near;
  const results = useMemo(
    () => (index ? searchPlaces(index, query, { lat, lng }) : []),
    [index, query, lat, lng],
  );
  return {
    results,
    /** The results are for this text, not for what was there a moment ago. */
    ready: !!index && query === text,
    failed: isError,
    retry: () => void refetch(),
  };
}
