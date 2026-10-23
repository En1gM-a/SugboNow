import { describe, expect, it } from 'vitest';
import { getArea } from '../src/config/areas.js';
import {
  officialWeatherAlerts,
  rainAlert,
  toWeatherSnapshot,
  type WeatherApiForecast,
} from '../src/integrations/weatherapi.js';

const cebuCity = getArea('cebu_city')!;
const mandaue = getArea('mandaue_city')!;
// 12:00 noon in Manila.
const now = new Date('2026-10-22T04:00:00Z');
const dayStart = Date.parse('2026-10-21T16:00:00Z') / 1000; // midnight Oct 22, Manila

type HourOverride = { chance?: number; precip?: number; condition?: string };

// Two days of hourly forecast; `rain` maps Manila hour-of-day (on Oct 22) to overrides.
function forecast(rain: Record<number, HourOverride> = {}, alerts: WeatherApiForecast['alerts'] = { alert: [] }): WeatherApiForecast {
  const hours = Array.from({ length: 48 }, (_, index) => {
    const override = index < 24 ? rain[index] ?? {} : {};
    return {
      time_epoch: dayStart + index * 3600,
      temp_c: 28,
      condition: { text: override.condition ?? 'Partly cloudy', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png' },
      chance_of_rain: override.chance ?? 10,
      precip_mm: override.precip ?? 0,
    };
  });
  return {
    current: {
      last_updated_epoch: Date.parse('2026-10-22T03:45:00Z') / 1000,
      temp_c: 29.4,
      feelslike_c: 33.1,
      is_day: 1,
      condition: { text: 'Partly cloudy', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png' },
      humidity: 70,
      wind_kph: 11.2,
      precip_mm: 0,
      chance_of_rain: 12,
    },
    forecast: { forecastday: [{ hour: hours.slice(0, 24) }, { hour: hours.slice(24) }] },
    alerts,
  };
}

describe('toWeatherSnapshot', () => {
  it('saves current conditions and the next 24 hours', () => {
    const snapshot = toWeatherSnapshot(cebuCity, forecast(), now);
    expect(snapshot).toMatchObject({
      areaSlug: 'cebu_city',
      areaName: 'Cebu City',
      observedAt: '2026-10-22T03:45:00.000Z',
      current: {
        tempC: 29.4,
        feelsLikeC: 33.1,
        condition: 'Partly cloudy',
        iconUrl: 'https://cdn.weatherapi.com/weather/64x64/day/116.png',
        isDay: true,
        humidity: 70,
        windKph: 11.2,
        precipMm: 0,
        chanceOfRain: 12,
      },
    });
    // The current hour (11:00) plus the next 24.
    expect(snapshot.hourly).toHaveLength(25);
    expect(snapshot.hourly[0].time).toBe('2026-10-22T03:00:00.000Z');
  });
});

describe('rainAlert', () => {
  it('stays quiet when no rain is likely', () => {
    expect(rainAlert(cebuCity, forecast(), now)).toBeNull();
  });

  it('ignores light rain', () => {
    expect(rainAlert(cebuCity, forecast({ 14: { chance: 80, precip: 0.5 }, 15: { chance: 80, precip: 0.5 } }), now)).toBeNull();
  });

  it('raises a high alert for heavy rain, with the rainy window', () => {
    const alert = rainAlert(
      cebuCity,
      forecast({ 14: { chance: 85, precip: 8 }, 15: { chance: 90, precip: 6 }, 16: { chance: 75, precip: 3 } }),
      now,
    );
    expect(alert).toMatchObject({
      source: 'weatherapi',
      type: 'weather',
      severity: 'high',
      title: 'Heavy rain expected in Cebu City',
      summary: 'Rain likely from 2:00 PM to 5:00 PM (up to 90% chance, about 17 mm). Expect slower trips and possible flooding.',
      startsAt: '2026-10-22T06:00:00.000Z',
      endsAt: '2026-10-22T09:00:00.000Z',
      fingerprint: 'weatherapi:rain:cebu_city:2026-10-22',
      lat: cebuCity.lat,
      lng: cebuCity.lng,
    });
  });

  it('raises a medium alert for thunderstorms or moderate rain', () => {
    const thunder = rainAlert(cebuCity, forecast({ 15: { chance: 80, precip: 1, condition: 'Patchy light rain with thunder' } }), now);
    expect(thunder).toMatchObject({ severity: 'medium', title: 'Thunderstorms expected in Cebu City' });
    const moderate = rainAlert(cebuCity, forecast({ 14: { chance: 80, precip: 2.5 }, 15: { chance: 80, precip: 2.5 }, 16: { chance: 80, precip: 2.5 } }), now);
    expect(moderate).toMatchObject({ severity: 'medium', title: 'Rain expected in Cebu City' });
  });
});

describe('officialWeatherAlerts', () => {
  it('passes official warnings through once, whichever area reports them', () => {
    const warnings = { alert: [{ headline: 'Heavy rainfall warning', severity: 'Severe', effective: '2026-10-22T03:00:00Z', expires: '2026-10-22T15:00:00Z', desc: 'Orange warning' }] };
    const [fromCebu] = officialWeatherAlerts(cebuCity, forecast({}, warnings), now);
    const [fromMandaue] = officialWeatherAlerts(mandaue, forecast({}, warnings), now);
    expect(fromCebu).toMatchObject({ type: 'weather', severity: 'high', title: 'Heavy rainfall warning', endsAt: '2026-10-22T15:00:00Z' });
    expect(fromCebu.fingerprint).toBe(fromMandaue.fingerprint);
  });
});
