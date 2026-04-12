import { Router } from "express";

import {
  portalAccountController,
  portalLoginPageController,
  portalLoginSubmitController,
  portalLogoutController,
  portalReleaseDeviceController,
} from "../controllers/portal.controller";
import { optionalPortalAuth, requirePortalAuth } from "../middleware/portal-auth";
import { asyncHandler } from "../utils/async-handler";

const portalRouter = Router();

portalRouter.get("/portal/login", optionalPortalAuth, asyncHandler(portalLoginPageController));
portalRouter.post("/portal/login", optionalPortalAuth, asyncHandler(portalLoginSubmitController));
portalRouter.post("/portal/logout", requirePortalAuth, asyncHandler(portalLogoutController));
portalRouter.get("/portal/account", requirePortalAuth, asyncHandler(portalAccountController));
portalRouter.post(
  "/portal/licenses/:licenseKey/release",
  requirePortalAuth,
  asyncHandler(portalReleaseDeviceController),
);

export { portalRouter };
