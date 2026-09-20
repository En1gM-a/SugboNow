import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// This client uses a server-only key and must never be imported by the frontend.
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
