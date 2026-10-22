import { fetchTomtomIncidents, incidentToAlert, type TomtomIncident } from "../integrations/tomtom";
import type { AlertsRepository } from "../services/alerts.repository";
import type { NewAlert } from "../types";
import type { Job } from "./types";

export interface IngestTrafficDeps {
  apiKey?: string;
  alerts: Pick<AlertsRepository, "upsert">;
  fetchIncidents?: (apiKey: string) => Promise<TomtomIncident[]>;
}

// TomTom traffic incidents in Metro Cebu → alerts, refreshed every run.
export function createIngestTrafficJob(deps: IngestTrafficDeps): Job {
  const fetchIncidents = deps.fetchIncidents ?? fetchTomtomIncidents;
  return {
    name: "ingestTraffic",
    schedule: "*/15 5-22 * * *", // every 15 minutes, 05:00–22:45
    description: "TomTom traffic incidents in Metro Cebu",
    async run(now) {
      if (!deps.apiKey) return { status: "skipped", detail: "TOMTOM_API_KEY is not set" };
      const incidents = await fetchIncidents(deps.apiKey);
      const alerts = incidents
        .map((incident) => incidentToAlert(incident, now))
        .filter((alert): alert is NewAlert => alert !== null);
      const saved = await deps.alerts.upsert(alerts, { updateExisting: true });
      return { status: "ok", detail: `${incidents.length} incidents, ${alerts.length} alerts`, saved };
    },
  };
}
