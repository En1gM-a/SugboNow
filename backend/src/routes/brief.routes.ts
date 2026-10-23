// /api/brief/today — today's Cebu Daily Brief with live leave times and alerts.

import { Router } from "express";
import { requestUser } from "../middleware/auth";
import type { BriefService } from "../services/brief.service";
import { presentTodayBrief } from "./presenters";

export function createBriefRouter(briefs: BriefService, now: () => Date = () => new Date()): Router {
  const router = Router();
  router.get("/today", async (_req, res) => {
    res.json(presentTodayBrief(await briefs.getToday(requestUser(res).id), now()));
  });
  return router;
}
