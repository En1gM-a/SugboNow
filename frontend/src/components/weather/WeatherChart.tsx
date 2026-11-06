import type { WeatherHour } from '@/types/api';
import { vars } from '@/utils/cx';
import { formatHour } from '@/utils/format';

const W = 760;
const H = 210;
const TOP = 30;
const BOTTOM = 172;

/** The next 24 hours in plain SVG: the temperature as a line over rain-chance bars. It scrolls sideways on phones. */
export function WeatherChart({ hours }: { hours: WeatherHour[] }) {
  const temps = hours.map((h) => h.tempC);
  const low = Math.min(...temps) - 1;
  const high = Math.max(...temps) + 1;
  const step = (W - 16) / hours.length;
  const x = (k: number) => 8 + step * k + step / 2;
  const yTemp = (t: number) => TOP + (1 - (t - low) / (high - low)) * (BOTTOM - TOP) * 0.5;
  const line = hours.map((h, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${yTemp(h.tempC).toFixed(1)}`).join(' ');
  const peak = Math.max(...hours.map((h) => h.chanceOfRain));

  return (
    <figure className="wx-chart">
      <div className="wx-chart-scroll" tabIndex={0} role="group" aria-label="Chart of the next 24 hours; scroll sideways to see it all">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`The temperature goes from ${Math.round(Math.min(...temps))}° to ${Math.round(Math.max(...temps))}°, and the rain chance peaks at ${peak}%.`}>
          <defs>
            <linearGradient id="wx-rain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5AA2F5" />
              <stop offset="1" stopColor="#1E5AA8" />
            </linearGradient>
          </defs>
          {hours.map((h, k) => {
            const bar = (h.chanceOfRain / 100) * (BOTTOM - TOP) * 0.5;
            return <rect key={h.time} className="e-bar wx-bar" style={vars({ '--j': Math.min(k, 8) })} x={x(k) - step * 0.32} y={BOTTOM - bar} width={step * 0.64} height={bar} rx={4} fill="url(#wx-rain)" />;
          })}
          <path className="e-draw wx-line" pathLength={1} strokeDasharray="1" d={line} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {hours.map((h, k) =>
            k % 3 === 0 ? (
              <g key={h.time} className="tabular-nums">
                <circle className="wx-dot" cx={x(k)} cy={yTemp(h.tempC)} r={3.5} />
                <text className="wx-temp" x={x(k)} y={yTemp(h.tempC) - 10} textAnchor="middle">
                  {Math.round(h.tempC)}°
                </text>
                <text className="wx-axis" x={x(k)} y={BOTTOM + 16} textAnchor="middle">
                  {k === 0 ? 'Now' : formatHour(h.time)}
                </text>
                <text className="wx-axis wx-rain-label" x={x(k)} y={BOTTOM + 32} textAnchor="middle">
                  {h.chanceOfRain}%
                </text>
              </g>
            ) : null,
          )}
        </svg>
      </div>
      <figcaption className="legend">
        <span>
          <i className="key key-temp" />
          Temperature
        </span>
        <span>
          <i className="key key-rain" />
          Chance of rain
        </span>
      </figcaption>
    </figure>
  );
}
