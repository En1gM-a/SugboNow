// /api/alerts — active and upcoming alerts; /api/news — latest Cebu news.

import { Router } from "express";
import { requestUser } from "../middleware/auth";
import { parseInput } from "../middleware/validate";
import { alertsQuerySchema, newsQuerySchema } from "../schemas/alerts.schema";
import { idParamSchema } from "../schemas/common.schema";
import type { AlertsService } from "../services/alerts.service";
import { presentAlert, presentNews } from "./presenters";

export function createAlertsRouter(alerts: AlertsService, now: () => Date = () => new Date()): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const query = parseInput(alertsQuerySchema, req.query);
    const items = await alerts.list(requestUser(res), query);
    const current = now();
    res.json({
      alerts: items.map(({ alert, places }) => presentAlert(alert, current, query.relevant ? places : undefined)),
    });
  });

  router.get("/:id", async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    res.json(presentAlert(await alerts.get(id), now()));
  });

  return router;
}

export function createNewsRouter(alerts: AlertsService): Router {
  const router = Router();
  router.get("/", async (req, res) => {
    const query = parseInput(newsQuerySchema, req.query);
    res.json({ articles: (await alerts.news(query)).map(presentNews) });
  });
  return router;
}
