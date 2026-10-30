import type { IconName } from '@/components/ui/Icon';

/** Rain-chance color scale as CSS variables that follow the theme. Text on it uses RAIN_ON (4.5:1 on every step). */
export function rainColor(pct: number): string {
  if (pct >= 70) return 'var(--rain-4)';
  if (pct >= 40) return 'var(--rain-3)';
  if (pct >= 20) return 'var(--rain-2)';
  return 'var(--rain-1)';
}

export const RAIN_ON = 'var(--rain-on)';

export const RAIN_LEGEND = [
  { label: 'Under 20%', color: 'var(--rain-1)' },
  { label: '20–39%', color: 'var(--rain-2)' },
  { label: '40–69%', color: 'var(--rain-3)' },
  { label: '70%+', color: 'var(--rain-4)' },
];

/** Our own SVG icon for a WeatherAPI condition text (we don't hotlink the provider's icons). */
export function conditionIcon(condition: string, isDay = true): IconName {
  const c = condition.toLowerCase();
  if (c.includes('thunder')) return 'storm';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return 'cloudRain';
  if (c.includes('cloud') || c.includes('overcast') || c.includes('mist') || c.includes('fog')) return 'cloud';
  return isDay ? 'sun' : 'moon';
}
