// /api/routes — the road route between two of the signed-in user's places.

import { Router } from "express";
import { z } from "zod";
import { requestUser } from "../middleware/auth";
import { parseInput } from "../middleware/validate";
import type { RoutesService } from "../services/routes.service";
import { presentRoute } from "./presenters";

const routesQuerySchema = z.object({
  from: z.uuid("Must be a valid id."),
  to: z.uuid("Must be a valid id."),
});

export function createRoutesRouter(routes: RoutesService): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const { from, to } = parseInput(routesQuerySchema, req.query);
    const result = await routes.between(requestUser(res), from, to);
    res.json({
      from: result.from,
      to: result.to,
      withCclex: presentRoute(result.withCclex),
      withoutCclex: presentRoute(result.withoutCclex),
    });
  });

  return router;
}
