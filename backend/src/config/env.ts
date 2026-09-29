import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  TOMTOM_API_KEY: z.string().optional(),
  GNEWS_API_KEY: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional(),
  // SunStar has no API key — this is a public RSS feed, not an authenticated
  // API. Defaults to the Cebu collection; still overridable per-environment.
  SUNSTAR_RSS_URL: z
    .string()
    .url()
    .default("https://www.sunstar.com.ph/api/v1/collections/cebu.rss"),
  // Parsed as a string: z.coerce.boolean() treats "false" as true.
  CRON_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  TZ: z.string().default("Asia/Manila"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:", result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
