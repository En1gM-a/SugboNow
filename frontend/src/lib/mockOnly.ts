// "Mock for now" data (handoff <pages>, Today): the API doesn't provide these yet, so they render only when
// VITE_USE_MOCKS=true. With the real API, the trip chart becomes a line of text and "This week" is left out.

import type { LiveKind } from '@/components/liveIconArt';

/** Today's travel time against the usual time, every 15 minutes from 6 to 9 AM. */
export const TRIP_TIMES = {
  labels: ['6 AM', '7 AM', '8 AM', '9 AM'],
  usual: [22, 22, 23, 25, 28, 31, 33, 32, 30, 28, 26, 24, 23],
  today: [24, 25, 27, 31, 36, 41, 44, 42, 39, 35, 31, 28, 26],
};

export const THIS_WEEK = { onTime: 4, total: 5, note: 'One late on Tuesday, in the rain.' };

/**
 * The Weather page's "PAGASA forecast and advisories" panel. PAGASA needs a formal request letter for API access, so
 * until the backend provides it, the panel shows this, marked "Sample" (handoff <pages>, page 7).
 */
export const PAGASA_SAMPLE: {
  tonight: string;
  advisory: { title: string; text: string };
  outlook: Array<{ kind: LiveKind; label: string; high: number; low: number; rain: number }>;
} = {
  tonight: 'Cloudy skies with scattered rain showers and thunderstorms over Metro Cebu. Light to moderate winds from the northeast.',
  advisory: { title: 'Thunderstorm advisory', text: 'Possible in Talisay, Minglanilla and Naga in the next 2 hours.' },
  outlook: [
    { kind: 'storm', label: 'Thunderstorms', high: 31, low: 25, rain: 80 },
    { kind: 'rain3', label: 'Rain', high: 30, low: 25, rain: 65 },
    { kind: 'cloudy', label: 'Cloudy', high: 31, low: 26, rain: 40 },
    { kind: 'clear-day', label: 'Sunny', high: 32, low: 26, rain: 20 },
    { kind: 'partly-day', label: 'Partly cloudy', high: 31, low: 25, rain: 35 },
  ],
};
