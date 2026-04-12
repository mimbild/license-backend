import { Router } from "express";

import { squarespaceWebhookController } from "../controllers/webhook.controller";
import { asyncHandler } from "../utils/async-handler";

const webhookRouter = Router();

webhookRouter.post("/squarespace", asyncHandler(squarespaceWebhookController));

export { webhookRouter };

