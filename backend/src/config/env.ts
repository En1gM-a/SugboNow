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
  CRON_ENABLED: z.coerce.boolean().default(false),
  TZ: z.string().default("Asia/Manila"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:", result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
