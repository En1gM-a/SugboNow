// Importable Express app factory. Dependencies are passed in so tests can
// build the app without real Supabase or Facebook access.

import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { createRequireAuth, type VerifyToken } from "./middleware/auth";
import { createLguPostsRouter } from "./routes/lguPosts.routes";
import type { LguPostsService } from "./services/lguPosts.service";
import type { Logger } from "./utils/logger";

export interface AppDependencies {
  frontendOrigin: string;
  verifyToken: VerifyToken;
  lguPostsService: LguPostsService;
  logger: Logger;
}

export function createApp(deps: AppDependencies) {
  const app = express();
  app.use(cors({ origin: deps.frontendOrigin }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/lgu-posts", createRequireAuth(deps.verifyToken), createLguPostsRouter(deps.lguPostsService));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "not_found", message: "Not found." } });
  });

  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    deps.logger.error("Unhandled request error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: { code: "internal_error", message: "Something went wrong." } });
  };
  app.use(onError);

  return app;
}
