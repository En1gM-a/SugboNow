// Alerts and news for the API. Reads only from the database; ingestion jobs
// fill it (README golden rule).

import type { AlertsQuery, NewsQuery } from "../schemas/alerts.schema";
import { ALERT_TYPES, NEWS_SOURCES, type AlertRow, type RequestUser } from "../types";
import { notFound } from "../utils/errors";
import { haversineKm } from "../utils/geo";
import { addHours } from "../utils/time";
import type { AlertsRepository } from "./alerts.repository";
import type { LocationsRepository } from "./locations.repository";
import { compareAlerts, matchAlertsToPlaces, type NearbyPlace } from "./matching.service";

// Alerts starting within this many hours count as upcoming and are listed.
export const UPCOMING_HOURS = 48;
// News older than this is not listed.
export const NEWS_WINDOW_HOURS = 72;
// Plain news has its own endpoint, so /api/alerts leaves it out by default.
export const DEFAULT_ALERT_TYPES = ALERT_TYPES.filter((type) => type !== "news");

export interface AlertWithPlaces {
  alert: AlertRow;
  // The user's saved places the alert is near (only with relevant=true).
  places: NearbyPlace[];
}

export interface AlertsServiceDeps {
  alerts: AlertsRepository;
  locations: LocationsRepository;
  now?: () => Date;
}

export function createAlertsService({ alerts, locations, now = () => new Date() }: AlertsServiceDeps) {
  return {
    async list(user: RequestUser, query: AlertsQuery): Promise<AlertWithPlaces[]> {
      const current = now();
      const rows = await alerts.listActive({
        now: current,
        startsBefore: addHours(current, UPCOMING_HOURS),
        types: query.type ?? DEFAULT_ALERT_TYPES,
        severities: query.severity,
        area: query.area,
        // Filtering and severity sorting happen below, so fetch a wide page.
        limit: 200,
      });

      let candidates = rows;
      const near = query.near;
      if (near) {
        candidates = candidates.filter(
          (alert) =>
            alert.lat !== null &&
            alert.lng !== null &&
            haversineKm(near, { lat: alert.lat, lng: alert.lng }) <= query.radiusKm,
        );
      }

      let items: AlertWithPlaces[] = candidates.map((alert) => ({ alert, places: [] }));
      if (query.relevant) {
        const places = await locations.list(user);
        items = matchAlertsToPlaces(candidates, places).map(({ alert, places: nearby }) => ({ alert, places: nearby }));
      }

      return items.sort((a, b) => compareAlerts(a.alert, b.alert)).slice(0, query.limit);
    },

    async get(id: string): Promise<AlertRow> {
      const alert = await alerts.getById(id);
      if (!alert) throw notFound("Alert not found.");
      return alert;
    },

    news(query: NewsQuery): Promise<AlertRow[]> {
      return alerts.listNews({
        since: addHours(now(), -NEWS_WINDOW_HOURS),
        sources: NEWS_SOURCES,
        area: query.area,
        limit: query.limit,
      });
    },
  };
}

export type AlertsService = ReturnType<typeof createAlertsService>;
