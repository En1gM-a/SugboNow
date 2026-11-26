import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// On Vercel the API starts cold after every quiet spell, and everything its
// entry file loads is paid for before the first request is answered. Playwright
// and cheerio (about half a second between them) and the job code are only
// needed by the jobs and the Facebook check, which don't run there.
describe('API start-up', () => {
  it('loads the Vercel entry without Playwright, cheerio or the job code', () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', '-e', "require('./index.ts'); console.log(JSON.stringify(Object.keys(require.cache)))"],
      {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
        // Placeholders: loading the entry builds the app but calls nothing.
        env: { ...process.env, SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'test', SUPABASE_ANON_KEY: 'test' },
      },
    );
    expect(result.status, result.stderr).toBe(0);
    const line = result.stdout.split('\n').find((candidate) => candidate.startsWith('['));
    const loaded = (JSON.parse(line ?? '[]') as string[]).map((file) => file.replace(/\\/g, '/'));

    expect(loaded.some((file) => file.endsWith('/src/app.ts'))).toBe(true);
    for (const heavy of ['/node_modules/playwright', '/node_modules/cheerio/', '/node_modules/node-cron/', '/src/jobs/']) {
      expect(loaded.filter((file) => file.includes(heavy))).toEqual([]);
    }
  }, 30_000);
});
