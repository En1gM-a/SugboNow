import { afterEach, describe, expect, it, vi } from 'vitest';

const requiredEnv = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  SUPABASE_ANON_KEY: 'anon-key',
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

  it('treats a blank API key as missing so its job is skipped', async () => {
    const env = await loadEnv({ AI_API_KEY: '', TOMTOM_API_KEY: '  ', GNEWS_API_KEY: ' abc123 ' });
    expect(env.AI_API_KEY).toBeUndefined();
    expect(env.TOMTOM_API_KEY).toBeUndefined();
    expect(env.GNEWS_API_KEY).toBe('abc123');
  });

  it('requires the Supabase anon key', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await loadEnv({ SUPABASE_ANON_KEY: '' });
    expect(exit).toHaveBeenCalledWith(1);
    expect(JSON.stringify(error.mock.calls)).toContain('SUPABASE_ANON_KEY');
  });
});
