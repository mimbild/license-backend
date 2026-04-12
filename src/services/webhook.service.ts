import { Prisma } from "@prisma/client";
import type { BillingProvider } from "@prisma/client";

import type { NormalizedBillingEvent } from "../billing/types";
import { getBillingProviderAdapter } from "../billing/provider-registry";
import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import { ApiError } from "../utils/api-error";
import { deriveGraceEndDate } from "./access.service";
import { issuePasswordSetupForUser } from "./auth.service";
import { sendTemplatedEmail } from "./mail.service";
import { generateLicenseKey } from "../utils/license-key";

export async function processSquarespaceWebhook(input: {
  payload: unknown;
  signature?: string;
}) {
  return processBillingWebhook("SQUARESPACE", input);
}

export async function processBillingWebhook(
  provider: BillingProvider,
  input: {
    payload: unknown;
    signature?: string;
  },
) {
  const adapter = getBillingProviderAdapter(provider);
  const mapped = await adapter.parseWebhook(input);

  return persistBillingEvent(provider, mapped, input.payload, input.signature);
}

export async function processNormalizedBillingEvent(
  provider: BillingProvider,
  mapped: NormalizedBillingEvent,
) {
  return persistBillingEvent(provider, mapped, mapped.raw, undefined);
}

async function persistBillingEvent(
  provider: BillingProvider,
  mapped: NormalizedBillingEvent,
  rawPayload: unknown,
  signature?: string,
) {
  const existing = await prisma.webhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider,
        providerEventId: mapped.providerEventId,
      },
    },
  });

  if (existing?.status === "PROCESSED") {
    return {
      ok: true,
      deduplicated: true,
      eventId: existing.id,
    };
  }

  const event =
    existing ??
    (await prisma.webhookEvent.create({
      data: {
        provider,
        providerEventId: mapped.providerEventId,
        eventType: mapped.eventType,
        signature,
        payload: rawPayload as Prisma.InputJsonValue,
        status: "RECEIVED",
      },
    }));

  try {
    let shouldIssuePasswordSetup = false;

    const result = await prisma.$transaction(async (tx) => {
      if (!mapped.customerEmail) {
        throw new ApiError(400, "MISSING_CUSTOMER", `${provider} payload missing customer email`);
      }

      const existingUser = await tx.user.findUnique({
        where: {
          email: mapped.customerEmail,
        },
      });

      const user = await tx.user.upsert({
        where: {
          email: mapped.customerEmail,
        },
        update: {
          name: mapped.customerName,
        },
        create: {
          email: mapped.customerEmail,
          name: mapped.customerName,
          passwordHash: "RESET_REQUIRED",
          trialEndsAt: null,
        },
      });

      shouldIssuePasswordSetup = !existingUser;

      let subscription = mapped.providerSubscriptionId
        ? await tx.subscription.findUnique({
            where: {
              provider_providerSubscriptionId: {
                provider,
                providerSubscriptionId: mapped.providerSubscriptionId,
              },
            },
          })
        : null;

      const firstItem = mapped.items[0];
      if (!firstItem) {
        throw new ApiError(400, "MISSING_ITEMS", `${provider} payload missing line items`);
      }

      const planRef = firstItem.externalVariantId
        ? await tx.planExternalRef.findFirst({
            where: {
              provider,
              externalVariantId: firstItem.externalVariantId,
            },
            include: {
              plan: true,
            },
          })
        : null;

      const product =
        planRef?.plan
          ? await tx.product.findUnique({
              where: {
                id: planRef.plan.productId,
              },
            })
          : firstItem.productSlug
            ? await tx.product.findUnique({
                where: {
                  slug: firstItem.productSlug,
                },
              })
            : null;

      if (!product) {
        throw new ApiError(
          404,
          "PRODUCT_NOT_FOUND",
          `No internal product mapping found for provider item ${firstItem.externalVariantId ?? firstItem.productSlug ?? firstItem.title ?? "unknown"}`,
        );
      }

      const resolvedPlan =
        planRef?.plan ??
        (await tx.plan.findFirst({
          where: {
            productId: product.id,
          },
          orderBy: {
            createdAt: "asc",
          },
        }));

      if (!resolvedPlan) {
        throw new ApiError(404, "PLAN_NOT_FOUND", "No plan found for mapped product");
      }

      subscription =
        subscription ??
        (await tx.subscription.create({
          data: {
            userId: user.id,
            planId: resolvedPlan.id,
            provider,
            providerSubscriptionId: mapped.providerSubscriptionId,
            providerOrderId: mapped.providerOrderId,
            providerCustomerId: mapped.providerCustomerId,
            providerProductId: mapped.providerProductId ?? firstItem.externalProductId,
            providerPlanId: mapped.providerPlanId ?? firstItem.externalPlanId,
            providerOriginalTransactionId: mapped.providerOriginalTransactionId,
            providerPurchaseToken: mapped.providerPurchaseToken,
            providerEnvironment: mapped.providerEnvironment,
            status: mapped.internalSubscriptionStatus,
            trialEndsAt: null,
            currentPeriodStart: mapped.occurredAt ?? new Date(),
            currentPeriodEnd: mapped.occurredAt ?? new Date(),
            metadata: mapped.raw as Prisma.InputJsonValue,
          },
        }));

      subscription = await tx.subscription.update({
        where: {
          id: subscription.id,
        },
        data: {
          providerOrderId: mapped.providerOrderId,
          providerCustomerId: mapped.providerCustomerId,
          providerProductId: mapped.providerProductId ?? firstItem.externalProductId,
          providerPlanId: mapped.providerPlanId ?? firstItem.externalPlanId,
          providerOriginalTransactionId: mapped.providerOriginalTransactionId,
          providerPurchaseToken: mapped.providerPurchaseToken,
          providerEnvironment: mapped.providerEnvironment,
          status: mapped.internalSubscriptionStatus,
          graceEndsAt: mapped.internalSubscriptionStatus === "PAST_DUE" ? deriveGraceEndDate() : null,
          canceledAt:
            mapped.internalSubscriptionStatus === "CANCELED" ? new Date() : subscription.canceledAt,
          metadata: mapped.raw as Prisma.InputJsonValue,
        },
      });

      const entitlement = await tx.entitlement.create({
        data: {
          userId: user.id,
          productId: product.id,
          subscriptionId: subscription.id,
          source: `${provider.toLowerCase()}_${mapped.eventType.replace(/\./g, "_")}`,
          quantity: firstItem.quantity,
          isActive: mapped.internalSubscriptionStatus !== "CANCELED",
          metadata: mapped.raw as Prisma.InputJsonValue,
        },
      });

      const existingLicensesCount = await tx.license.count({
        where: {
          subscriptionId: subscription.id,
          productId: product.id,
        },
      });

      const licensesToCreate = Math.max(firstItem.quantity - existingLicensesCount, 0);

      for (let index = 0; index < licensesToCreate; index += 1) {
        await tx.license.create({
          data: {
            licenseKey: generateLicenseKey(),
            userId: user.id,
            productId: product.id,
            subscriptionId: subscription.id,
            entitlementId: entitlement.id,
            status: mapped.internalSubscriptionStatus === "PAST_DUE" ? "GRACE" : "PENDING",
            maxActivations: 1,
            graceEndsAt:
              mapped.internalSubscriptionStatus === "PAST_DUE" ? deriveGraceEndDate() : null,
          },
        });
      }

      return {
        user,
        subscription,
      };
    });

    await prisma.webhookEvent.update({
      where: {
        id: event.id,
      },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        errorMessage: null,
      },
    });

    if (result.subscription.status === "PAST_DUE") {
      await sendTemplatedEmail({
        userId: result.user.id,
        recipient: result.user.email,
        template: "payment_failed",
        variables: {
          subscriptionId: result.subscription.id,
          providerOrderId: result.subscription.providerOrderId ?? "",
          provider,
        },
      });
    }

    if (result.subscription.status === "CANCELED") {
      await sendTemplatedEmail({
        userId: result.user.id,
        recipient: result.user.email,
        template: "subscription_canceled",
        variables: {
          subscriptionId: result.subscription.id,
          provider,
        },
      });
    }

    if (shouldIssuePasswordSetup) {
      await issuePasswordSetupForUser(result.user.id);
    }

    return {
      ok: true,
      deduplicated: false,
      eventId: event.id,
    };
  } catch (error) {
    logger.error(
      { error, provider, providerEventId: mapped.providerEventId },
      "billing event processing failed",
    );

    await prisma.webhookEvent.update({
      where: {
        id: event.id,
      },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown billing event error",
      },
    });

    throw error;
  }
}
