import { Router } from "express";
import { z } from "zod";

import {
  deactivateLicenseController,
  listLicensesController,
  listSubscriptionsController,
  listUsersController,
  listWebhookEventsController,
  markPastDueController,
  reactivateLicenseController,
  syncSquarespaceOrdersController,
} from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/admin";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";

const adminRouter = Router();
const idSchema = z.object({ id: z.string().min(1) });
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const userListQuerySchema = listQuerySchema.extend({
  email: z.string().optional(),
});
const subscriptionListQuerySchema = listQuerySchema.extend({
  provider: z
    .enum(["SQUARESPACE", "APPLE_APP_STORE", "GOOGLE_PLAY", "MANUAL", "SEED"])
    .optional(),
  status: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"]).optional(),
});
const licenseListQuerySchema = listQuerySchema.extend({
  status: z.enum(["PENDING", "ACTIVE", "GRACE", "INACTIVE", "REVOKED"]).optional(),
  userId: z.string().min(1).optional(),
});
const webhookListQuerySchema = listQuerySchema.extend({
  provider: z
    .enum(["SQUARESPACE", "APPLE_APP_STORE", "GOOGLE_PLAY", "MANUAL", "SEED"])
    .optional(),
});
const squarespaceSyncSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/users", validateQuery(userListQuerySchema), asyncHandler(listUsersController));
adminRouter.get(
  "/subscriptions",
  validateQuery(subscriptionListQuerySchema),
  asyncHandler(listSubscriptionsController),
);
adminRouter.get(
  "/licenses",
  validateQuery(licenseListQuerySchema),
  asyncHandler(listLicensesController),
);
adminRouter.get(
  "/webhook-events",
  validateQuery(webhookListQuerySchema),
  asyncHandler(listWebhookEventsController),
);

adminRouter.post(
  "/licenses/:id/deactivate",
  validateParams(idSchema),
  asyncHandler(deactivateLicenseController),
);
adminRouter.post(
  "/licenses/:id/reactivate",
  validateParams(idSchema),
  asyncHandler(reactivateLicenseController),
);
adminRouter.post(
  "/subscriptions/:id/mark-past-due",
  validateParams(idSchema),
  asyncHandler(markPastDueController),
);
adminRouter.post(
  "/sync/squarespace/orders",
  validateBody(squarespaceSyncSchema),
  asyncHandler(syncSquarespaceOrdersController),
);

export { adminRouter };
