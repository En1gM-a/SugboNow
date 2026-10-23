import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { vi } from 'vitest';
import { createApp, type AppServices } from '../../src/app.js';
import type { RequestUser } from '../../src/types/index.js';

export const TEST_TOKEN = 'good-token';
export const TEST_USER: RequestUser = { id: 'user-1', accessToken: TEST_TOKEN };
export const authHeaders = { Authorization: `Bearer ${TEST_TOKEN}` };
export const jsonHeaders = { ...authHeaders, 'Content-Type': 'application/json' };

export interface TestServer {
  base: string;
  logger: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  close(): Promise<void>;
}

// Starts the real Express app on a random port with fake services; only the
// services a test uses need to be provided.
export async function startTestApp(services: Partial<AppServices>, now?: () => Date): Promise<TestServer> {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const app = createApp({
    frontendOrigin: 'http://localhost:5173',
    verifyToken: async (token) => (token === TEST_TOKEN ? TEST_USER.id : null),
    services: services as AppServices,
    logger,
    now,
  });
  const server: Server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return {
    base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    logger,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
