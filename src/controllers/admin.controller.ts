import type { Request, Response } from "express";

import {
  deactivateLicenseByAdmin,
  reactivateLicenseByAdmin,
} from "../services/license.service";
import {
  listAdminLicenses,
  listAdminSubscriptions,
  listAdminUsers,
  listAdminWebhookEvents,
  markSubscriptionPastDue,
} from "../services/admin.service";
import { syncSquarespaceOrders } from "../services/squarespace-sync.service";

export async function deactivateLicenseController(req: Request, res: Response) {
  const license = await deactivateLicenseByAdmin(String(req.params.id));
  res.status(200).json(license);
}

export async function reactivateLicenseController(req: Request, res: Response) {
  const license = await reactivateLicenseByAdmin(String(req.params.id));
  res.status(200).json(license);
}

export async function markPastDueController(req: Request, res: Response) {
  const subscription = await markSubscriptionPastDue(String(req.params.id));
  res.status(200).json(subscription);
}

export async function listUsersController(req: Request, res: Response) {
  const users = await listAdminUsers(req.query as unknown as { limit: number; email?: string });
  res.status(200).json(users);
}

export async function listSubscriptionsController(req: Request, res: Response) {
  const subscriptions = await listAdminSubscriptions(
    req.query as unknown as {
      limit: number;
      provider?: "SQUARESPACE" | "APPLE_APP_STORE" | "GOOGLE_PLAY" | "MANUAL" | "SEED";
      status?: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
    },
  );
  res.status(200).json(subscriptions);
}

export async function listLicensesController(req: Request, res: Response) {
  const licenses = await listAdminLicenses(
    req.query as unknown as {
      limit: number;
      status?: "PENDING" | "ACTIVE" | "GRACE" | "INACTIVE" | "REVOKED";
      userId?: string;
    },
  );
  res.status(200).json(licenses);
}

export async function listWebhookEventsController(req: Request, res: Response) {
  const events = await listAdminWebhookEvents(
    req.query as unknown as {
      limit: number;
      provider?: "SQUARESPACE" | "APPLE_APP_STORE" | "GOOGLE_PLAY" | "MANUAL" | "SEED";
    },
  );
  res.status(200).json(events);
}

export async function syncSquarespaceOrdersController(req: Request, res: Response) {
  const result = await syncSquarespaceOrders(req.body as { limit: number });
  res.status(200).json(result);
}
