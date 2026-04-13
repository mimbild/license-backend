import { Router } from "express";

import { env } from "../config/env";
import {
  portalAccountController,
  portalLoginPageController,
  portalLoginSubmitController,
  portalLogoutController,
  portalReleaseDeviceController,
} from "../controllers/portal.controller";
import { optionalPortalAuth, requirePortalAuth } from "../middleware/portal-auth";
import { createRateLimit } from "../middleware/rate-limit";
import { asyncHandler } from "../utils/async-handler";
import { renderPortalLoginPage } from "../views/portal-page";

const portalRouter = Router();
const authWindowMs = env.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

const portalLoginRateLimit = createRateLimit({
  windowMs: authWindowMs,
  maxRequests: env.AUTH_LOGIN_MAX_ATTEMPTS,
  keyPrefix: "portal-login",
  message: "Too many sign-in attempts. Please wait a few minutes and try again.",
  onLimit(req, res) {
    res.status(429).type("html").send(
      renderPortalLoginPage({
        appBaseUrl: env.APP_BASE_URL,
        email: typeof req.body?.email === "string" ? req.body.email : "",
        errorMessage: "Too many sign-in attempts. Please wait a few minutes and try again.",
      }),
    );
  },
});

portalRouter.get("/portal/login", optionalPortalAuth, asyncHandler(portalLoginPageController));
portalRouter.post(
  "/portal/login",
  optionalPortalAuth,
  portalLoginRateLimit,
  asyncHandler(portalLoginSubmitController),
);
portalRouter.post("/portal/logout", requirePortalAuth, asyncHandler(portalLogoutController));
portalRouter.get("/portal/account", requirePortalAuth, asyncHandler(portalAccountController));
portalRouter.post(
  "/portal/licenses/:licenseKey/release",
  requirePortalAuth,
  asyncHandler(portalReleaseDeviceController),
);

export { portalRouter };
