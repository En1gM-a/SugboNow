// Lazy wrappers: Leaflet downloads only when one of these renders.
// LazyAlertsMap can also wait until it scrolls into view (Dashboard mini map).

import { lazy, Suspense, type ComponentProps } from 'react';
import { useInView } from '@/hooks/useBrowser';
import { cx } from '@/utils/cx';
import { Icon } from '../ui/Icon';

const load = () => import('./maps');
const AlertsMap = lazy(() => load().then((m) => ({ default: m.AlertsMap })));
const WeatherMap = lazy(() => load().then((m) => ({ default: m.WeatherMap })));
const PinDropMap = lazy(() => load().then((m) => ({ default: m.PinDropMap })));

export type { MapPlace } from './maps';

function MapPlaceholder({ className, label = 'Loading map…' }: { className?: string; label?: string }) {
  return (
    <div className={cx('flex items-center justify-center bg-skeleton text-muted', className)}>
      <span className="inline-flex items-center gap-2 text-sm">
        <Icon name="map" size={18} />
        {label}
      </span>
    </div>
  );
}

export function LazyAlertsMap({ whenVisible, className, ...props }: ComponentProps<typeof AlertsMap> & { whenVisible?: boolean }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const show = !whenVisible || inView;
  return (
    <div ref={ref} className={className}>
      {show ? (
        <Suspense fallback={<MapPlaceholder className="size-full" />}>
          <AlertsMap {...props} className="size-full" />
        </Suspense>
      ) : (
        <MapPlaceholder className="size-full" label="Map loads when you scroll here" />
      )}
    </div>
  );
}

export function LazyWeatherMap({ className, ...props }: ComponentProps<typeof WeatherMap>) {
  return (
    <Suspense fallback={<MapPlaceholder className={className} />}>
      <WeatherMap {...props} className={className} />
    </Suspense>
  );
}

export function LazyPinDropMap({ className, ...props }: ComponentProps<typeof PinDropMap>) {
  return (
    <Suspense fallback={<MapPlaceholder className={className} />}>
      <PinDropMap {...props} className={className} />
    </Suspense>
  );
}

export const SEVERITY_HEX = { high: '#B91C1C', medium: '#B45309', low: '#475569' } as const;
