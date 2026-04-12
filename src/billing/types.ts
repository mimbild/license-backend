import type { BillingProvider, SubscriptionStatus } from "@prisma/client";

export type NormalizedBillingItem = {
  productSlug?: string;
  quantity: number;
  externalProductId?: string;
  externalVariantId?: string;
  externalPlanId?: string;
  title?: string;
};

export type NormalizedBillingEvent = {
  provider: BillingProvider;
  providerEventId: string;
  eventType: string;
  customerEmail?: string;
  customerName?: string;
  providerOrderId?: string;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  providerProductId?: string;
  providerPlanId?: string;
  providerOriginalTransactionId?: string;
  providerPurchaseToken?: string;
  providerEnvironment?: string;
  internalSubscriptionStatus: SubscriptionStatus;
  items: NormalizedBillingItem[];
  occurredAt?: Date;
  raw: unknown;
};

export type BillingWebhookInput = {
  payload: unknown;
  signature?: string;
};

export interface BillingProviderAdapter {
  provider: BillingProvider;
  parseWebhook(input: BillingWebhookInput): Promise<NormalizedBillingEvent>;
}
