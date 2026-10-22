import { z } from "zod";

// PATCH /api/profile — send only the fields to change; null clears a field.
export const profilePatchSchema = z
  .object({
    displayName: z.string().trim().min(1).max(60).nullable(),
    firstName: z.string().trim().min(1).max(40).nullable(),
    // An area slug from GET /api/areas, e.g. "mandaue_city".
    city: z.string().trim().min(1).max(40).nullable(),
    addressText: z.string().trim().min(1).max(200).nullable(),
    // An LGU slug from GET /api/lgu-sources, e.g. "cebu_city".
    subscribedMayor: z.string().trim().min(1).max(40).nullable(),
    commuteOriginLocationId: z.uuid().nullable(),
    commuteDestinationLocationId: z.uuid().nullable(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Send at least one field to change." });

export type ProfilePatch = z.infer<typeof profilePatchSchema>;
