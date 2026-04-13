import { Router } from "express";

import {
  adminDashboardController,
  adminDeleteUserController,
  adminLoginPageController,
  adminLoginSubmitController,
  adminLogoutController,
  adminReleaseDeviceController,
  adminSendPasswordSetupController,
  adminSyncSquarespaceController,
} from "../controllers/admin-portal.controller";
import { env } from "../config/env";
import {
  optionalAdminAuth,
  requireAdminPortalAuth,
} from "../middleware/admin-portal-auth";
import { createRateLimit } from "../middleware/rate-limit";
import { renderAdminLoginPage } from "../views/admin-page";
import { asyncHandler } from "../utils/async-handler";

const adminPortalRouter = Router();
const authWindowMs = env.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

const adminLoginRateLimit = createRateLimit({
  windowMs: authWindowMs,
  maxRequests: env.AUTH_LOGIN_MAX_ATTEMPTS,
  keyPrefix: "admin-login",
  message: "Too many sign-in attempts. Please wait a few minutes and try again.",
  onLimit(req, res) {
    res.status(429).type("html").send(
      renderAdminLoginPage({
        email: typeof req.body?.email === "string" ? req.body.email : "",
        errorMessage: "Too many sign-in attempts. Please wait a few minutes and try again.",
      }),
    );
  },
});

adminPortalRouter.get("/admin/login", optionalAdminAuth, asyncHandler(adminLoginPageController));
adminPortalRouter.post(
  "/admin/login",
  optionalAdminAuth,
  adminLoginRateLimit,
  asyncHandler(adminLoginSubmitController),
);
adminPortalRouter.post("/admin/logout", requireAdminPortalAuth, asyncHandler(adminLogoutController));
adminPortalRouter.get(
  "/admin/dashboard",
  requireAdminPortalAuth,
  asyncHandler(adminDashboardController),
);
adminPortalRouter.post(
  "/admin/users/:userId/send-password-setup",
  requireAdminPortalAuth,
  asyncHandler(adminSendPasswordSetupController),
);
adminPortalRouter.post(
  "/admin/users/:userId/delete",
  requireAdminPortalAuth,
  asyncHandler(adminDeleteUserController),
);
adminPortalRouter.post(
  "/admin/licenses/:licenseKey/release-device",
  requireAdminPortalAuth,
  asyncHandler(adminReleaseDeviceController),
);
adminPortalRouter.post(
  "/admin/sync/squarespace",
  requireAdminPortalAuth,
  asyncHandler(adminSyncSquarespaceController),
);

export { adminPortalRouter };
