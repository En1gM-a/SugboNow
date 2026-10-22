import { describe, expect, it } from 'vitest';
import {
  compareAlerts,
  isActiveBetween,
  matchAlertsToPlaces,
  placesNear,
} from '../src/services/matching.service.js';

const home = { id: 'home', label: 'Home', lat: 10.3157, lng: 123.8854 }; // Cebu City
const school = { id: 'school', label: 'School', lat: 10.3236, lng: 123.9223 }; // Mandaue, ~4.1 km away
const places = [home, school];

describe('matching alerts to saved places', () => {
  it('uses a radius per alert type', () => {
    const traffic = { type: 'traffic' as const, lat: 10.316, lng: 123.886 };
    expect(placesNear(traffic, places).map((place) => place.id)).toEqual(['home']);

    const weather = { type: 'weather' as const, lat: 10.3157, lng: 123.8854 };
    const near = placesNear(weather, places);
    expect(near.map((place) => place.id)).toEqual(['home', 'school']);
    expect(near[0].distanceKm).toBe(0);
  });

  it('ignores alerts without coordinates', () => {
    expect(placesNear({ type: 'advisory', lat: null, lng: null }, places)).toEqual([]);
  });

  it('keeps only alerts near at least one place', () => {
    const near = { id: 'a', type: 'closure' as const, lat: 10.3237, lng: 123.9222 };
    const far = { id: 'b', type: 'closure' as const, lat: 10.2093, lng: 123.758 }; // Naga
    const matches = matchAlertsToPlaces([near, far], places);
    expect(matches.map((match) => match.alert.id)).toEqual(['a']);
    expect(matches[0].places[0].label).toBe('School');
  });
});

describe('isActiveBetween', () => {
  const start = new Date('2026-10-23T06:00:00+08:00');
  const end = new Date('2026-10-23T07:30:00+08:00');

  it('treats missing bounds as open', () => {
    expect(isActiveBetween({ starts_at: null, ends_at: null }, start, end)).toBe(true);
  });

  it('needs the alert to overlap the window', () => {
    expect(isActiveBetween({ starts_at: null, ends_at: '2026-10-23T05:59:00+08:00' }, start, end)).toBe(false);
    expect(isActiveBetween({ starts_at: '2026-10-23T07:31:00+08:00', ends_at: null }, start, end)).toBe(false);
    expect(isActiveBetween({ starts_at: '2026-10-23T07:00:00+08:00', ends_at: '2026-10-23T09:00:00+08:00' }, start, end)).toBe(true);
  });
});

describe('compareAlerts', () => {
  it('ranks by severity, then type priority, then recency', () => {
    const alerts = [
      { id: 'power', type: 'power' as const, severity: 'medium' as const, starts_at: '2026-10-23T05:00:00Z' },
      { id: 'class', type: 'advisory' as const, severity: 'medium' as const, starts_at: '2026-10-22T05:00:00Z' },
      { id: 'jam-old', type: 'traffic' as const, severity: 'high' as const, starts_at: '2026-10-22T01:00:00Z' },
      { id: 'jam-new', type: 'traffic' as const, severity: 'high' as const, starts_at: '2026-10-22T02:00:00Z' },
    ];
    expect(alerts.sort(compareAlerts).map((alert) => alert.id)).toEqual(['jam-new', 'jam-old', 'class', 'power']);
  });
});
