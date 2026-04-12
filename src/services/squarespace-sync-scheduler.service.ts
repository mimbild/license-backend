import { env } from "../config/env";
import { logger } from "../config/logger";
import { syncSquarespaceOrders } from "./squarespace-sync.service";

let syncTimer: NodeJS.Timeout | null = null;
let syncInFlight = false;

export function startSquarespaceSyncScheduler() {
  if (env.SQUARESPACE_SYNC_ENABLED !== "true") {
    logger.info("Squarespace sync scheduler disabled");
    return;
  }

  if (!env.SQUARESPACE_API_KEY) {
    logger.warn("Squarespace sync scheduler enabled but SQUARESPACE_API_KEY is missing");
    return;
  }

  const intervalMs = env.SQUARESPACE_SYNC_INTERVAL_MINUTES * 60 * 1000;

  logger.info(
    {
      intervalMinutes: env.SQUARESPACE_SYNC_INTERVAL_MINUTES,
      limit: env.SQUARESPACE_SYNC_LIMIT,
    },
    "Starting Squarespace sync scheduler",
  );

  void runSync("startup");

  syncTimer = setInterval(() => {
    void runSync("interval");
  }, intervalMs);
}

export function stopSquarespaceSyncScheduler() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

async function runSync(trigger: "startup" | "interval") {
  if (syncInFlight) {
    logger.warn({ trigger }, "Skipping Squarespace sync because a previous run is still in progress");
    return;
  }

  syncInFlight = true;

  try {
    const result = await syncSquarespaceOrders({
      limit: env.SQUARESPACE_SYNC_LIMIT,
    });

    logger.info(
      {
        trigger,
        fetched: result.fetched,
        processedCount: result.processedCount,
      },
      "Squarespace sync completed",
    );
  } catch (error) {
    logger.error({ error, trigger }, "Squarespace sync failed");
  } finally {
    syncInFlight = false;
  }
}
