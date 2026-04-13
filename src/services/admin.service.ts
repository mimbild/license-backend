import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { toSafeSubscription, toSafeUser } from "../utils/serializers";
import { deriveGraceEndDate } from "./access.service";
import { sendTemplatedEmail } from "./mail.service";
import { normalizeDeviceFingerprint } from "../utils/device";

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

export async function listAdminDashboardUsers(input: {
  limit: number;
  email?: string;
  provider?: "SQUARESPACE" | "APPLE_APP_STORE" | "GOOGLE_PLAY" | "MANUAL" | "SEED";
  status?: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
}) {
  return prisma.user.findMany({
    where: {
      ...(input.email
        ? {
            email: {
              contains: input.email,
              mode: "insensitive",
            },
          }
        : {}),
      ...((input.provider || input.status)
        ? {
            subscriptions: {
              some: {
                provider: input.provider,
                status: input.status,
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      createdAt: true,
      subscriptions: {
        where: {
          provider: input.provider,
          status: input.status,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          provider: true,
          status: true,
        },
      },
      _count: {
        select: {
          subscriptions: true,
          licenses: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: input.limit,
  });
}

export async function getAdminDashboardUserByEmail(email: string) {
  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    include: {
      subscriptions: {
        include: {
          plan: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      licenses: {
        include: {
          product: true,
          subscription: true,
          activations: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      createdAt: user.createdAt,
    },
    subscriptions: user.subscriptions.map((subscription) => ({
      id: subscription.id,
      provider: subscription.provider,
      status: subscription.status,
      providerOrderId: subscription.providerOrderId,
      createdAt: subscription.createdAt,
      planName: subscription.plan.name,
      productName: subscription.plan.product.name,
    })),
    licenses: user.licenses.map((license) => ({
      id: license.id,
      licenseKey: license.licenseKey,
      status: license.status,
      productName: license.product.name,
      subscriptionStatus: license.subscription?.status ?? null,
      activations: license.activations,
    })),
  };
}

export async function getAdminDashboardUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      subscriptions: {
        include: {
          plan: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      licenses: {
        include: {
          product: true,
          subscription: true,
          activations: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      createdAt: user.createdAt,
    },
    subscriptions: user.subscriptions.map((subscription) => ({
      id: subscription.id,
      provider: subscription.provider,
      status: subscription.status,
      providerOrderId: subscription.providerOrderId,
      createdAt: subscription.createdAt,
      planName: subscription.plan.name,
      productName: subscription.plan.product.name,
    })),
    licenses: user.licenses.map((license) => ({
      id: license.id,
      licenseKey: license.licenseKey,
      status: license.status,
      productName: license.product.name,
      subscriptionStatus: license.subscription?.status ?? null,
      activations: license.activations,
    })),
  };
}

export async function releaseDeviceByAdmin(input: {
  licenseKey: string;
  deviceFingerprint: string;
}) {
  const fingerprint = normalizeDeviceFingerprint(input.deviceFingerprint);

  if (!fingerprint) {
    throw new ApiError(400, "DEVICE_REQUIRED", "deviceFingerprint is required");
  }

  const license = await prisma.license.findUnique({
    where: {
      licenseKey: input.licenseKey,
    },
    include: {
      activations: true,
    },
  });

  if (!license) {
    throw new ApiError(404, "LICENSE_NOT_FOUND", "License not found");
  }

  const activation = license.activations.find(
    (item) => item.deviceFingerprint === fingerprint && item.status === "ACTIVE",
  );

  if (!activation) {
    throw new ApiError(404, "ACTIVATION_NOT_FOUND", "Device activation not found");
  }

  await prisma.licenseActivation.update({
    where: {
      id: activation.id,
    },
    data: {
      status: "RELEASED",
      releasedAt: new Date(),
    },
  });

  return {
    ok: true,
    releasedActivationId: activation.id,
  };
}

export async function deleteUserByAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      subscriptions: {
        select: {
          id: true,
        },
      },
      licenses: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  if (user.role === "ADMIN") {
    throw new ApiError(400, "ADMIN_DELETE_FORBIDDEN", "Admin users cannot be deleted here");
  }

  if (user.subscriptions.length > 0 || user.licenses.length > 0) {
    throw new ApiError(
      400,
      "USER_DELETE_FORBIDDEN",
      "Only empty customer accounts without subscriptions or licenses can be deleted",
    );
  }

  return prisma.user.delete({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });
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
