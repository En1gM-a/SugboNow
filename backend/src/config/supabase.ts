import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

// This client uses a server-only key and must never be imported by the frontend.
// It bypasses Row Level Security: use it for jobs and shared tables only.
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// A client that acts as the signed-in user, so Row Level Security limits it
// to that user's own rows. Create one per request.
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
