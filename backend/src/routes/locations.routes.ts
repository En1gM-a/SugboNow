// /api/locations — the signed-in user's saved places.

import { Router } from "express";
import { requestUser } from "../middleware/auth";
import { parseInput } from "../middleware/validate";
import { idParamSchema } from "../schemas/common.schema";
import { locationBodySchema } from "../schemas/location.schema";
import type { LocationsService } from "../services/locations.service";
import { presentLocation } from "./presenters";

export function createLocationsRouter(locations: LocationsService): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json({ locations: (await locations.list(requestUser(res))).map(presentLocation) });
  });

  router.post("/", async (req, res) => {
    const body = parseInput(locationBodySchema, req.body);
    res.status(201).json(presentLocation(await locations.create(requestUser(res), body)));
  });

  router.put("/:id", async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    const body = parseInput(locationBodySchema, req.body);
    res.json(presentLocation(await locations.update(requestUser(res), id, body)));
  });

  router.delete("/:id", async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    await locations.remove(requestUser(res), id);
    res.status(204).end();
  });

  return router;
}
