import { describe, expect, it, vi } from 'vitest';
import { rulesBriefWriter, type BriefInput, type BriefWriter } from '../src/services/ai.service.js';
import type { AlertsRepository } from '../src/services/alerts.repository.js';
import type { BriefRepository, SaveBriefInput } from '../src/services/brief.repository.js';
import { createBriefService, pickWeatherArea } from '../src/services/brief.service.js';
import type { WeatherRepository } from '../src/services/weather.repository.js';
import type { AlertRow, DailyBriefRow, LocationRow, ScheduleRow, WeatherSnapshotRow } from '../src/types/index.js';
import { manilaClock } from '../src/utils/time.js';

// Friday, October 23, 05:00 in Manila.
const now = new Date('2026-10-22T21:00:00Z');

function place(id: string, label: string, kind: LocationRow['kind'], lat: number, lng: number): LocationRow {
  return { id, label, kind, address_text: label, lat, lng, created_at: '', updated_at: '' };
}

const home = place('home', 'Home', 'home', 10.3157, 123.8854); // Cebu City
const school = place('school', 'School', 'school', 10.3236, 123.9223); // Mandaue

function entry(id: string, days: number[]): ScheduleRow {
  return {
    id,
    title: id === 'weekday' ? 'Classes' : 'Weekend market',
    days_of_week: days,
    arrive_by: '07:30:00',
    origin_location_id: 'home',
    destination_location_id: 'school',
    origin: { id: 'home', label: 'Home', kind: 'home' },
    destination: { id: 'school', label: 'School', kind: 'school' },
    created_at: '',
    updated_at: '',
  };
}

function alert(id: string, overrides: Partial<AlertRow>): AlertRow {
  return {
    id,
    source: 'tomtom',
    type: 'traffic',
    severity: 'high',
    title: `Alert ${id}`,
    summary: null,
    lat: 10.316,
    lng: 123.886,
    area_name: 'Cebu City',
    starts_at: '2026-10-22T20:00:00Z',
    ends_at: '2026-10-23T01:00:00Z',
    source_url: null,
    image_url: null,
    created_at: '2026-10-22T20:00:00Z',
    ...overrides,
  };
}

const weatherRow: WeatherSnapshotRow = {
  area_slug: 'cebu_city',
  area_name: 'Cebu City',
  lat: 10.3157,
  lng: 123.8854,
  observed_at: '2026-10-22T20:45:00Z',
  current_conditions: { tempC: 26.6, feelsLikeC: 29, condition: 'Patchy rain nearby', iconUrl: null, isDay: false, humidity: 85, windKph: 8, precipMm: 0.1, chanceOfRain: 40 },
  hourly_forecast: [
    { time: '2026-10-22T21:00:00Z', tempC: 27, condition: 'Light rain', iconUrl: null, chanceOfRain: 70, precipMm: 0.4 },
    { time: '2026-10-22T22:00:00Z', tempC: 27, condition: 'Light rain', iconUrl: null, chanceOfRain: 80, precipMm: 0.6 },
    { time: '2026-10-22T23:00:00Z', tempC: 28, condition: 'Cloudy', iconUrl: null, chanceOfRain: 20, precipMm: 0 },
  ],
  fetched_at: '2026-10-22T20:50:00Z',
};

function setup(options: { existing?: DailyBriefRow | null; userIds?: string[]; failFor?: string } = {}) {
  const saved: SaveBriefInput[] = [];
  const briefs: BriefRepository = {
    getProfile: vi.fn(async () => ({ first_name: 'Thea', display_name: 'thea', city: null, subscribed_mayor: 'cebu_city' })),
    listLocations: vi.fn(async (userId: string) => {
      if (userId === options.failFor) throw new Error('db down');
      return [home, school];
    }),
    listSchedule: vi.fn(async () => [entry('weekday', [1, 2, 3, 4, 5]), entry('weekend', [0, 6])]),
    listUserIdsWithScheduleOn: vi.fn(async () => options.userIds ?? []),
    getBrief: vi.fn(async () => options.existing ?? null),
    saveBrief: vi.fn(async (input: SaveBriefInput) => {
      saved.push(input);
      return { id: `brief-${input.userId}`, user_id: input.userId, brief_date: input.date, content: input.content, alert_ids: input.alertIds, created_at: '', updated_at: '2026-10-22T21:00:01Z' };
    }),
  };
  const alerts = {
    listActive: vi.fn(async () => [
      alert('jam', {}),
      alert('brownout', { type: 'power', severity: 'low', source: 'sunstar', lat: 10.3236, lng: 123.9223, area_name: 'Mandaue City' }),
      alert('far', { lat: 10.2093, lng: 123.758 }),
    ]),
  } as unknown as AlertsRepository;
  const weather = { get: vi.fn(async () => weatherRow) } as unknown as WeatherRepository;
  const writer: BriefWriter = { name: 'test', write: vi.fn(async (input: BriefInput) => rulesBriefWriter.write(input)) };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const service = createBriefService({
    briefs,
    alerts,
    weather,
    latestLguPost: async () => ({ officialName: 'Mayor Nestor Archival', caption: 'WALAY KLASE | OCT 23\nAll levels.', postedAt: '2026-10-22T12:00:00Z' }),
    writer,
    logger,
    now: () => now,
  });
  return { service, briefs, weather, writer, logger, saved };
}

describe('brief service', () => {
  it('creates today’s brief on first open, with live leave times and alerts', async () => {
    const { service, saved, writer } = setup();
    const today = await service.getToday('user-1');

    expect(today.date).toBe('2026-10-23');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ userId: 'user-1', date: '2026-10-23', alertIds: ['jam', 'brownout'] });
    expect(writer.write).toHaveBeenCalledTimes(1);

    // Only the weekday entry runs on Friday.
    expect(today.leaveTimes).toHaveLength(1);
    expect(today.leaveTimes[0]).toMatchObject({ scheduleEntryId: 'weekday', arriveBy: '07:30', delayMinutes: 20 });
    expect(manilaClock(today.leaveTimes[0].leaveAt)).toBe('06:50');
    expect(today.alerts.map(({ alert: a }) => a.id)).toEqual(['jam', 'brownout']);
    expect(today.weather?.area_slug).toBe('cebu_city');
  });

  it('writes a readable brief', async () => {
    const { service, saved } = setup();
    await service.getToday('user-1');
    const content = saved[0].content;
    expect(content).toContain('Good morning, Thea! Here\'s your Cebu brief for Friday, October 23.');
    expect(content).toContain('Weather in Cebu City: 27°C, patchy rain nearby. Rain likely from 5:00 AM to 7:00 AM (80% chance)');
    expect(content).toContain('• Classes: leave by 6:50 AM to reach School by 7:30 AM (+20 min: Alert jam near your Home).');
    expect(content).toContain('• ⚠️ Alert jam (near your Home)');
    expect(content).toContain('From Mayor Nestor Archival: WALAY KLASE | OCT 23');
  });

  it('reuses the brief already saved today', async () => {
    const existing: DailyBriefRow = { id: 'b1', user_id: 'user-1', brief_date: '2026-10-23', content: 'Saved', alert_ids: [], created_at: '', updated_at: '' };
    const { service, briefs, writer } = setup({ existing });
    const today = await service.getToday('user-1');
    expect(today.brief).toBe(existing);
    expect(briefs.saveBrief).not.toHaveBeenCalled();
    expect(writer.write).not.toHaveBeenCalled();
    expect(today.leaveTimes).toHaveLength(1);
  });

  it('generates briefs for everyone with a trip today and counts failures', async () => {
    const { service, briefs, logger } = setup({ userIds: ['u1', 'u2', 'broken'], failFor: 'broken' });
    expect(await service.generateAll(now)).toEqual({ generated: 2, failed: 1 });
    expect(briefs.listUserIdsWithScheduleOn).toHaveBeenCalledWith(5);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});

describe('pickWeatherArea', () => {
  it('prefers the profile city, then the area nearest home, then Cebu City', () => {
    expect(pickWeatherArea('mandaue_city', [home])).toBe('mandaue_city');
    expect(pickWeatherArea('somewhere', [school, home])).toBe('cebu_city');
    expect(pickWeatherArea(null, [school])).toBe('mandaue_city');
    expect(pickWeatherArea(null, [])).toBe('cebu_city');
  });
});

describe('rules brief writer', () => {
  it('guides new users who have no places yet', async () => {
    const text = await rulesBriefWriter.write({
      date: new Date('2026-10-23T06:00:00Z'), // 2 PM in Manila
      firstName: null,
      weather: null,
      commutes: [],
      alerts: [],
      lguPost: null,
      hasPlaces: false,
    });
    expect(text).toBe(
      "Good afternoon! Here's your Cebu brief for Friday, October 23.\n\nAdd your home, school or work and your weekly schedule to get leave-time suggestions.",
    );
  });
});
