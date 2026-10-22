// Runs one scheduled job now, exactly as the scheduler would. Real jobs write
// to Supabase and use API quota, the same as when they run on schedule.
//
//   npm run job -- list
//   npm run job -- ingestWeather

import { createContainer } from "../src/container";
import { runJob } from "../src/jobs/scheduler";
import { logger } from "../src/utils/logger";

async function main(): Promise<number> {
  const name = process.argv[2];
  const { jobs } = createContainer();

  if (!name || name === "list") {
    console.log("Jobs:");
    for (const job of jobs) console.log(`  ${job.name.padEnd(20)} ${job.schedule.padEnd(16)} ${job.description}`);
    console.log("\nRun one with: npm run job -- <name>");
    return name ? 0 : 1;
  }

  const job = jobs.find((candidate) => candidate.name === name);
  if (!job) {
    console.error(`Unknown job "${name}". Known jobs: ${jobs.map((candidate) => candidate.name).join(", ")}`);
    return 1;
  }

  const result = await runJob(job, logger);
  console.log(`\n${job.name}: ${result.status}: ${result.detail}${result.saved !== undefined ? ` (${result.saved} rows written)` : ""}`);
  return result.status === "failed" ? 1 : 0;
}

main().then((code) => process.exit(code));
