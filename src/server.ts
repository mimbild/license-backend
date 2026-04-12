import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { bootstrapAdmin } from "./services/bootstrap.service";
import {
  startSquarespaceSyncScheduler,
  stopSquarespaceSyncScheduler,
} from "./services/squarespace-sync-scheduler.service";

async function start() {
  await prisma.$connect();
  await bootstrapAdmin();

  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "license-backend listening");
  });

  startSquarespaceSyncScheduler();
}

start().catch(async (error: unknown) => {
  logger.error({ error }, "failed to start server");
  stopSquarespaceSyncScheduler();
  await prisma.$disconnect();
  process.exit(1);
});
