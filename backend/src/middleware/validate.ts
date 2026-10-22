// Parses request input with a Zod schema; invalid input becomes a 400 with
// one entry per problem, e.g. { path: "arriveBy", message: "Use 24-hour HH:MM…" }.

import type { z } from "zod";
import { badRequest } from "../utils/errors";

export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw badRequest(
    "Some fields are invalid.",
    result.error.issues.map((issue) => ({ path: issue.path.map(String).join("."), message: issue.message })),
  );
}
