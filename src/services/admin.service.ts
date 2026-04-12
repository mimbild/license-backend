import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { toSafeSubscription, toSafeUser } from "../utils/serializers";
import { deriveGraceEndDate } from "./access.service";
import { sendTemplatedEmail } from "./mail.service";

export async function markSubscriptionPastDue(subscriptionId: string) {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "PAST_DUE",
      graceEndsAt: deriveGraceEndDate(),
    },
    include: {
      user: true,
      licenses: true,
    },
  });

  await prisma.license.updateMany({
    where: {
      subscriptionId,
    },
    data: {
      status: "GRACE",
      graceEndsAt: subscription.graceEndsAt,
    },
  });

  await sendTemplatedEmail({
    userId: subscription.userId,
    recipient: subscription.user.email,
    template: "payment_failed",
    variables: {
      subscriptionId: subscription.id,
      graceEndsAt: subscription.graceEndsAt?.toISOString(),
    },
  });

  return {
    ...toSafeSubscription(subscription),
    licenses: subscription.licenses,
  };
}

export async function ensurePlanExists(planId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new ApiError(404, "PLAN_NOT_FOUND", "Plan not found");
  }

  return plan;
}

export async function listAdminUsers(input: {
  limit: number;
  email?: string;
}) {
  const users = await prisma.user.findMany({
    where: input.email
      ? {
          email: {
            contains: input.email,
            mode: "insensitive",
          },
        }
      : undefined,
    orderBy: {
      createdAt: "desc",
    },
    take: input.limit,
  });

  return users.map(toSafeUser);
}

export async function listAdminSubscriptions(input: {
  limit: number;
  provider?: "SQUARESPACE" | "APPLE_APP_STORE" | "GOOGLE_PLAY" | "MANUAL" | "SEED";
  status?: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
}) {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      provider: input.provider,
      status: input.status,
    },
    include: {
      user: true,
      plan: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: input.limit,
  });

  return subscriptions.map((subscription) => toSafeSubscription(subscription));
}

export async function listAdminLicenses(input: {
  limit: number;
  status?: "PENDING" | "ACTIVE" | "GRACE" | "INACTIVE" | "REVOKED";
  userId?: string;
}) {
  return prisma.license.findMany({
    where: {
      status: input.status,
      userId: input.userId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
          trialEndsAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      product: true,
      subscription: true,
      activations: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: input.limit,
  });
}

export async function listAdminWebhookEvents(input: {
  limit: number;
  provider?: "SQUARESPACE" | "APPLE_APP_STORE" | "GOOGLE_PLAY" | "MANUAL" | "SEED";
}) {
  return prisma.webhookEvent.findMany({
    where: {
      provider: input.provider,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: input.limit,
  });
}
