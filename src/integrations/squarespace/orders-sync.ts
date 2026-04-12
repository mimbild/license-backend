import { z } from "zod";

import type { NormalizedBillingEvent } from "../../billing/types";

const orderSchema = z.object({
  id: z.string(),
  orderNumber: z.string().optional(),
  createdOn: z.string().optional(),
  modifiedOn: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerId: z.string().optional(),
  lineItems: z.array(
    z.object({
      productId: z.string().optional(),
      productName: z.string().optional(),
      variantId: z.string().optional(),
      quantity: z.number().int().nonnegative(),
    }),
  ),
});

const ordersPageSchema = z.object({
  result: z.array(orderSchema).default([]),
  pagination: z
    .object({
      hasNextPage: z.boolean().optional(),
      nextPageCursor: z.string().nullable().optional(),
    })
    .optional(),
});

export type SquarespaceOrdersPage = z.infer<typeof ordersPageSchema>;
export type SquarespaceOrder = z.infer<typeof orderSchema>;

export function parseSquarespaceOrdersPage(payload: unknown) {
  return ordersPageSchema.parse(payload);
}

export function mapSquarespaceOrderToBillingEvent(order: SquarespaceOrder): NormalizedBillingEvent {
  const occurredAtIso = order.modifiedOn ?? order.createdOn ?? new Date().toISOString();

  return {
    provider: "SQUARESPACE",
    providerEventId: `order-sync:${order.id}:${occurredAtIso}`,
    eventType: "order.sync",
    customerEmail: order.customerEmail,
    providerOrderId: order.id,
    providerCustomerId: order.customerId,
    internalSubscriptionStatus: "ACTIVE",
    items: order.lineItems.map((item) => ({
      quantity: item.quantity,
      externalProductId: item.productId,
      externalVariantId: item.variantId,
      title: item.productName,
    })),
    occurredAt: new Date(occurredAtIso),
    raw: order,
  };
}
