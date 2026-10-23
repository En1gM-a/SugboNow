// Turns Supabase (PostgREST) errors into API errors when they are caused by
// the request — bad input, a record still in use, an expired token. Other
// database errors stay plain errors and become a 500.

import type { PostgrestError } from "@supabase/supabase-js";
import { badRequest, conflict, forbidden, unauthorized } from "./errors";

export interface DbErrorMessages {
  foreignKey?: string;
  unique?: string;
}

export function dbError(error: PostgrestError, messages: DbErrorMessages = {}): Error {
  switch (error.code) {
    case "23503": // foreign_key_violation
      return conflict(messages.foreignKey ?? "This record is still in use.");
    case "23505": // unique_violation
      return conflict(messages.unique ?? "This record already exists.");
    case "23514": // check_violation
    case "22P02": // invalid_text_representation
    case "22007": // invalid_datetime_format
    case "22008": // datetime_field_overflow
      return badRequest("Some fields are invalid.");
    case "42501": // insufficient_privilege (Row Level Security)
      return forbidden("You can't change this record.");
    case "PGRST301": // JWT could not be decoded
    case "PGRST302": // missing bearer token
    case "PGRST303": // JWT claims invalid, e.g. expired
      return unauthorized();
    default:
      return Object.assign(new Error(`Database error: ${error.message}`), { cause: error });
  }
}

// Escapes % and _ so user text is matched literally in ilike filters.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
