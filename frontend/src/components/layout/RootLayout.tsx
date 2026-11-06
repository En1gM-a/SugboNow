import { useEffect } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Sky } from '@/components/Sky';
import { Toaster } from '@/components/ui/Toaster';
import { useAuth } from '@/context/AuthContext';
import { useWeather } from '@/hooks/useFeeds';
import { useProfile } from '@/hooks/useProfile';
import { preloadRide } from '@/lib/rideBridge';
import type { SkyWeather } from '@/lib/sky';
import { skyWeather, weatherKind } from '@/lib/weatherKind';

/**
 * Signed out, the sky rains like the design reference the team chose (the "SugboNow Glass" sample). Signed in, it
 * follows the weather in the user's home city from GET /api/weather/:area, and is clear when there is none.
 */
function useSkyWeather(): SkyWeather {
  const { status } = useAuth();
  const profile = useProfile();
  const city = status === 'signedIn' ? profile.data?.city : null;
  const weather = useWeather(city);
  if (status !== 'signedIn') return 'rain';
  if (weather.data) return skyWeather(weatherKind(weather.data.current.iconUrl));
  if (weather.isError || profile.isError || (profile.isSuccess && !profile.data.city)) return 'clear';
  return 'rain';
}

/**
 * Everything outside the routes: the sky behind the app, and the jeepney and its smoke in front of it. Both layers
 * are fixed at the app root so they survive a route change, and no ancestor of the auth card or the jeepney sets
 * z-index, transform, opacity or filter, which would break their stacking order (handoff <motion>, Layers).
 */
export function RootLayout() {
  const weather = useSkyWeather();
  const { status } = useAuth();

  // The ride only runs on the way in, so a signed-in visitor doesn't download it.
  useEffect(() => {
    if (status === 'signedOut') preloadRide();
  }, [status]);

  return (
    <>
      <Sky weather={weather} />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Outlet />
      <Toaster />
      <div id="jeep-lane" className="jeep-lane" aria-hidden="true" />
      <div id="smoke" className="smoke" aria-hidden="true" />
      <ScrollRestoration />
    </>
  );
}
