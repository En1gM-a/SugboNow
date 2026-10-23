import { z } from "zod";
import { LOCATION_KINDS } from "../types";

// POST /api/locations and PUT /api/locations/:id (full replacement).
export const locationBodySchema = z
  .object({
    label: z.string().trim().min(1).max(60),
    kind: z.enum(LOCATION_KINDS).default("other"),
    addressText: z.string().trim().min(1).max(200),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .strict();

export type LocationBody = z.infer<typeof locationBodySchema>;
