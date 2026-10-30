import type { SupabaseClient } from "@supabase/supabase-js";

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!USE_MOCKS && (!url || !key)) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

let client: Promise<SupabaseClient> | null = null;

/**
 * The Supabase client, loaded on demand (about 55 KB gzipped) so it never delays the first paint.
 * This key is intended for browser use. Database access is still protected by RLS.
 * With mocks on, auth is simulated in AuthContext and Supabase is never loaded.
 */
export function getSupabase(): Promise<SupabaseClient> {
  client ??= import("@supabase/supabase-js").then(({ createClient }) => createClient(url, key));
  return client;
}

export interface StoredSession {
  accessToken: string;
  user: { id: string; email: string };
}

/**
 * Reads the session supabase-js keeps in localStorage, without loading supabase-js, so signed-in pages
 * and their API calls can start at once. Returns null when there is none or the access token has expired
 * (then supabase-js refreshes it and the app waits for that). supabase-js stays the source of truth:
 * AuthContext still confirms the session with it in the background.
 * Uses supabase-js v2's default storage key, `sb-<project-ref>-auth-token`.
 */
export function readStoredSession(): StoredSession | null {
  if (USE_MOCKS || !url) return null;
  try {
    const ref = new URL(url).hostname.split(".")[0];
    const raw = localStorage.getItem(`sb-${ref}-auth-token`);
    if (!raw) return null;
    const s = JSON.parse(raw) as { access_token?: string; expires_at?: number; user?: { id?: string; email?: string } };
    // Treat tokens within a minute of expiry as expired, like supabase-js does.
    if (!s.access_token || !s.user?.id || !s.expires_at || s.expires_at * 1000 < Date.now() + 60_000) return null;
    return { accessToken: s.access_token, user: { id: s.user.id, email: s.user.email ?? "" } };
  } catch {
    return null;
  }
}
