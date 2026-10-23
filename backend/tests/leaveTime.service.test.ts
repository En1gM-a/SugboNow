import { describe, expect, it } from 'vitest';
import { computeLeaveTime, type LeaveTimeAlert } from '../src/services/leaveTime.service.js';
import { manilaClock } from '../src/utils/time.js';

const home = { id: 'home', label: 'Home', lat: 10.3157, lng: 123.8854 }; // Cebu City
const school = { id: 'school', label: 'School', lat: 10.3236, lng: 123.9223 }; // Mandaue

function alert(overrides: Partial<LeaveTimeAlert>): LeaveTimeAlert {
  return {
    id: 'alert',
    type: 'traffic',
    severity: 'high',
    title: 'Stationary traffic on Osmeña Boulevard',
    lat: 10.316,
    lng: 123.886,
    starts_at: '2026-10-23T05:00:00+08:00',
    ends_at: '2026-10-23T09:00:00+08:00',
    ...overrides,
  };
}

const trip = { date: '2026-10-23', arriveBy: '07:30', origin: home, destination: school };

describe('computeLeaveTime', () => {
  it('estimates travel time from distance when nothing is in the way', () => {
    const result = computeLeaveTime({ ...trip, alerts: [] });
    // 4.13 km straight line × 1.3 road factor = 5.4 km; at 20 km/h ≈ 17 min.
    expect(result.distanceKm).toBe(5.4);
    expect(result.baseMinutes).toBe(17);
    expect(result.delayMinutes).toBe(0);
    expect(manilaClock(result.arriveAt)).toBe('07:30');
    // 07:13, rounded down to 07:10.
    expect(manilaClock(result.leaveAt)).toBe('07:10');
    expect(result.reasons).toEqual([]);
  });

  it('adds a buffer for travel alerts near the origin or destination', () => {
    const result = computeLeaveTime({ ...trip, alerts: [alert({ id: 'jam' })] });
    expect(result.delayMinutes).toBe(20);
    expect(manilaClock(result.leaveAt)).toBe('06:50');
    expect(result.reasons).toEqual([
      { alertId: 'jam', title: 'Stationary traffic on Osmeña Boulevard', severity: 'high', minutes: 20, nearPlace: 'Home' },
    ]);
  });

  it('ignores alerts that do not affect travel, are far away, or are over', () => {
    const result = computeLeaveTime({
      ...trip,
      alerts: [
        alert({ id: 'brownout', type: 'power' }),
        alert({ id: 'far', lat: 10.2093, lng: 123.758 }),
        alert({ id: 'cleared', ends_at: '2026-10-23T06:00:00+08:00' }),
      ],
    });
    expect(result.delayMinutes).toBe(0);
  });

  it('counts at most three traffic alerts and one weather alert, capped at 45 minutes', () => {
    const jams = ['a', 'b', 'c', 'd'].map((id) => alert({ id }));
    const rain = [
      alert({ id: 'rain-cebu', type: 'weather', severity: 'medium', title: 'Rain expected in Cebu City' }),
      alert({ id: 'rain-mandaue', type: 'weather', severity: 'high', title: 'Heavy rain expected in Mandaue City', lat: 10.3236, lng: 123.9223 }),
    ];
    const result = computeLeaveTime({ ...trip, alerts: [...jams, ...rain] });
    expect(result.reasons.filter((reason) => reason.alertId.startsWith('rain'))).toHaveLength(1);
    expect(result.reasons.find((reason) => reason.alertId.startsWith('rain'))?.alertId).toBe('rain-mandaue');
    expect(result.reasons.filter((reason) => !reason.alertId.startsWith('rain'))).toHaveLength(3);
    expect(result.delayMinutes).toBe(45);
  });
});
