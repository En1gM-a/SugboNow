import { describe, expect, it } from 'vitest';
import { weatherAt } from '../src/services/weather.service.js';
import type { WeatherHour, WeatherSnapshotRow } from '../src/types/index.js';

const sunnyAt1pm: WeatherHour = {
  time: '2026-11-07T05:00:00.000Z',
  tempC: 29.1,
  condition: 'Sunny',
  iconUrl: 'https://cdn.weatherapi.com/weather/64x64/day/113.png',
  chanceOfRain: 5,
  precipMm: 0,
  feelsLikeC: 32.4,
  isDay: true,
  humidity: 66,
  windKph: 14.8,
};

// Observed at 2:15 AM Manila (18:15 UTC) in light rain, with the forecast saved then.
const saved: WeatherSnapshotRow = {
  area_slug: 'lapu_lapu_city',
  area_name: 'Lapu-Lapu City',
  lat: 10.3103,
  lng: 123.9494,
  observed_at: '2026-11-06T18:15:00.000Z',
  fetched_at: '2026-11-06T18:27:10.000Z',
  current_conditions: {
    tempC: 26.8,
    feelsLikeC: 29.3,
    condition: 'Patchy light rain',
    iconUrl: 'https://cdn.weatherapi.com/weather/64x64/night/293.png',
    isDay: false,
    humidity: 80,
    windKph: 20.9,
    precipMm: 1.08,
    chanceOfRain: 60,
  },
  hourly_forecast: [
    { time: '2026-11-06T18:00:00.000Z', tempC: 26.8, condition: 'Patchy light rain', iconUrl: null, chanceOfRain: 60, precipMm: 1.08 },
    sunnyAt1pm,
    { time: '2026-11-07T06:00:00.000Z', tempC: 28.8, condition: 'Patchy light drizzle', iconUrl: null, chanceOfRain: 30, precipMm: 0.1 },
  ],
};

describe('weatherAt', () => {
  it('shows the forecast for this hour once the observation is stale', () => {
    const at1pm = weatherAt(saved, new Date('2026-11-07T05:20:00Z'));
    const { time: _time, ...forecast } = sunnyAt1pm;
    expect(at1pm.current_conditions).toEqual(forecast);
    expect(at1pm.hourly_forecast.map((hour) => hour.condition)).toEqual(['Sunny', 'Patchy light drizzle']);
    expect(at1pm.observed_at).toBe(saved.observed_at);
  });

  it('keeps the observation for values an older forecast hour lacks', () => {
    const at2pm = weatherAt(saved, new Date('2026-11-07T06:05:00Z'));
    expect(at2pm.current_conditions).toMatchObject({ condition: 'Patchy light drizzle', tempC: 28.8, humidity: 80, windKph: 20.9, feelsLikeC: 29.3 });
  });

  it('keeps an observation up to 90 minutes old, even into the next hour', () => {
    const next = { ...sunnyAt1pm, time: '2026-11-06T19:00:00.000Z' };
    const row = { ...saved, hourly_forecast: [saved.hourly_forecast[0], next] };
    const at3_40am = weatherAt(row, new Date('2026-11-06T19:40:00Z'));
    expect(at3_40am.current_conditions).toBe(saved.current_conditions);
    expect(at3_40am.hourly_forecast).toEqual([next]);
    expect(weatherAt(row, new Date('2026-11-06T19:50:00Z')).current_conditions.condition).toBe('Sunny');
  });

  it('keeps what was saved once the forecast no longer reaches this hour', () => {
    expect(weatherAt(saved, new Date('2026-11-08T05:00:00Z'))).toBe(saved);
  });
});
