// Shared REST API client. Sends the signed-in user's Supabase access token.

import type { ApiErrorBody } from '@/types/api';
import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new ApiError(response.status, error?.code ?? 'http_error', error?.message ?? response.statusText);
  }
  return body as T;
}
