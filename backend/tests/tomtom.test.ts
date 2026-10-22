import { describe, expect, it } from 'vitest';
import { incidentToAlert, type TomtomIncident } from '../src/integrations/tomtom.js';

const now = new Date('2026-10-22T10:00:00Z');

function incident(properties: Partial<TomtomIncident['properties']>, geometry?: TomtomIncident['geometry']): TomtomIncident {
  return {
    type: 'Feature',
    geometry: geometry ?? {
      type: 'LineString',
      coordinates: [
        [123.768, 10.2289],
        [123.7695, 10.2307],
        [123.7716, 10.2331],
      ],
    },
    properties: {
      id: 'TTI-1',
      iconCategory: 6,
      magnitudeOfDelay: 3,
      events: [{ description: 'Stationary traffic', code: 101, iconCategory: 6 }],
      startTime: '2026-10-22T09:46:30Z',
      endTime: '2026-10-22T14:17:30Z',
      from: 'N Bacalso Avenue',
      to: 'Upper Tulay Road',
      length: 1920.11,
      delay: 2749,
      roadNumbers: ['8'],
      ...properties,
    },
  };
}

describe('incidentToAlert', () => {
  it('turns a major jam into a high traffic alert placed at the middle of the line', () => {
    expect(incidentToAlert(incident({}), now)).toEqual({
      source: 'tomtom',
      type: 'traffic',
      severity: 'high',
      title: 'Stationary traffic on N Bacalso Avenue',
      summary: 'From N Bacalso Avenue to Upper Tulay Road · 1.9 km · about 46 min delay',
      lat: 10.2307,
      lng: 123.7695,
      areaName: 'Naga City',
      startsAt: '2026-10-22T09:46:30Z',
      endsAt: '2026-10-22T14:17:30.000Z',
      sourceUrl: null,
      imageUrl: null,
      fingerprint: 'tomtom:TTI-1',
      raw: { id: 'TTI-1', iconCategory: 6, magnitudeOfDelay: 3, delay: 2749, length: 1920.11, roadNumbers: ['8'] },
    });
  });

  it('maps TomTom categories to alert types and severities', () => {
    const kind = (properties: Partial<TomtomIncident['properties']>) => {
      const alert = incidentToAlert(incident(properties), now);
      return `${alert?.type}/${alert?.severity}`;
    };
    expect(kind({ iconCategory: 8, magnitudeOfDelay: 4, events: [] })).toBe('closure/high');
    expect(kind({ iconCategory: 11, magnitudeOfDelay: 0 })).toBe('flood/high');
    expect(kind({ iconCategory: 1, magnitudeOfDelay: 1 })).toBe('traffic/medium');
    expect(kind({ iconCategory: 7, magnitudeOfDelay: 1 })).toBe('closure/low');
    expect(kind({ iconCategory: 6, magnitudeOfDelay: 2 })).toBe('traffic/medium');
    expect(kind({ iconCategory: 6, magnitudeOfDelay: 1 })).toBe('traffic/low');
  });

  it('names a closure without event text', () => {
    const alert = incidentToAlert(incident({ iconCategory: 8, magnitudeOfDelay: 4, events: [] }, { type: 'Point', coordinates: [123.9, 10.31] }), now);
    expect(alert?.title).toBe('Road closed on N Bacalso Avenue');
    expect(alert).toMatchObject({ lat: 10.31, lng: 123.9 });
  });

  it('keeps an incident active while TomTom still reports it', () => {
    expect(incidentToAlert(incident({ endTime: null }), now)?.endsAt).toBe('2026-10-22T11:00:00.000Z');
    expect(incidentToAlert(incident({ endTime: '2026-10-22T09:00:00Z' }), now)?.endsAt).toBe('2026-10-22T10:15:00.000Z');
  });

  it('skips incidents without a location', () => {
    expect(incidentToAlert(incident({}, { type: 'LineString', coordinates: [] }), now)).toBeNull();
  });
});
