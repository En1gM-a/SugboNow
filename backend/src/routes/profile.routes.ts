// /api/profile — the signed-in user's profile.

import { Router } from "express";
import { requestUser } from "../middleware/auth";
import { parseInput } from "../middleware/validate";
import { profilePatchSchema } from "../schemas/profile.schema";
import type { ProfileService } from "../services/profile.service";
import { presentProfile } from "./presenters";

export function createProfileRouter(profile: ProfileService): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json(presentProfile(await profile.get(requestUser(res))));
  });

  router.patch("/", async (req, res) => {
    const patch = parseInput(profilePatchSchema, req.body);
    res.json(presentProfile(await profile.update(requestUser(res), patch)));
  });

  return router;
}
