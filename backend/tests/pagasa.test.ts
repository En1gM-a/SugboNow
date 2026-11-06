import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { cebuWeatherAlerts, parsePagasaRegional, parsePagasaTime } from '../src/integrations/pagasa.js';
import { createIngestPagasaJob } from '../src/jobs/ingestPagasa.js';
import type { NewAlert } from '../src/types/index.js';

// The real Visayas page, trimmed to the parts the parser reads (saved 2026-11-07 about 2 AM Manila).
const html = readFileSync(join(__dirname, 'fixtures', 'pagasa-visprsd.html'), 'utf8');
const now = new Date('2026-11-07T02:00:00+08:00');

describe('parsePagasaTime', () => {
  it('reads both of PAGASA\'s formats as Manila time', () => {
    expect(parsePagasaTime('Issued At: 05:00 PM, 6 November, 2026')?.toISOString()).toBe('2026-11-06T09:00:00.000Z');
    expect(parsePagasaTime('Issued at 01:53 AM 07 November 2026')?.toISOString()).toBe('2026-11-06T17:53:00.000Z');
    expect(parsePagasaTime('Issued at 12:20 AM 07 November 2026')?.toISOString()).toBe('2026-11-06T16:20:00.000Z');
    expect(parsePagasaTime('Issued at 12:05 PM 07 November 2026')?.toISOString()).toBe('2026-11-07T04:05:00.000Z');
    expect(parsePagasaTime('no time here')).toBeNull();
  });
});

describe('parsePagasaRegional', () => {
  const page = parsePagasaRegional(html);

  it('reads the night and day forecast', () => {
    expect(page.issuedAt?.toISOString()).toBe('2026-11-06T09:00:00.000Z');
    expect(page.periods).toEqual([
      expect.objectContaining({ part: 'night', minC: 27, maxC: 30, wind: 'Light to Moderate', direction: 'Northeast', coastal: 'Slight to Moderate' }),
      expect.objectContaining({ part: 'day', minC: 27, maxC: 32 }),
    ]);
    expect(page.periods[0].description).toMatch(/^Partly cloudy skies/);
  });

  it('reads the five-day outlook', () => {
    expect(page.outlookIssuedAt?.toISOString()).toBe('2026-11-06T01:00:00.000Z');
    expect(page.outlook.map((day) => day.day)).toEqual(['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday']);
    expect(page.outlook[0]).toEqual({ day: 'Friday', minC: 27, maxC: 32, wind: 'Light to Moderate', direction: 'Northeast', coastal: 'Slight to Moderate' });
  });

  it('treats "no Heavy Rainfall Warning" as none', () => {
    expect(page.rainfallWarning).toBeNull();
  });

  it('reads every advisory and watch with its issue time', () => {
    expect(page.advisories.map((a) => [a.heading, a.issuedAt.toISOString()])).toEqual([
      ['Thunderstorm Advisory No. 2', '2026-11-06T17:53:00.000Z'],
      ['Thunderstorm Advisory No. 1', '2026-11-06T16:20:00.000Z'],
      ['Thunderstorm Advisory No. 14', '2026-11-06T15:53:00.000Z'],
      ['Thunderstorm Watch', '2026-11-06T14:00:00.000Z'],
    ]);
  });

  it('finds nothing on a page without the sections', () => {
    expect(parsePagasaRegional('<html><body>Maintenance</body></html>')).toEqual({
      issuedAt: null, periods: [], outlookIssuedAt: null, outlook: [], rainfallWarning: null, advisories: [],
    });
  });
});

describe('cebuWeatherAlerts', () => {
  const alerts = cebuWeatherAlerts(parsePagasaRegional(html).advisories, now);

  it('makes one alert per Metro Cebu town an advisory names, pinned to that town', () => {
    const advisory = alerts.filter((a) => a.severity === 'medium');
    expect(advisory.map((a) => a.areaName)).toEqual(['Consolacion', 'Mandaue City', 'Lapu-Lapu City', 'Cordova']);
    expect(advisory.every((a) => a.lat !== null && a.type === 'weather' && a.source === 'pagasa')).toBe(true);
    expect(advisory[2].title).toBe('Thunderstorm advisory: Lapu-Lapu City');
    // Towns outside Metro Cebu stay in the text.
    expect(advisory[0].summary).toContain('San Francisco, Poro, Cordova');
    expect(advisory[0].endsAt).toBe('2026-11-06T19:53:00.000Z');
    expect(new Set(advisory.map((a) => a.fingerprint)).size).toBe(4);
  });

  it('makes one unpinned alert for a province-wide watch', () => {
    const watch = alerts.filter((a) => a.severity === 'low');
    expect(watch).toEqual([
      expect.objectContaining({ title: 'Thunderstorm watch: Cebu', areaName: 'Cebu', lat: null, endsAt: '2026-11-07T02:00:00.000Z' }),
    ]);
  });

  it('skips advisories that don\'t name Cebu or have ended', () => {
    expect(alerts).toHaveLength(5);
    expect(cebuWeatherAlerts(parsePagasaRegional(html).advisories, new Date('2026-11-07T12:00:00+08:00'))).toEqual([]);
  });
});

describe('ingestPagasa job', () => {
  it('saves the forecast and the Cebu alerts', async () => {
    const saveRegionalForecast = vi.fn();
    const upsert = vi.fn(async (list: NewAlert[], _options: { updateExisting: boolean }) => list.length);
    const result = await createIngestPagasaJob({ alerts: { upsert }, weather: { saveRegionalForecast }, fetchPage: async () => html }).run(now);
    expect(result).toEqual({ status: 'ok', detail: '2 forecast periods, 5 outlook days, 5 Cebu thunderstorm alerts', saved: 6 });
    expect(saveRegionalForecast).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'visayas', issuedAt: '2026-11-06T09:00:00.000Z', rainfallWarning: null }),
    );
    expect(upsert.mock.calls[0][1]).toEqual({ updateExisting: false });
  });

  it('fails instead of saving when the page has no forecast', async () => {
    const saveRegionalForecast = vi.fn();
    const result = await createIngestPagasaJob({
      alerts: { upsert: vi.fn() },
      weather: { saveRegionalForecast },
      fetchPage: async () => '<html><body>Maintenance</body></html>',
    }).run(now);
    expect(result.status).toBe('failed');
    expect(saveRegionalForecast).not.toHaveBeenCalled();
  });
});
