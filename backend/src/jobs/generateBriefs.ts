import type { BriefService } from "../services/brief.service";
import type { Job } from "./types";

// 05:30 every day: a fresh Cebu Daily Brief for every user with a trip today.
export function createGenerateBriefsJob(briefs: Pick<BriefService, "generateAll">): Job {
  return {
    name: "generateBriefs",
    schedule: "30 5 * * *",
    description: "Cebu Daily Brief for users with a trip today",
    async run(now) {
      const { generated, failed } = await briefs.generateAll(now);
      return {
        status: failed > 0 && generated === 0 ? "failed" : "ok",
        detail: `${generated} briefs, ${failed} failed`,
        saved: generated,
      };
    },
  };
}
