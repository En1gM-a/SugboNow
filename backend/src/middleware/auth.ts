// Requires a Supabase access token: `Authorization: Bearer <token>`.
// Sets res.locals.userId for downstream handlers.

import type { RequestHandler } from "express";

// Returns the user's id for a valid token, or null.
export type VerifyToken = (token: string) => Promise<string | null>;

export function createRequireAuth(verifyToken: VerifyToken): RequestHandler {
  return async (req, res, next) => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    const userId = token ? await verifyToken(token).catch(() => null) : null;
    if (!userId) {
      res.status(401).json({ error: { code: "unauthorized", message: "Sign in required." } });
      return;
    }
    res.locals.userId = userId;
    next();
  };
}
