import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Sky } from '@/components/Sky';
import { useAuth } from '@/context/AuthContext';
import { useWeather } from '@/hooks/useFeeds';
import { useProfile } from '@/hooks/useProfile';
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

/** Everything outside the routes: the live sky behind the whole app. */
export function RootLayout() {
  const weather = useSkyWeather();
  return (
    <>
      <Sky weather={weather} />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
