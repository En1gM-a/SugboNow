import { afterEach, describe, expect, it, vi } from 'vitest';

const requiredEnv = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

async function loadEnv(overrides: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...requiredEnv, ...overrides })) {
    vi.stubEnv(key, value);
  }
  const module = await import('../src/config/env.js');
  return module.env;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('env configuration', () => {
  it('reads CRON_ENABLED=false as disabled', async () => {
    const env = await loadEnv({ CRON_ENABLED: 'false' });
    expect(env.CRON_ENABLED).toBe(false);
  });

  it('reads CRON_ENABLED=true as enabled', async () => {
    const env = await loadEnv({ CRON_ENABLED: 'true' });
    expect(env.CRON_ENABLED).toBe(true);
  });

  it('defaults CRON_ENABLED to disabled when unset', async () => {
    vi.resetModules();
    for (const [key, value] of Object.entries(requiredEnv)) {
      vi.stubEnv(key, value);
    }
    vi.stubEnv('CRON_ENABLED', undefined);
    const { env } = await import('../src/config/env.js');
    expect(env.CRON_ENABLED).toBe(false);
  });

  it('rejects an unrecognised CRON_ENABLED value', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await loadEnv({ CRON_ENABLED: 'yes' });
    expect(exit).toHaveBeenCalledWith(1);
  });
});
