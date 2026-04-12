import { z } from "zod";

import type { NormalizedBillingEvent } from "../../billing/types";

const squarespacePayloadSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  createdOn: z.string().optional(),
  orderId: z.string().optional(),
  customer: z
    .object({
      email: z.string().email(),
      name: z.string().optional(),
    })
    .optional(),
  subscription: z
    .object({
      id: z.string(),
      status: z.string(),
      currentPeriodEnd: z.string().optional(),
      canceledAt: z.string().optional(),
    })
    .optional(),
  lineItems: z
    .array(
      z.object({
        productSlug: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().positive().default(1),
      }),
    )
    .default([]),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type SquarespacePayload = z.infer<typeof squarespacePayloadSchema>;

export function mapSquarespacePayload(rawPayload: unknown): NormalizedBillingEvent {
  const payload = squarespacePayloadSchema.parse(rawPayload);

  return {
    provider: "SQUARESPACE",
    providerEventId: payload.id,
    eventType: payload.eventType,
    customerEmail: payload.customer?.email,
    customerName: payload.customer?.name,
    providerOrderId: payload.orderId,
    providerSubscriptionId: payload.subscription?.id,
    internalSubscriptionStatus: mapSubscriptionStatus(payload.subscription?.status),
    items: payload.lineItems.map((item) => ({
      productSlug: item.productSlug,
      quantity: item.quantity,
      externalVariantId: item.variantId,
    })),
    occurredAt: payload.createdOn ? new Date(payload.createdOn) : undefined,
    raw: payload,
  };
}

function mapSubscriptionStatus(status?: string) {
  const normalized = status?.toLowerCase();

  switch (normalized) {
    case "active":
    case "paid":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "cancelled":
      return "CANCELED";
    case "expired":
      return "EXPIRED";
    case "trialing":
      return "TRIALING";
    default:
      // TODO: Align this mapping to real Squarespace webhook payload values.
      return "ACTIVE";
  }
}
