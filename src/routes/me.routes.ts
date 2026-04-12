import { Router } from "express";

import { listMyLicensesController } from "../controllers/license.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const meRouter = Router();

meRouter.get("/licenses", requireAuth, asyncHandler(listMyLicensesController));

export { meRouter };

