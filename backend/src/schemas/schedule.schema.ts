import { z } from "zod";

// POST /api/schedule and PUT /api/schedule/:id (full replacement).
export const scheduleBodySchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    // 0 = Sunday … 6 = Saturday. Duplicates are removed and days sorted.
    daysOfWeek: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(7)
      .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
    // Arrival time in Asia/Manila, 24-hour "HH:MM".
    arriveBy: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM, e.g. 07:30."),
    originLocationId: z.uuid(),
    destinationLocationId: z.uuid(),
  })
  .strict()
  .refine((body) => body.originLocationId !== body.destinationLocationId, {
    message: "Origin and destination must be different places.",
    path: ["destinationLocationId"],
  });

export type ScheduleBody = z.infer<typeof scheduleBodySchema>;
