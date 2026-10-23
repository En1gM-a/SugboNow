// WeatherAPI.com forecast API. Free tier: 100,000 calls/month; the weather
// job polls each Metro Cebu area hourly (about 6,500 calls/month). Saves the
// current conditions and next 24 hours per area, and raises an alert only for
// weather that can disrupt a commute or lead to floods and class suspensions:
// heavy rain, thunderstorms, and official weather warnings.

import type { CebuArea } from "../config/areas";
import type { AlertSeverity, NewAlert, WeatherConditions, WeatherHour } from "../types";
import type { WeatherSnapshotInput } from "../services/weather.repository";
import { addHours, formatClock12, manilaDate } from "../utils/time";
import { sha1 } from "../utils/text";
import { fetchJson } from "./http";

export const WEATHERAPI_SOURCE = "weatherapi";

const RAIN_CHANCE = 70; // % for an hour to count as rainy
const HEAVY_HOURLY_MM = 7.5; // heavy rain rate
const HEAVY_TOTAL_MM = 20;
const MODERATE_TOTAL_MM = 6;
const ALERT_LOOKAHEAD_HOURS = 12;

interface WeatherApiCondition {
  text: string;
  icon: string;
}

interface WeatherApiHour {
  time_epoch: number;
  temp_c: number;
  condition: WeatherApiCondition;
  chance_of_rain: number;
  precip_mm: number;
}

export interface WeatherApiForecast {
  current: {
    last_updated_epoch: number;
    temp_c: number;
    feelslike_c: number;
    is_day: number;
    condition: WeatherApiCondition;
    humidity: number;
    wind_kph: number;
    precip_mm: number;
    chance_of_rain?: number;
  };
  forecast: { forecastday: Array<{ hour: WeatherApiHour[] }> };
  alerts?: {
    alert: Array<{ headline?: string; event?: string; severity?: string; effective?: string; expires?: string; desc?: string }>;
  };
}

function iconUrl(icon: string | undefined): string | null {
  if (!icon) return null;
  return icon.startsWith("//") ? `https:${icon}` : icon;
}

function upcomingHours(forecast: WeatherApiForecast, now: Date, hours: number): WeatherApiHour[] {
  const start = now.getTime() - 3_600_000; // include the current hour
  const end = addHours(now, hours).getTime();
  return forecast.forecast.forecastday
    .flatMap((day) => day.hour)
    .filter((hour) => hour.time_epoch * 1000 >= start && hour.time_epoch * 1000 < end);
}

export function toWeatherSnapshot(area: CebuArea, forecast: WeatherApiForecast, now: Date): WeatherSnapshotInput {
  const current: WeatherConditions = {
    tempC: forecast.current.temp_c,
    feelsLikeC: forecast.current.feelslike_c,
    condition: forecast.current.condition.text,
    iconUrl: iconUrl(forecast.current.condition.icon),
    isDay: forecast.current.is_day === 1,
    humidity: forecast.current.humidity,
    windKph: forecast.current.wind_kph,
    precipMm: forecast.current.precip_mm,
    chanceOfRain: forecast.current.chance_of_rain ?? null,
  };
  const hourly: WeatherHour[] = upcomingHours(forecast, now, 24).map((hour) => ({
    time: new Date(hour.time_epoch * 1000).toISOString(),
    tempC: hour.temp_c,
    condition: hour.condition.text,
    iconUrl: iconUrl(hour.condition.icon),
    chanceOfRain: hour.chance_of_rain,
    precipMm: hour.precip_mm,
  }));
  return {
    areaSlug: area.slug,
    areaName: area.name,
    lat: area.lat,
    lng: area.lng,
    observedAt: new Date(forecast.current.last_updated_epoch * 1000).toISOString(),
    current,
    hourly,
  };
}

// One rain alert per area per day, updated hourly; null when no disruptive rain is expected.
export function rainAlert(area: CebuArea, forecast: WeatherApiForecast, now: Date): NewAlert | null {
  const rainy = upcomingHours(forecast, now, ALERT_LOOKAHEAD_HOURS).filter((hour) => hour.chance_of_rain >= RAIN_CHANCE);
  if (rainy.length === 0) return null;
  const total = rainy.reduce((sum, hour) => sum + hour.precip_mm, 0);
  const heaviest = Math.max(...rainy.map((hour) => hour.precip_mm));
  const thunder = rainy.some((hour) => /thunder/i.test(hour.condition.text));

  let severity: AlertSeverity;
  let label: string;
  if (heaviest >= HEAVY_HOURLY_MM || total >= HEAVY_TOTAL_MM) {
    severity = "high";
    label = "Heavy rain expected";
  } else if (thunder) {
    severity = "medium";
    label = "Thunderstorms expected";
  } else if (total >= MODERATE_TOTAL_MM) {
    severity = "medium";
    label = "Rain expected";
  } else {
    return null; // light rain: not disruptive
  }

  const start = new Date(rainy[0].time_epoch * 1000);
  const end = addHours(new Date(rainy[rainy.length - 1].time_epoch * 1000), 1);
  const chance = Math.max(...rainy.map((hour) => hour.chance_of_rain));
  return {
    source: WEATHERAPI_SOURCE,
    type: "weather",
    severity,
    title: `${label} in ${area.name}`,
    summary: `Rain likely from ${formatClock12(start)} to ${formatClock12(end)} (up to ${chance}% chance, about ${Math.round(total)} mm). Expect slower trips and possible flooding.`,
    lat: area.lat,
    lng: area.lng,
    areaName: area.name,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    sourceUrl: null,
    imageUrl: null,
    fingerprint: `weatherapi:rain:${area.slug}:${manilaDate(start)}`,
    raw: { totalMm: Math.round(total * 10) / 10, heaviestMm: heaviest, thunder, chance },
  };
}

// Official warnings passed through by WeatherAPI. The same warning appears
// for every area polled, so it is fingerprinted by content, not area.
export function officialWeatherAlerts(area: CebuArea, forecast: WeatherApiForecast, now: Date): NewAlert[] {
  return (forecast.alerts?.alert ?? []).flatMap((warning): NewAlert[] => {
    const title = (warning.headline || warning.event || "").trim();
    if (!title) return [];
    const severity: AlertSeverity = /extreme|severe/i.test(warning.severity ?? "") ? "high" : "medium";
    return [
      {
        source: WEATHERAPI_SOURCE,
        type: "weather",
        severity,
        title,
        summary: warning.desc ? warning.desc.trim().slice(0, 300) : null,
        lat: area.lat,
        lng: area.lng,
        areaName: area.name,
        startsAt: warning.effective ?? now.toISOString(),
        endsAt: warning.expires ?? addHours(now, 12).toISOString(),
        sourceUrl: null,
        imageUrl: null,
        fingerprint: `weatherapi:official:${sha1(`${title}|${warning.effective ?? ""}`)}`,
        raw: { event: warning.event ?? null, severity: warning.severity ?? null },
      },
    ];
  });
}

export async function fetchWeatherForecast(apiKey: string, area: CebuArea): Promise<WeatherApiForecast> {
  const params = new URLSearchParams({
    key: apiKey,
    q: `${area.lat},${area.lng}`,
    days: "2", // two days so the hourly forecast always covers the next 24 hours
    aqi: "no",
    alerts: "yes",
  });
  return fetchJson<WeatherApiForecast>("WeatherAPI", `https://api.weatherapi.com/v1/forecast.json?${params}`);
}
