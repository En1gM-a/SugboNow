// Requires a Supabase access token: `Authorization: Bearer <token>`.
// Sets res.locals.userId and res.locals.accessToken for downstream handlers.

import type { RequestHandler, Response } from "express";
import type { RequestUser } from "../types";

// Returns the user's id for a valid token, or null.
export type VerifyToken = (token: string) => Promise<string | null>;

// How long a token Supabase Auth has accepted is trusted before it's asked again.
// A page sends several requests at once and each used to wait for its own check.
// The cost: signing out revokes a token in Supabase Auth at once, but it keeps
// working here for up to this long, and never past its own expiry.
export const TOKEN_CACHE_MS = 60_000;
const TOKEN_CACHE_SIZE = 1_000;

export interface TokenCacheOptions {
  ttlMs?: number;
  maxTokens?: number;
  now?: () => number;
}

// When the token itself expires (its `exp` claim), in milliseconds. Read without
// checking the signature, which is safe here: it can only shorten how long an
// answer from Supabase Auth is kept.
function tokenExpiry(token: string): number | null {
  try {
    const claims: unknown = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
    const exp = typeof claims === "object" && claims !== null ? (claims as { exp?: unknown }).exp : undefined;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

// Wraps `verify` so each token is checked once per TOKEN_CACHE_MS. Only accepted
// tokens are remembered; a refused token or a failed check is asked about again
// next time. Requests arriving together with the same token share one check.
export function cacheVerifiedTokens(verify: VerifyToken, options: TokenCacheOptions = {}): VerifyToken {
  const ttlMs = options.ttlMs ?? TOKEN_CACHE_MS;
  const maxTokens = options.maxTokens ?? TOKEN_CACHE_SIZE;
  const now = options.now ?? Date.now;
  const accepted = new Map<string, { userId: string; until: number }>();
  const checking = new Map<string, Promise<string | null>>();

  function remember(token: string, userId: string): void {
    const until = Math.min(now() + ttlMs, tokenExpiry(token) ?? Infinity);
    if (until <= now()) return;
    // A Map lists its keys oldest first, so this drops the token remembered longest ago.
    if (accepted.size >= maxTokens) accepted.delete(accepted.keys().next().value as string);
    accepted.set(token, { userId, until });
  }

  return (token) => {
    const known = accepted.get(token);
    if (known && now() < known.until) return Promise.resolve(known.userId);
    if (known) accepted.delete(token);

    let check = checking.get(token);
    if (!check) {
      check = verify(token)
        .then((userId) => {
          if (userId) remember(token, userId);
          return userId;
        })
        .finally(() => checking.delete(token));
      checking.set(token, check);
    }
    return check;
  };
}

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
    res.locals.accessToken = token;
    next();
  };
}

// The signed-in user for a request that passed createRequireAuth.
export function requestUser(res: Response): RequestUser {
  return { id: res.locals.userId as string, accessToken: res.locals.accessToken as string };
}
