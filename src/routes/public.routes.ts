import { Router } from "express";

import {
  setupPasswordFormController,
  submitSetupPasswordFormController,
} from "../controllers/public.controller";
import { asyncHandler } from "../utils/async-handler";

const publicRouter = Router();

publicRouter.get("/setup-password", asyncHandler(setupPasswordFormController));
publicRouter.post("/setup-password", asyncHandler(submitSetupPasswordFormController));

export { publicRouter };
