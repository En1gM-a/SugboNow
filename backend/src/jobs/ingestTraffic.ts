import { fetchTomtomFlow, fetchTomtomIncidents, incidentToAlert, type TomtomIncident } from "../integrations/tomtom";
import type { AlertsRepository } from "../services/alerts.repository";
import type { TrafficFlowRepository } from "../services/trafficFlow.repository";
import { FLOW_LEVELS, type NewAlert, type TrafficFlowLines } from "../types";
import type { Job } from "./types";

// Flow saved more recently than this is kept: a second run in the same quarter hour
// (GitHub's timer and Supabase's both start this job) would spend the monthly tile
// allowance twice.
const FLOW_MIN_AGE_MS = 10 * 60_000;

export interface IngestTrafficDeps {
  apiKey?: string;
  alerts: Pick<AlertsRepository, "upsert">;
  flow?: Pick<TrafficFlowRepository, "get" | "save">;
  fetchIncidents?: (apiKey: string) => Promise<TomtomIncident[]>;
  fetchFlow?: (apiKey: string) => Promise<TrafficFlowLines>;
}

// TomTom traffic incidents in Metro Cebu → alerts, and the traffic flow on every
// road (GET /api/traffic-flow, route colors), both refreshed every run.
export function createIngestTrafficJob(deps: IngestTrafficDeps): Job {
  const fetchIncidents = deps.fetchIncidents ?? fetchTomtomIncidents;
  const fetchFlow = deps.fetchFlow ?? fetchTomtomFlow;
  return {
    name: "ingestTraffic",
    schedule: "*/15 5-22 * * *", // every 15 minutes, 05:00–22:45
    description: "TomTom traffic incidents and flow in Metro Cebu",
    async run(now) {
      if (!deps.apiKey) return { status: "skipped", detail: "TOMTOM_API_KEY is not set" };
      const incidents = await fetchIncidents(deps.apiKey);
      const alerts = incidents
        .map((incident) => incidentToAlert(incident, now))
        .filter((alert): alert is NewAlert => alert !== null);
      const saved = await deps.alerts.upsert(alerts, { updateExisting: true });
      const detail = `${incidents.length} incidents, ${alerts.length} alerts`;
      if (!deps.flow) return { status: "ok", detail, saved };

      // The alerts are saved either way; a flow failure still fails the run, so it shows.
      try {
        const last = await deps.flow.get();
        if (last && now.getTime() - Date.parse(last.fetched_at) < FLOW_MIN_AGE_MS) {
          return { status: "ok", detail: `${detail}; traffic flow is still fresh`, saved };
        }
        const lines = await fetchFlow(deps.apiKey);
        await deps.flow.save(lines, now);
        const count = FLOW_LEVELS.reduce((total, level) => total + lines[level].length, 0);
        return { status: "ok", detail: `${detail}; traffic flow on ${count} road lines`, saved };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return { status: "failed", detail: `${detail}; traffic flow failed: ${reason}`, saved };
      }
    },
  };
}
