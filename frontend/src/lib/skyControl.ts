// Lets a page borrow the one sky behind the app (components/Sky.tsx) for as long as it's on screen. The landing page
// uses it to walk the sky through a day as you scroll, and to give each happening its own weather.

import { useSyncExternalStore } from 'react';
import type { SkyHandle, SkyMix, SkyWeather } from './sky';
import type { TimeName } from './time';

export interface SkyScene {
  time: TimeName;
  weather: SkyWeather;
  mix?: SkyMix;
}

interface SkyControl {
  /** The sky a page asks for, instead of the Manila clock and the user's weather. */
  scene: SkyScene | null;
  /** A page's own pause button holds the sky still too, without changing the user's saved preference. */
  paused: boolean;
}

const released: SkyControl = { scene: null, paused: false };
let control = released;
let handle: SkyHandle | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSkyControl(): SkyControl {
  return useSyncExternalStore(subscribe, () => control);
}

export function controlSky(scene: SkyScene, paused: boolean) {
  control = { scene, paused };
  listeners.forEach((listener) => listener());
}

export function releaseSky() {
  control = released;
  listeners.forEach((listener) => listener());
}

/** Components/Sky.tsx registers its canvas here, so moment-to-moment nudges don't go through React. */
export function attachSky(next: SkyHandle | null) {
  handle = next;
}

export const nudgeSky = {
  wind: (speed: number) => handle?.setWind(speed),
  pointer: (x: number, y: number) => handle?.setPointer(x, y),
};
