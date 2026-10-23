import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// API keys are optional: a job whose key is missing (or blank in .env) is
// skipped instead of crashing the server.
const optionalKey = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() ? value.trim() : undefined));

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Publishable (anon) key. Requests for a user's own data are sent with it
  // plus the user's access token, so Row Level Security applies to them.
  SUPABASE_ANON_KEY: z.string().min(1),
  TOMTOM_API_KEY: optionalKey,
  GNEWS_API_KEY: optionalKey,
  AI_API_KEY: optionalKey,
  WEATHER_API_KEY: optionalKey,
  // Public RSS feeds, no keys. SunStar's Cebu-only collection is empty, so the
  // local-news feed is used and filtered to Cebu stories.
  SUNSTAR_RSS_URL: z
    .string()
    .url()
    .default("https://www.sunstar.com.ph/api/v1/collections/local-news.rss"),
  CDN_RSS_URL: z
    .string()
    .url()
    .default("https://cebudailynews.inquirer.net/category/latest-news/feed"),
  // Parsed as a string: z.coerce.boolean() treats "false" as true.
  CRON_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  // Kill switch for the sign-in-triggered Facebook check. When false, the
  // refresh endpoint serves saved posts only.
  FB_SCRAPE_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  // Minimum minutes between Facebook checks of the same page, however many
  // users sign in.
  FB_REFRESH_INTERVAL_MINUTES: z.coerce.number().int().min(1).default(10),
  TZ: z.string().default("Asia/Manila"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:", result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
