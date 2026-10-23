import { z } from "zod";
import { ALERT_SEVERITIES, ALERT_TYPES } from "../types";
import { csvOf } from "./common.schema";

const latLng = z
  .string()
  .regex(/^\s*-?\d{1,2}(\.\d+)?\s*,\s*-?\d{1,3}(\.\d+)?\s*$/, "Use near=lat,lng, e.g. near=10.3157,123.8854.")
  .transform((value) => {
    const [lat, lng] = value.split(",").map(Number);
    return { lat, lng };
  })
  .refine(({ lat, lng }) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180, "Coordinates are out of range.");

// GET /api/alerts
export const alertsQuerySchema = z.object({
  type: csvOf(ALERT_TYPES).optional(),
  severity: csvOf(ALERT_SEVERITIES).optional(),
  area: z.string().trim().min(1).max(60).optional(),
  near: latLng.optional(),
  radiusKm: z.coerce.number().positive().max(50).default(5),
  relevant: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type AlertsQuery = z.infer<typeof alertsQuerySchema>;

// GET /api/news
export const newsQuerySchema = z.object({
  area: z.string().trim().min(1).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type NewsQuery = z.infer<typeof newsQuerySchema>;
