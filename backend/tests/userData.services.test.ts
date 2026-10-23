import { describe, expect, it, vi } from 'vitest';
import type { LguSourcesRepository } from '../src/services/lguSources.repository.js';
import type { LocationsRepository } from '../src/services/locations.repository.js';
import { createLocationsService } from '../src/services/locations.service.js';
import type { ProfileRepository } from '../src/services/profile.repository.js';
import { createProfileService } from '../src/services/profile.service.js';
import type { ScheduleRepository } from '../src/services/schedule.repository.js';
import { createScheduleService } from '../src/services/schedule.service.js';
import type { LocationRow, ProfileRow, ScheduleRow } from '../src/types/index.js';
import { AppError } from '../src/utils/errors.js';
import { TEST_USER } from './helpers/testApp.js';

const HOME = '11111111-1111-4111-8111-111111111111';
const SCHOOL = '22222222-2222-4222-8222-222222222222';
const SOMEONE_ELSES = '33333333-3333-4333-8333-333333333333';

function location(id: string, label: string): LocationRow {
  return { id, label, kind: 'other', address_text: label, lat: 10.3, lng: 123.9, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' };
}

const profileRow: ProfileRow = {
  id: TEST_USER.id,
  display_name: 'thea',
  first_name: 'Thea',
  city: 'cebu_city',
  address_text: null,
  subscribed_mayor: null,
  commute_origin_location_id: null,
  commute_destination_location_id: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

function locationsRepo(owned: LocationRow[] = [location(HOME, 'Home'), location(SCHOOL, 'School')]): LocationsRepository {
  return {
    list: vi.fn(async () => owned),
    findOwned: vi.fn(async (_user, ids: string[]) => owned.filter((place) => ids.includes(place.id))),
    create: vi.fn(),
    update: vi.fn(async () => null),
    remove: vi.fn(async () => false),
  };
}

async function errorOf(promise: Promise<unknown>): Promise<AppError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
}

describe('profile service', () => {
  function setup(activeSlugs = ['mandaue_city']) {
    const profiles: ProfileRepository = {
      get: vi.fn(async () => profileRow),
      update: vi.fn(async (_user, changes) => ({ ...profileRow, ...changes })),
    };
    const lguSources: LguSourcesRepository = {
      listActive: vi.fn(async () => []),
      isActiveSlug: vi.fn(async (slug: string) => activeSlugs.includes(slug)),
    };
    return { profiles, service: createProfileService({ profiles, locations: locationsRepo(), lguSources }) };
  }

  it('saves only the fields sent, mapped to columns', async () => {
    const { profiles, service } = setup();
    const updated = await service.update(TEST_USER, {
      firstName: 'Althea',
      city: 'mandaue_city',
      subscribedMayor: 'mandaue_city',
      commuteOriginLocationId: HOME,
      addressText: null,
    });
    expect(profiles.update).toHaveBeenCalledWith(TEST_USER, {
      first_name: 'Althea',
      city: 'mandaue_city',
      subscribed_mayor: 'mandaue_city',
      commute_origin_location_id: HOME,
      address_text: null,
    });
    expect(updated.first_name).toBe('Althea');
  });

  it('rejects unknown cities, unknown LGUs and places that are not the user’s', async () => {
    const { profiles, service } = setup();
    const error = await errorOf(
      service.update(TEST_USER, { city: 'manila', subscribedMayor: 'davao_city', commuteDestinationLocationId: SOMEONE_ELSES }),
    );
    expect(error.status).toBe(400);
    expect(error.details?.map((detail) => detail.path)).toEqual(['city', 'subscribedMayor', 'commuteDestinationLocationId']);
    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('returns 404 when the profile row is missing', async () => {
    const { profiles, service } = setup();
    vi.mocked(profiles.get).mockResolvedValueOnce(null);
    expect((await errorOf(service.get(TEST_USER))).status).toBe(404);
  });
});

describe('locations service', () => {
  it('returns 404 for a place that does not exist', async () => {
    const service = createLocationsService(locationsRepo());
    const body = { label: 'Gym', kind: 'other' as const, addressText: 'IT Park', lat: 10.33, lng: 123.9 };
    expect((await errorOf(service.update(TEST_USER, HOME, body))).status).toBe(404);
    expect((await errorOf(service.remove(TEST_USER, HOME))).status).toBe(404);
  });
});

describe('schedule service', () => {
  const body = { title: 'School', daysOfWeek: [1, 3, 5], arriveBy: '07:30', originLocationId: HOME, destinationLocationId: SCHOOL };

  function setup(owned?: LocationRow[]) {
    const entry = { id: 'entry-1' } as ScheduleRow;
    const schedule: ScheduleRepository = {
      list: vi.fn(async () => [entry]),
      create: vi.fn(async () => entry),
      update: vi.fn(async () => null),
      remove: vi.fn(async () => true),
    };
    return { schedule, service: createScheduleService(schedule, locationsRepo(owned)) };
  }

  it('creates an entry between two of the user’s places', async () => {
    const { schedule, service } = setup();
    await service.create(TEST_USER, body);
    expect(schedule.create).toHaveBeenCalledWith(TEST_USER, body);
  });

  it('rejects places that are not the user’s', async () => {
    const { schedule, service } = setup([]);
    const error = await errorOf(service.create(TEST_USER, body));
    expect(error.details?.map((detail) => detail.path)).toEqual(['originLocationId', 'destinationLocationId']);
    expect(schedule.create).not.toHaveBeenCalled();
  });

  it('returns 404 when updating a missing entry', async () => {
    const { service } = setup();
    expect((await errorOf(service.update(TEST_USER, 'entry-x', body))).status).toBe(404);
  });
});
