import { validate } from 'node-cron';
import { describe, expect, it, vi } from 'vitest';
import { CEBU_AREAS } from '../src/config/areas.js';
import { buildJobs } from '../src/jobs/index.js';
import { createGenerateBriefsJob } from '../src/jobs/generateBriefs.js';
import { createIngestCebuDailyNewsJob, createIngestSunstarJob } from '../src/jobs/ingestLocalNews.js';
import { createIngestNewsJob } from '../src/jobs/ingestNews.js';
import { createIngestTrafficJob } from '../src/jobs/ingestTraffic.js';
import { createIngestWeatherJob } from '../src/jobs/ingestWeather.js';
import { runJob } from '../src/jobs/scheduler.js';
import type { WeatherApiForecast } from '../src/integrations/weatherapi.js';
import type { NewAlert, NewsArticle, TrafficFlowLines } from '../src/types/index.js';

const now = new Date('2026-10-22T04:00:00Z');
const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

function alertsRepo() {
  return { upsert: vi.fn(async (alerts: NewAlert[], _options: { updateExisting: boolean }) => alerts.length) };
}

function article(title: string, publishedAt = '2026-10-22T03:00:00Z'): NewsArticle {
  return { title, url: `https://news.example/${encodeURIComponent(title)}`, summary: null, publishedAt: new Date(publishedAt), imageUrl: null, extra: {} };
}

describe('job list', () => {
  it('has eight jobs with valid Manila cron schedules', () => {
    const jobs = buildJobs({
      alerts: alertsRepo(),
      weather: { save: vi.fn(), saveRegionalForecast: vi.fn() },
      routes: { listPairs: vi.fn(), listSaved: vi.fn(), save: vi.fn() },
      trafficFlow: { get: vi.fn(), fetchedAt: vi.fn(), save: vi.fn() },
      briefs: { generateAll: vi.fn() },
      keys: {},
      feeds: { sunstar: 'https://feed.example/s', cebuDailyNews: 'https://feed.example/c' },
      logger: logger(),
    });
    expect(jobs.map((job) => job.name)).toEqual([
      'ingestTraffic',
      'ingestWeather',
      'ingestNews',
      'ingestSunstar',
      'ingestCebuDailyNews',
      'ingestPagasa',
      'ingestRoutes',
      'generateBriefs',
    ]);
    for (const job of jobs) expect(validate(job.schedule), job.name).toBe(true);
  });
});

describe('keyed jobs', () => {
  it('skip without their API key', async () => {
    const alerts = alertsRepo();
    const fetchIncidents = vi.fn();
    expect(await createIngestTrafficJob({ alerts, fetchIncidents }).run(now)).toEqual({ status: 'skipped', detail: 'TOMTOM_API_KEY is not set' });
    expect(fetchIncidents).not.toHaveBeenCalled();
    expect((await createIngestNewsJob({ alerts, logger: logger() }).run(now)).status).toBe('skipped');
    expect((await createIngestWeatherJob({ alerts, weather: { save: vi.fn() }, logger: logger() }).run(now)).status).toBe('skipped');
  });

  it('refreshes traffic alerts on every run', async () => {
    const alerts = alertsRepo();
    const job = createIngestTrafficJob({
      apiKey: 'key',
      alerts,
      fetchIncidents: async () => [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [123.89, 10.31] },
          properties: { id: 'T1', iconCategory: 8, magnitudeOfDelay: 4, from: 'Osmeña Blvd' },
        },
      ],
    });
    expect(await job.run(now)).toEqual({ status: 'ok', detail: '1 incidents, 1 alerts', saved: 1 });
    expect(alerts.upsert).toHaveBeenCalledWith([expect.objectContaining({ fingerprint: 'tomtom:T1', type: 'closure' })], { updateExisting: true });
  });
});

describe('traffic flow in the traffic job', () => {
  const lines: TrafficFlowLines = {
    free: [
      [
        [10.3, 123.88],
        [10.3, 123.89],
      ],
    ],
    medium: [],
    heavy: [
      [
        [10.31, 123.9],
        [10.31, 123.91],
      ],
    ],
  };
  const noIncidents = async () => [];

  it('saves the flow after the alerts', async () => {
    const flow = { fetchedAt: vi.fn(async () => null), save: vi.fn(async () => undefined) };
    const job = createIngestTrafficJob({ apiKey: 'key', alerts: alertsRepo(), flow, fetchIncidents: noIncidents, fetchFlow: async () => lines });
    expect(await job.run(now)).toEqual({ status: 'ok', detail: '0 incidents, 0 alerts; traffic flow on 2 road lines', saved: 0 });
    expect(flow.save).toHaveBeenCalledWith(lines, now);
  });

  it('keeps flow saved minutes ago, so a second run spends no tiles', async () => {
    const fetchFlow = vi.fn(async () => lines);
    const savedAt = new Date(now.getTime() - 5 * 60_000).toISOString();
    const flow = { fetchedAt: vi.fn(async () => savedAt), save: vi.fn() };
    const job = createIngestTrafficJob({ apiKey: 'key', alerts: alertsRepo(), flow, fetchIncidents: noIncidents, fetchFlow });
    expect((await job.run(now)).detail).toBe('0 incidents, 0 alerts; traffic flow is still fresh');
    expect(fetchFlow).not.toHaveBeenCalled();
  });

  it('still saves the alerts when the flow fails, and fails the run so it shows', async () => {
    const alerts = alertsRepo();
    const job = createIngestTrafficJob({
      apiKey: 'key',
      alerts,
      flow: { fetchedAt: vi.fn(async () => null), save: vi.fn() },
      fetchIncidents: async () => [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [123.89, 10.31] }, properties: { id: 'T1', iconCategory: 8, magnitudeOfDelay: 4 } },
      ],
      fetchFlow: async () => {
        throw new Error('TomTom responded with HTTP 403');
      },
    });
    expect(await job.run(now)).toEqual({ status: 'failed', detail: '1 incidents, 1 alerts; traffic flow failed: TomTom responded with HTTP 403', saved: 1 });
    expect(alerts.upsert).toHaveBeenCalledTimes(1);
  });
});

describe('weather job', () => {
  const quiet: WeatherApiForecast = {
    current: { last_updated_epoch: 1792900000, temp_c: 28, feelslike_c: 31, is_day: 1, condition: { text: 'Sunny', icon: '' }, humidity: 70, wind_kph: 9, precip_mm: 0 },
    forecast: { forecastday: [{ hour: [] }] },
  };

  it('saves every area it can and reports the rest', async () => {
    const save = vi.fn(async () => undefined);
    const log = logger();
    const job = createIngestWeatherJob({
      apiKey: 'key',
      alerts: alertsRepo(),
      weather: { save },
      logger: log,
      fetchForecast: async (_key, area) => {
        if (area.slug === 'cordova') throw new Error('timeout');
        return quiet;
      },
    });
    const result = await job.run(now);
    expect(result.status).toBe('ok');
    expect(save).toHaveBeenCalledTimes(CEBU_AREAS.length - 1);
    expect(log.warn).toHaveBeenCalledWith('Weather fetch failed', { area: 'cordova', error: 'timeout' });
  });

  it('fails when no area could be fetched', async () => {
    const job = createIngestWeatherJob({
      apiKey: 'key',
      alerts: alertsRepo(),
      weather: { save: vi.fn() },
      logger: logger(),
      fetchForecast: async () => {
        throw new Error('down');
      },
    });
    expect((await job.run(now)).status).toBe('failed');
  });
});

describe('news jobs', () => {
  it('runs every GNews query and keeps existing articles as they are', async () => {
    const alerts = alertsRepo();
    const search = vi.fn(async (_key: string, query: string, _since: Date) =>
      query.includes('brownout') ? [article('Brownout in Mandaue City')] : [],
    );
    const result = await createIngestNewsJob({ apiKey: 'key', alerts, logger: logger(), search, delayMs: 0 }).run(now);
    expect(search).toHaveBeenCalledTimes(3);
    expect(search.mock.calls[0][2]).toEqual(new Date('2026-10-21T04:00:00Z'));
    expect(result).toMatchObject({ status: 'ok', saved: 1 });
    expect(alerts.upsert).toHaveBeenCalledWith([expect.objectContaining({ source: 'gnews', type: 'power' })], { updateExisting: false });
  });

  it('fails only when every GNews query fails', async () => {
    const failing = vi.fn(async () => {
      throw new Error('HTTP 429');
    });
    expect((await createIngestNewsJob({ apiKey: 'key', alerts: alertsRepo(), logger: logger(), search: failing, delayMs: 0 }).run(now)).status).toBe('failed');
  });

  it('turns local feed articles into news and alerts', async () => {
    const alerts = alertsRepo();
    const fetchArticles = vi.fn(async () => [article('Flooding in Talisay'), article('Council meets', '2026-10-10T00:00:00Z')]);
    const result = await createIngestSunstarJob({ feedUrl: 'https://feed.example/s', alerts, fetchArticles }).run(now);
    expect(fetchArticles).toHaveBeenCalledWith('https://feed.example/s');
    expect(result).toEqual({ status: 'ok', detail: '2 Cebu articles, 1 recent', saved: 1 });
    expect(alerts.upsert.mock.calls[0][0][0]).toMatchObject({ source: 'sunstar', type: 'flood' });

    const cdn = await createIngestCebuDailyNewsJob({ feedUrl: 'https://feed.example/c', alerts, fetchArticles: async () => [article('Cebu City council session')] }).run(now);
    expect(cdn.status).toBe('ok');
    expect(alerts.upsert.mock.calls[1][0][0]).toMatchObject({ source: 'cebudailynews', type: 'news' });
  });
});

describe('briefs job and runner', () => {
  it('reports generated briefs', async () => {
    const job = createGenerateBriefsJob({ generateAll: vi.fn(async () => ({ generated: 3, failed: 1 })) });
    expect(await job.run(now)).toEqual({ status: 'ok', detail: '3 briefs, 1 failed', saved: 3 });
  });

  it('never throws from runJob', async () => {
    const log = logger();
    const job = { name: 'boom', schedule: '* * * * *', description: '', run: async () => { throw new Error('exploded'); } };
    expect(await runJob(job, log, now)).toEqual({ status: 'failed', detail: 'exploded' });
    expect(log.error).toHaveBeenCalled();
  });
});
