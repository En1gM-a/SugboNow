import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useDisplay } from '@/lib/display';
import type { WeatherHour } from '@/types/api';
import { cx, vars } from '@/utils/cx';
import { formatHour, formatTime } from '@/utils/format';
import { revealSideways } from '@/utils/scroll';

const W = 760;
const H = 210;
const TOP = 30;
const BOTTOM = 172;

/** "3 PM · 26° · Light rain · 40% chance of rain", or "Now · …" for the first hour. */
export function hourSummary(h: WeatherHour, k: number): string {
  return `${k === 0 ? 'Now' : formatTime(h.time)} · ${Math.round(h.tempC)}° · ${h.condition} · ${h.chanceOfRain}% chance of rain`;
}

interface WeatherChartProps {
  hours: WeatherHour[];
  /** The page's selected hour, shared with the hour strip and the rain map's slider. */
  selected: number;
  onSelect: (k: number) => void;
}

/**
 * The next 24 hours in plain SVG: the temperature as a line over rain-chance bars. It scrolls sideways on phones.
 * Tapping an hour, or the arrow keys, selects it; with a mouse, hovering previews an hour without selecting it.
 */
export function WeatherChart({ hours, selected, onSelect }: WeatherChartProps) {
  const { still } = useDisplay();
  const [preview, setPreview] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  const temps = hours.map((h) => h.tempC);
  const low = Math.min(...temps) - 1;
  const high = Math.max(...temps) + 1;
  const step = (W - 16) / hours.length;
  const x = (k: number) => 8 + step * k + step / 2;
  const yTemp = (t: number) => TOP + (1 - (t - low) / (high - low)) * (BOTTOM - TOP) * 0.5;
  const line = hours.map((h, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${yTemp(h.tempC).toFixed(1)}`).join(' ');
  const peak = Math.max(...hours.map((h) => h.chanceOfRain));
  const last = hours.length - 1;
  const chosen = Math.min(selected, last);
  const shown = preview ?? chosen;
  const shownHour = hours[shown];

  // A selection made elsewhere (the hour strip, the slider) brings that hour into view when the chart scrolls sideways.
  useEffect(() => {
    revealSideways(scroller.current, svg.current?.querySelector('.wx-pick') ?? null, still);
  }, [chosen, still]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    let to = -1;
    if (e.key === 'ArrowRight') to = Math.min(last, chosen + 1);
    else if (e.key === 'ArrowLeft') to = Math.max(0, chosen - 1);
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = last;
    if (to < 0) return;
    e.preventDefault();
    setPreview(null);
    onSelect(to);
  }

  if (!shownHour) return null;

  return (
    <figure className="wx-chart">
      {/* The readout follows the pointer; screen readers hear only the selected hour, once, from the live region. */}
      <p className={cx('wx-readout tabular-nums', preview !== null && 'is-preview')} aria-hidden="true">
        {hourSummary(shownHour, shown)}
      </p>
      <p className="sr-only" aria-live="polite">
        {hours[chosen] ? `Selected: ${hourSummary(hours[chosen], chosen)}` : ''}
      </p>
      <div
        ref={scroller}
        className="wx-chart-scroll"
        tabIndex={0}
        role="group"
        aria-label="Chart of the next 24 hours. Use the left and right arrow keys to choose an hour; it scrolls sideways to show it all."
        onKeyDown={onKeyDown}
      >
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`The temperature goes from ${Math.round(Math.min(...temps))}° to ${Math.round(Math.max(...temps))}°, and the rain chance peaks at ${peak}%.`} onPointerLeave={() => setPreview(null)}>
          <defs>
            <linearGradient id="wx-rain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5AA2F5" />
              <stop offset="1" stopColor="#1E5AA8" />
            </linearGradient>
          </defs>
          {/* The guide and the dot on the line enter with the chart area and the peak dot (handoff <motion>). */}
          {/* From just under the dot down to the bar, so it never crosses the temperature labels above the line. */}
          <line className="e-fade wx-guide" x1={x(shown)} x2={x(shown)} y1={yTemp(shownHour.tempC) + 8} y2={BOTTOM} />
          {hours.map((h, k) => {
            const bar = (h.chanceOfRain / 100) * (BOTTOM - TOP) * 0.5;
            return <rect key={h.time} className={cx('e-bar wx-bar', k === shown && 'is-on')} style={vars({ '--j': Math.min(k, 8) })} x={x(k) - step * 0.32} y={BOTTOM - bar} width={step * 0.64} height={bar} rx={4} fill="url(#wx-rain)" />;
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
          <circle className="e-dot wx-pick" cx={x(shown)} cy={yTemp(shownHour.tempC)} r={5.5} />
          {/* One full-height column per hour, so a tap anywhere in the hour's slice picks it. */}
          {hours.map((h, k) => (
            <rect
              key={`hit-${h.time}`}
              className="wx-hit"
              x={x(k) - step / 2}
              y={0}
              width={step}
              height={H}
              onClick={() => {
                setPreview(null);
                onSelect(k);
              }}
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') setPreview(k);
              }}
            />
          ))}
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
