import express from "express";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import { logger } from "./config/logger";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { portalRouter } from "./routes/portal.routes";
import { publicRouter } from "./routes/public.routes";

export function createApp() {
  const app = express();

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(request) {
          return {
            id: request.id,
            method: request.method,
            url: request.url,
          };
        },
      },
      customProps: () => ({
        service: "license-backend",
        environment: env.NODE_ENV,
      }),
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  app.get("/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "license-backend",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.use(portalRouter);
  app.use(publicRouter);
  app.use("/api", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
