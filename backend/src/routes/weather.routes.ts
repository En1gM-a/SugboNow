// /api/weather — latest conditions and 24-hour forecast per Metro Cebu area,
// and PAGASA's Visayas forecast.

import { Router } from "express";
import type { WeatherService } from "../services/weather.service";
import { presentRegionalForecast, presentWeather } from "./presenters";

export function createWeatherRouter(weather: WeatherService): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json({ areas: (await weather.list()).map(presentWeather) });
  });

  // Before /:area, which would read "pagasa" as an area slug.
  router.get("/pagasa", async (_req, res) => {
    res.json(presentRegionalForecast(await weather.pagasa()));
  });

  router.get("/:area", async (req, res) => {
    res.json(presentWeather(await weather.get(req.params.area)));
  });

  return router;
}
