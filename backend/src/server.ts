// HTTP server and scheduled-job entry point.

import { createApp } from "./app";
import { env } from "./config/env";
import { createContainer } from "./container";
import { startScheduler } from "./jobs/scheduler";
import { logger } from "./utils/logger";

const { services, jobs, verifyToken } = createContainer();

const app = createApp({ frontendOrigin: env.FRONTEND_ORIGIN, verifyToken, services, logger });

app.listen(env.PORT, () => {
  logger.info(`Sugbo Now API listening on port ${env.PORT}`);
});

if (env.CRON_ENABLED) {
  startScheduler(jobs, logger);
} else {
  logger.info("Scheduled jobs are off (CRON_ENABLED=false). Run one with: npm run job -- <name>");
}
