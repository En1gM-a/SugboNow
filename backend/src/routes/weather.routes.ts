// /api/weather — latest conditions and 24-hour forecast per Metro Cebu area.

import { Router } from "express";
import type { WeatherService } from "../services/weather.service";
import { presentWeather } from "./presenters";

export function createWeatherRouter(weather: WeatherService): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json({ areas: (await weather.list()).map(presentWeather) });
  });

  router.get("/:area", async (req, res) => {
    res.json(presentWeather(await weather.get(req.params.area)));
  });

  return router;
}
