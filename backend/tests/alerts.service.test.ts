import { describe, expect, it, vi } from 'vitest';
import { alertsQuerySchema } from '../src/schemas/alerts.schema.js';
import type { AlertsRepository } from '../src/services/alerts.repository.js';
import { DEFAULT_ALERT_TYPES, createAlertsService } from '../src/services/alerts.service.js';
import type { LocationsRepository } from '../src/services/locations.repository.js';
import { NEWS_SOURCES, type AlertRow } from '../src/types/index.js';
import { TEST_USER } from './helpers/testApp.js';

const now = new Date('2026-10-22T22:00:00Z');

function alert(id: string, overrides: Partial<AlertRow> = {}): AlertRow {
  return {
    id,
    source: 'tomtom',
    type: 'traffic',
    severity: 'medium',
    title: `Alert ${id}`,
    summary: null,
    lat: 10.316,
    lng: 123.886,
    area_name: 'Cebu City',
    starts_at: '2026-10-22T21:00:00Z',
    ends_at: '2026-10-22T23:00:00Z',
    source_url: null,
    image_url: null,
    created_at: '2026-10-22T21:00:00Z',
    ...overrides,
  };
}

function setup(rows: AlertRow[]) {
  const alerts: AlertsRepository = {
    listActive: vi.fn(async () => rows),
    listNews: vi.fn(async () => rows),
    getById: vi.fn(async () => null),
    upsert: vi.fn(),
  };
  const locations = {
    list: vi.fn(async () => [{ id: 'home', label: 'Home', kind: 'home', address_text: '', lat: 10.3157, lng: 123.8854, created_at: '', updated_at: '' }]),
  } as unknown as LocationsRepository;
  return { alerts, service: createAlertsService({ alerts, locations, now: () => now }) };
}

const query = (input: Record<string, string> = {}) => alertsQuerySchema.parse(input);

describe('alerts service', () => {
  it('lists active and upcoming alerts, leaving plain news out by default', async () => {
    const { alerts, service } = setup([]);
    await service.list(TEST_USER, query());
    expect(alerts.listActive).toHaveBeenCalledWith({
      now,
      startsBefore: new Date('2026-10-24T22:00:00Z'),
      types: DEFAULT_ALERT_TYPES,
      severities: undefined,
      area: undefined,
      limit: 200,
    });
    expect(DEFAULT_ALERT_TYPES).not.toContain('news');
  });

  it('sorts by severity, then type priority, and applies the limit', async () => {
    const { service } = setup([
      alert('power', { type: 'power', severity: 'low' }),
      alert('jam', { severity: 'medium' }),
      alert('class', { type: 'advisory', severity: 'medium' }),
      alert('closure', { type: 'closure', severity: 'high' }),
    ]);
    const items = await service.list(TEST_USER, query({ limit: '3' }));
    expect(items.map((item) => item.alert.id)).toEqual(['closure', 'class', 'jam']);
  });

  it('filters by distance with near and radiusKm', async () => {
    const { service } = setup([alert('near'), alert('far', { lat: 10.2093, lng: 123.758 }), alert('nowhere', { lat: null, lng: null })]);
    const items = await service.list(TEST_USER, query({ near: '10.3157,123.8854', radiusKm: '2' }));
    expect(items.map((item) => item.alert.id)).toEqual(['near']);
  });

  it('with relevant=true, returns only alerts near the user’s places, with those places', async () => {
    const { service } = setup([alert('near'), alert('far', { lat: 10.2093, lng: 123.758 })]);
    const items = await service.list(TEST_USER, query({ relevant: 'true' }));
    expect(items).toHaveLength(1);
    expect(items[0].places).toEqual([{ id: 'home', label: 'Home', distanceKm: 0.1 }]);
  });

  it('lists news from the news sources for the last 72 hours', async () => {
    const { alerts, service } = setup([]);
    await service.news({ limit: 20, area: 'Mandaue' });
    expect(alerts.listNews).toHaveBeenCalledWith({ since: new Date('2026-10-19T22:00:00Z'), sources: NEWS_SOURCES, area: 'Mandaue', limit: 20 });
  });

  it('returns 404 for an unknown alert', async () => {
    const { service } = setup([]);
    await expect(service.get('missing')).rejects.toMatchObject({ status: 404, code: 'not_found' });
  });
});
