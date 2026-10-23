// /api/schedule — the signed-in user's recurring schedule entries.

import { Router } from "express";
import { requestUser } from "../middleware/auth";
import { parseInput } from "../middleware/validate";
import { idParamSchema } from "../schemas/common.schema";
import { scheduleBodySchema } from "../schemas/schedule.schema";
import type { ScheduleService } from "../services/schedule.service";
import { presentSchedule } from "./presenters";

export function createScheduleRouter(schedule: ScheduleService): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json({ entries: (await schedule.list(requestUser(res))).map(presentSchedule) });
  });

  router.post("/", async (req, res) => {
    const body = parseInput(scheduleBodySchema, req.body);
    res.status(201).json(presentSchedule(await schedule.create(requestUser(res), body)));
  });

  router.put("/:id", async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    const body = parseInput(scheduleBodySchema, req.body);
    res.json(presentSchedule(await schedule.update(requestUser(res), id, body)));
  });

  router.delete("/:id", async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    await schedule.remove(requestUser(res), id);
    res.status(204).end();
  });

  return router;
}
