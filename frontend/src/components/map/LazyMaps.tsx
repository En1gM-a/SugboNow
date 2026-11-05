// Lazy wrappers: Leaflet downloads only when one of these renders.

import { lazy, Suspense, type ComponentProps } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

const load = () => import('./maps');
const AlertsMap = lazy(() => load().then((mod) => ({ default: mod.AlertsMap })));
const WeatherMap = lazy(() => load().then((mod) => ({ default: mod.WeatherMap })));
const PinDropMap = lazy(() => load().then((mod) => ({ default: mod.PinDropMap })));

export type { MapPlace } from './maps';

export function LazyAlertsMap(props: ComponentProps<typeof AlertsMap>) {
  return (
    <Suspense fallback={<Skeleton className="map-skel" />}>
      <AlertsMap {...props} />
    </Suspense>
  );
}

export function LazyWeatherMap(props: ComponentProps<typeof WeatherMap>) {
  return (
    <Suspense fallback={<Skeleton className="map-skel" />}>
      <WeatherMap {...props} />
    </Suspense>
  );
}

export function LazyPinDropMap(props: ComponentProps<typeof PinDropMap>) {
  return (
    <Suspense fallback={<Skeleton className="map-skel pin-skel" />}>
      <PinDropMap {...props} />
    </Suspense>
  );
}
