// Entry for Vercel, which runs the API as one function (README, Deployment).
// Vercel takes the first of these entry files that imports express and uses its
// default export. Unlike src/server.ts it starts no scheduler: the data jobs
// run on GitHub Actions.
import "express";
import { createApp } from "./src/app";
import { env } from "./src/config/env";
import { createContainer } from "./src/container";
import { logger } from "./src/utils/logger";

const { services, verifyToken } = createContainer();

export default createApp({ frontendOrigin: env.FRONTEND_ORIGIN, verifyToken, services, logger });
