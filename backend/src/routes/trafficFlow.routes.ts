// /api/traffic-flow — the traffic on every road in Metro Cebu, for the All Cebu map.

import { Router } from "express";
import type { TrafficFlowService } from "../services/trafficFlow.service";
import { presentTrafficFlow } from "./presenters";

export function createTrafficFlowRouter(flow: TrafficFlowService): Router {
  const router = Router();
  router.get("/", async (_req, res) => {
    res.json(presentTrafficFlow(await flow.current()));
  });
  return router;
}
