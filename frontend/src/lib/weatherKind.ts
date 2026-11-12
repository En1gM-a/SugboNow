// How the app reads conditions (handoff <icons>): the live icon for a weather report or an alert, the sky to draw,
// and the advice line under "Weather now".

import type { LiveKind } from '@/components/liveIconArt';
import type { Alert, WeatherHour } from '@/types/api';
import type { SkyWeather } from './sky';

const RAIN2 = [263, 266, 293, 296, 353];
const RAIN3 = [299, 302, 356];
const RAIN4 = [305, 308, 359];
const STORM = [200, 386, 389];

/** Rain counts as likely from this chance of rain, here, in rainAdvice(), the weather alerts and the brief. */
export const RAIN_LIKELY = 70;
/** WeatherAPI's "Patchy rain nearby". It labels most Cebu hours with it, even at a 20–30% chance and no real rain. */
const PATCHY_RAIN_NEARBY = 176;

/**
 * The live icon for WeatherAPI's iconUrl: the kind from the number at the end and day or night from the path
 * (".../night/116.png" is partly cloudy at night). Unknown or missing codes show cloudy. The image itself is never
 * loaded: it would be an extra request to WeatherAPI from the user's phone.
 *
 * `chanceOfRain` is the same report's chance (the current conditions', or that hour's). "Patchy rain nearby" shows as
 * rain only when rain is likely; below that it's cloudy, so a dry night never says "Rain" or draws a rainy sky.
 */
export function weatherKind(iconUrl: string | null, chanceOfRain: number): LiveKind {
  const match = iconUrl?.match(/(day|night)\/(\d+)\.png$/);
  if (!match) return 'cloudy';
  const night = match[1] === 'night';
  const code = Number(match[2]);
  if (code === PATCHY_RAIN_NEARBY) return chanceOfRain >= RAIN_LIKELY ? 'rain2' : 'cloudy';
  if (code === 113) return night ? 'clear-night' : 'clear-day';
  if (code === 116) return night ? 'partly-night' : 'partly-day';
  if (code === 119 || code === 122) return 'cloudy';
  if (code === 248 || code === 260 || (code >= 125 && code <= 161)) return 'fog';
  if (RAIN2.includes(code)) return 'rain2';
  if (RAIN3.includes(code)) return 'rain3';
  if (RAIN4.includes(code)) return 'rain4';
  if (STORM.includes(code)) return 'storm';
  return 'cloudy';
}

/** clear → clear; partly cloudy, cloudy and fog → cloudy; rain → rain; thunderstorm → storm. */
export function skyWeather(kind: LiveKind): SkyWeather {
  if (kind === 'clear-day' || kind === 'clear-night') return 'clear';
  if (kind === 'rain2' || kind === 'rain3' || kind === 'rain4') return 'rain';
  if (kind === 'storm') return 'storm';
  return 'cloudy';
}

const ONE_WORD: Partial<Record<LiveKind, string>> = {
  'clear-day': 'Sunny',
  'clear-night': 'Clear',
  'partly-day': 'Cloudy',
  'partly-night': 'Cloudy',
  cloudy: 'Cloudy',
  fog: 'Foggy',
  rain2: 'Rain',
  rain3: 'Rain',
  rain4: 'Rain',
  storm: 'Storm',
};

/** The one-word condition for the header's weather chip. */
export function oneWord(kind: LiveKind): string {
  return ONE_WORD[kind] ?? 'Cloudy';
}

/** The live icon for an alert type: weather alerts show rain, or the typhoon when the title mentions one. */
export function alertKind(alert: Pick<Alert, 'type' | 'title'>): LiveKind {
  switch (alert.type) {
    case 'flood':
      return 'flood';
    case 'closure':
      return 'closure';
    case 'traffic':
      return 'traffic';
    case 'power':
      return 'power';
    case 'water':
      return 'water';
    case 'advisory':
      return 'class';
    case 'weather':
      return /typhoon|storm signal/i.test(alert.title) ? 'typhoon' : 'rain3';
  }
}

const hour = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric' });

/** One line of advice from the hourly rain chance: rain is likely when an hour in the next 12 reaches 70%. */
export function rainAdvice(hourly: WeatherHour[]): string {
  const wet = hourly.slice(0, 12).find((h) => h.chanceOfRain >= RAIN_LIKELY);
  return wet ? `Rain likely from ${hour.format(new Date(wet.time))}. Bring an umbrella.` : 'No rain expected for the next 12 hours.';
}
