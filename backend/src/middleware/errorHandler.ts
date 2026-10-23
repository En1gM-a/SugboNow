// Turns thrown errors into the API's error shape:
// { "error": { "code": "...", "message": "...", "details"?: [...] } }

import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/errors";
import type { Logger } from "../utils/logger";

function isJsonParseError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { type?: unknown }).type === "entity.parse.failed";
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, _req, res, _next) => {
    if (error instanceof AppError) {
      res.status(error.status).json({
        error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
      });
      return;
    }
    if (isJsonParseError(error)) {
      res.status(400).json({ error: { code: "invalid_request", message: "The request body must be valid JSON." } });
      return;
    }
    logger.error("Unhandled request error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: { code: "internal_error", message: "Something went wrong." } });
  };
}
