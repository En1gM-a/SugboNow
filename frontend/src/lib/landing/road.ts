// What happens on the road at the end of the landing page, in the order diorama/road/scenes.js plays it: its button, and
// the sky behind it.

import type { SkyScene } from '@/lib/skyControl';

export const ROAD_SCENES: ReadonlyArray<{ id: string; label: string; icon: string; sky: SkyScene }> = [
  { id: 'clear', label: 'Clear', icon: '#i-jeep', sky: { time: 'buntag', weather: 'clear' } },
  { id: 'rush', label: 'Rush hour', icon: '#i-traffic', sky: { time: 'buntag', weather: 'cloudy', mix: { clouds: 5 } } },
  { id: 'festival', label: 'Festival', icon: '#i-drum', sky: { time: 'udto', weather: 'clear' } },
  { id: 'rain', label: 'Heavy rain', icon: '#i-rain', sky: { time: 'udto', weather: 'rain' } },
  { id: 'flood', label: 'Flood', icon: '#i-flood', sky: { time: 'hapon', weather: 'rain' } },
  { id: 'bagyo', label: 'Bagyo', icon: '#i-typhoon', sky: { time: 'gabii', weather: 'storm' } },
  { id: 'works', label: 'Road works', icon: '#i-closure', sky: { time: 'gabii', weather: 'clear' } },
];
