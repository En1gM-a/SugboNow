import { describe, expect, it, vi } from 'vitest';
import { cacheVerifiedTokens, TOKEN_CACHE_MS } from '../src/middleware/auth.js';

// A token shaped like Supabase's, expiring `expiresInMs` after `issuedAt`.
function jwt(issuedAt: number, expiresInMs: number): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'HS256' })}.${part({ sub: 'user-1', exp: Math.floor((issuedAt + expiresInMs) / 1000) })}.signature`;
}

function setup(answer: (token: string) => Promise<string | null> = async () => 'user-1') {
  const clock = { at: Date.parse('2026-11-14T00:00:00Z') };
  const verify = vi.fn(answer);
  const cached = cacheVerifiedTokens(verify, { now: () => clock.at, maxTokens: 2 });
  return { clock, verify, cached };
}

describe('verified token cache', () => {
  it('asks once for a token, then again after a minute', async () => {
    const { clock, verify, cached } = setup();
    expect(await cached('token')).toBe('user-1');
    clock.at += TOKEN_CACHE_MS - 1;
    expect(await cached('token')).toBe('user-1');
    expect(verify).toHaveBeenCalledTimes(1);

    clock.at += 1;
    expect(await cached('token')).toBe('user-1');
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it('never trusts a token past its own expiry', async () => {
    const { clock, verify, cached } = setup();
    const token = jwt(clock.at, 10_000);
    await cached(token);
    clock.at += 9_000;
    await cached(token);
    expect(verify).toHaveBeenCalledTimes(1);

    clock.at += 1_000;
    await cached(token);
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it('keeps asking about a token that was refused or could not be checked', async () => {
    const refused = setup(async () => null);
    expect(await refused.cached('bad')).toBeNull();
    expect(await refused.cached('bad')).toBeNull();
    expect(refused.verify).toHaveBeenCalledTimes(2);

    const failing = setup(vi.fn().mockRejectedValueOnce(new Error('Auth is down')).mockResolvedValue('user-1'));
    await expect(failing.cached('token')).rejects.toThrow('Auth is down');
    expect(await failing.cached('token')).toBe('user-1');
    expect(failing.verify).toHaveBeenCalledTimes(2);
  });

  it('shares one check between requests that arrive together', async () => {
    let finish: (userId: string) => void = () => undefined;
    const { verify, cached } = setup(() => new Promise((resolve) => (finish = resolve)));
    const requests = [cached('token'), cached('token'), cached('token')];
    finish('user-1');
    expect(await Promise.all(requests)).toEqual(['user-1', 'user-1', 'user-1']);
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('keeps each token with its own user, and forgets the oldest when full', async () => {
    const { verify, cached } = setup(async (token) => `user-of-${token}`);
    expect(await cached('a')).toBe('user-of-a');
    expect(await cached('b')).toBe('user-of-b');
    expect(await cached('c')).toBe('user-of-c'); // holds 2: "a" is forgotten
    expect(verify).toHaveBeenCalledTimes(3);

    expect(await cached('b')).toBe('user-of-b');
    expect(await cached('c')).toBe('user-of-c');
    expect(verify).toHaveBeenCalledTimes(3);
    expect(await cached('a')).toBe('user-of-a');
    expect(verify).toHaveBeenCalledTimes(4);
  });
});
