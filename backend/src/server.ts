// HTTP server and scheduled-job entry point.

import { createApp } from "./app";
import { env } from "./config/env";
import { supabaseAdmin } from "./config/supabase";
import { scrapeLatestPagePosts } from "./integrations/facebook";
import { createLguPostsRepository } from "./services/lguPosts.repository";
import { createLguPostsService } from "./services/lguPosts.service";
import { logger } from "./utils/logger";

const lguPostsService = createLguPostsService({
  repo: createLguPostsRepository(supabaseAdmin),
  scrape: (pageUrl, limit) => scrapeLatestPagePosts(pageUrl, { limit }),
  logger,
  scrapeEnabled: env.FB_SCRAPE_ENABLED,
  refreshIntervalMs: env.FB_REFRESH_INTERVAL_MINUTES * 60_000,
});

const app = createApp({
  frontendOrigin: env.FRONTEND_ORIGIN,
  verifyToken: async (token) => {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    return error || !data.user ? null : data.user.id;
  },
  lguPostsService,
  logger,
});

app.listen(env.PORT, () => {
  logger.info(`Sugbo Now API listening on port ${env.PORT}`);
});
