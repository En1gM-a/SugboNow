import { describe, expect, it } from 'vitest';
import { findAreaInText, getArea, mentionsCebu } from '../src/config/areas.js';
import { haversineKm, nearestArea, roundKm } from '../src/utils/geo.js';
import {
  formatClock12,
  formatDateLabel,
  manilaClock,
  manilaDate,
  manilaDateTime,
  manilaWeekday,
} from '../src/utils/time.js';

const cebuCity = { lat: 10.3157, lng: 123.8854 };
const mandaue = { lat: 10.3236, lng: 123.9223 };

describe('geo', () => {
  it('measures straight-line distance in kilometres', () => {
    expect(haversineKm(cebuCity, cebuCity)).toBe(0);
    const km = haversineKm(cebuCity, mandaue);
    expect(km).toBeGreaterThan(4.0);
    expect(km).toBeLessThan(4.3);
    expect(roundKm(4.131)).toBe(4.1);
  });

  it('finds the nearest Metro Cebu area', () => {
    expect(nearestArea({ lat: 10.2449, lng: 123.7962 })).toEqual({ area: getArea('minglanilla'), distanceKm: 0 });
    expect(nearestArea({ lat: 10.318, lng: 123.9 }).area.slug).toBe('cebu_city');
  });
});

describe('areas in text', () => {
  it('picks the area named first, e.g. the dateline', () => {
    expect(findAreaInText('MANDAUE CITY, Cebu – police will deploy … a forum in Cebu City')?.slug).toBe('mandaue_city');
    expect(findAreaInText('Residents of Lilo-an and Consolacion')?.slug).toBe('liloan');
    expect(findAreaInText('Flights to Mactan resume')?.slug).toBe('lapu_lapu_city');
    expect(findAreaInText('Nothing local here')).toBeUndefined();
  });

  it('tells Cebu stories from the rest', () => {
    expect(mentionsCebu('Cebuanos flock to cemeteries')).toBe(true);
    expect(mentionsCebu('Talisay residents brace for rain')).toBe(true);
    expect(mentionsCebu('Protests banned in some Paris areas')).toBe(false);
  });
});

describe('Asia/Manila time', () => {
  // 16:30 UTC on Oct 22 is 00:30 on Friday, Oct 23 in Manila.
  const justAfterMidnight = new Date('2026-10-22T16:30:00Z');

  it('uses the Manila calendar day and weekday', () => {
    expect(manilaDate(justAfterMidnight)).toBe('2026-10-23');
    expect(manilaWeekday(justAfterMidnight)).toBe(5);
  });

  it('converts Manila wall-clock times to instants and back', () => {
    const arrive = manilaDateTime('2026-10-23', '07:30');
    expect(arrive.toISOString()).toBe('2026-10-22T23:30:00.000Z');
    expect(manilaDateTime('2026-10-23', '07:30:00').toISOString()).toBe(arrive.toISOString());
    expect(manilaClock(arrive)).toBe('07:30');
  });

  it('formats 12-hour clocks and date labels', () => {
    expect(formatClock12(new Date('2026-10-22T23:30:00Z'))).toBe('7:30 AM');
    expect(formatClock12(new Date('2026-10-23T04:05:00Z'))).toBe('12:05 PM');
    expect(formatClock12(justAfterMidnight)).toBe('12:30 AM');
    expect(formatDateLabel(justAfterMidnight)).toBe('Friday, October 23');
  });
});
