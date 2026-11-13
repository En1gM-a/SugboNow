// Map colors, kept out of maps.tsx so a page can show its legend without loading Leaflet.

import type { Severity, TrafficLevel } from '@/types/api';

export const SEVERITY_COLOR: Record<Severity, string> = { high: '#C8102E', medium: '#B45309', low: '#0E7C74' };

/** Road colors by traffic, the usual red, yellow and green, drawn over an outline so they read on light and dark tiles. */
export const TRAFFIC_COLOR: Record<TrafficLevel, string> = { heavy: '#E0262F', medium: '#F2A10C', free: '#1E9E5A' };
export const TRAFFIC_LABEL: Record<TrafficLevel, string> = { heavy: 'Heavy', medium: 'Slow', free: 'Clear' };
/** Draw order: slower on top, so where two directions overlap the slower one shows. */
export const TRAFFIC_LEVELS: readonly TrafficLevel[] = ['free', 'medium', 'heavy'];

/** The rain-chance scale on the rain map, from the same blues as the rain bars. Each step keeps 4.5:1 with its text. */
export const RAIN_STEPS = [
  { from: 70, label: '70% and up', background: '#1E5AA8', color: '#FFFFFF' },
  { from: 40, label: '40–69%', background: '#5AA2F5', color: '#0E1726' },
  { from: 20, label: '20–39%', background: '#BFDBF9', color: '#0E1726' },
  { from: 0, label: 'Under 20%', background: '#EEF3FA', color: '#0E1726' },
] as const;

export function rainStep(chance: number) {
  return RAIN_STEPS.find((step) => chance >= step.from) ?? RAIN_STEPS[RAIN_STEPS.length - 1];
}
