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
import type { NewAlert, NewsArticle } from '../src/types/index.js';

const now = new Date('2026-10-22T04:00:00Z');
const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

function alertsRepo() {
  return { upsert: vi.fn(async (alerts: NewAlert[], _options: { updateExisting: boolean }) => alerts.length) };
}

function article(title: string, publishedAt = '2026-10-22T03:00:00Z'): NewsArticle {
  return { title, url: `https://news.example/${encodeURIComponent(title)}`, summary: null, publishedAt: new Date(publishedAt), imageUrl: null, extra: {} };
}

describe('job list', () => {
  it('has six jobs with valid Manila cron schedules', () => {
    const jobs = buildJobs({
      alerts: alertsRepo(),
      weather: { save: vi.fn() },
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
    expect(search.mock.calls[0][2]).toEqual(new Date('2026-10-20T04:00:00Z'));
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
