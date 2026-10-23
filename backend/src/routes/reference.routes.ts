// Reference lists for pickers: /api/areas (home city) and /api/lgu-sources
// (which mayor or governor to follow).

import { Router } from "express";
import { CEBU_AREAS } from "../config/areas";
import type { LguSourcesRepository } from "../services/lguSources.repository";
import { presentArea, presentLguSource } from "./presenters";

export function createAreasRouter(): Router {
  const router = Router();
  router.get("/", (_req, res) => {
    res.json({ areas: CEBU_AREAS.map(presentArea) });
  });
  return router;
}

export function createLguSourcesRouter(lguSources: LguSourcesRepository): Router {
  const router = Router();
  router.get("/", async (_req, res) => {
    res.json({ sources: (await lguSources.listActive()).map(presentLguSource) });
  });
  return router;
}
