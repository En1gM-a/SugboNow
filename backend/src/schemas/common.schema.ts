import { z } from "zod";

export const idParamSchema = z.object({ id: z.uuid("Must be a valid id.") });

// "a,b,c" → ["a", "b", "c"], each checked against `values`.
export function csvOf<const T extends readonly [string, ...string[]]>(values: T) {
  return z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(values)).min(1));
}
