// Shared REST API client. Sends the signed-in user's Supabase access token.

import type { ApiErrorBody, ApiErrorDetail } from '@/types/api';
import { getSupabase, readStoredSession, USE_MOCKS } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The access token: straight from storage when it's fresh (no need to load supabase-js first), else from supabase-js. */
async function accessToken(fromSupabase: boolean): Promise<string | undefined> {
  if (!fromSupabase) {
    const stored = readStoredSession();
    if (stored) return stored.accessToken;
  }
  const { data } = await (await getSupabase()).auth.getSession();
  return data.session?.access_token;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');

  const send = async (fromSupabase: boolean) => {
    if (!USE_MOCKS) {
      const token = await accessToken(fromSupabase);
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    try {
      return await fetch(`${API_BASE}${path}`, { ...init, headers });
    } catch {
      throw new ApiError(0, 'network_error', "Can't reach Sugbo Now. Check your connection.");
    }
  };

  let response = await send(false);
  // A stored token can be revoked early; ask supabase-js (which refreshes it) and retry once.
  if (response.status === 401 && !USE_MOCKS) response = await send(true);
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new ApiError(response.status, error?.code ?? 'http_error', error?.message ?? response.statusText, error?.details);
  }
  return body as T;
}

export function jsonBody(method: 'POST' | 'PUT' | 'PATCH', data: unknown): RequestInit {
  return { method, body: JSON.stringify(data) };
}

/** Finds the API validation message for one field, e.g. fieldError(err, 'arriveBy'). */
export function fieldError(error: unknown, path: string): string | undefined {
  return error instanceof ApiError ? error.details.find((d) => d.path === path)?.message : undefined;
}
