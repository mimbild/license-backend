import { Prisma } from "@prisma/client";

import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { addDays } from "../utils/date";
import { normalizeDeviceFingerprint } from "../utils/device";
import { generateLicenseKey } from "../utils/license-key";
import { deriveGraceEndDate, resolveAccessState } from "./access.service";
import { sendTemplatedEmail } from "./mail.service";

const licenseInclude = {
  user: true,
  product: true,
  subscription: true,
  activations: true,
} satisfies Prisma.LicenseInclude;

export async function getLicenseByKey(licenseKey: string) {
  const license = await prisma.license.findUnique({
    where: {
      licenseKey,
    },
    include: licenseInclude,
  });

  if (!license) {
    throw new ApiError(404, "LICENSE_NOT_FOUND", "License not found");
  }

  return license;
}

export async function listUserLicenses(userId: string) {
  return prisma.license.findMany({
    where: {
      userId,
    },
    include: {
      product: true,
      subscription: true,
      activations: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function activateLicense(input: {
  licenseKey: string;
  deviceFingerprint?: string;
  machineId?: string;
  deviceName?: string;
}) {
  const fingerprint = normalizeDeviceFingerprint(
    input.deviceFingerprint ?? input.machineId ?? "",
  );

  if (!fingerprint) {
    throw new ApiError(400, "DEVICE_REQUIRED", "deviceFingerprint or machineId is required");
  }

  const license = await getLicenseByKey(input.licenseKey);
  const existingActivation = license.activations.find(
    (activation) => activation.deviceFingerprint === fingerprint && activation.status === "ACTIVE",
  );

  const decision = resolveAccessState({
    subscription: license.subscription,
    license,
    activation: existingActivation,
  });

  if (decision.access === "blocked" || decision.access === "payment_required") {
    return {
      ok: false,
      status: decision.access,
      reason: decision.reason,
      licenseStatus: license.status,
    };
  }

  const activeActivations = license.activations.filter((activation) => activation.status === "ACTIVE");

  if (!existingActivation && activeActivations.length >= license.maxActivations) {
    return {
      ok: false,
      status: "blocked" as const,
      reason: "device_limit_reached",
      licenseStatus: license.status,
    };
  }

  const activation =
    existingActivation ??
    (await prisma.licenseActivation.create({
      data: {
        licenseId: license.id,
        deviceFingerprint: fingerprint,
        machineId: input.machineId,
        deviceName: input.deviceName,
        status: "ACTIVE",
        lastValidatedAt: new Date(),
      },
    }));

  await prisma.license.update({
    where: {
      id: license.id,
    },
    data: {
      status: decision.access === "grace" ? "GRACE" : "ACTIVE",
      lastValidatedAt: new Date(),
      graceEndsAt: decision.access === "grace" ? license.graceEndsAt ?? deriveGraceEndDate() : null,
    },
  });

  await sendTemplatedEmail({
    userId: license.userId,
    recipient: license.user.email,
    template: "activation_confirmation",
    variables: {
      product: license.product.name,
      deviceName: activation.deviceName ?? activation.deviceFingerprint,
      licenseKey: license.licenseKey,
    },
  });

  return {
    ok: true,
    status: decision.access === "grace" ? "grace" : "full_access",
    reason: decision.reason,
    licenseStatus: decision.access === "grace" ? "GRACE" : "ACTIVE",
    activationId: activation.id,
  };
}

export async function validateLicense(input: {
  licenseKey: string;
  deviceFingerprint?: string;
  machineId?: string;
}) {
  const fingerprint = normalizeDeviceFingerprint(
    input.deviceFingerprint ?? input.machineId ?? "",
  );
  const license = await getLicenseByKey(input.licenseKey);
  const activation = fingerprint
    ? license.activations.find((item) => item.deviceFingerprint === fingerprint)
    : null;
  const decision = resolveAccessState({
    subscription: license.subscription,
    license,
    activation,
  });

  if (fingerprint && activation?.status === "ACTIVE") {
    await prisma.licenseActivation.update({
      where: {
        id: activation.id,
      },
      data: {
        lastValidatedAt: new Date(),
      },
    });
  }

  await prisma.license.update({
    where: {
      id: license.id,
    },
    data: {
      lastValidatedAt: new Date(),
      status:
        decision.access === "grace"
          ? "GRACE"
          : decision.access === "blocked" || decision.access === "payment_required"
            ? "INACTIVE"
            : "ACTIVE",
      graceEndsAt:
        decision.access === "grace"
          ? license.graceEndsAt ?? license.subscription?.graceEndsAt ?? deriveGraceEndDate()
          : null,
    },
  });

  return {
    access: decision.access,
    reason: decision.reason,
    license: {
      id: license.id,
      key: license.licenseKey,
      status: license.status,
      product: license.product.slug,
      maxActivations: license.maxActivations,
    },
  };
}

export async function releaseDevice(input: {
  licenseKey: string;
  userId: string;
  deviceFingerprint?: string;
  machineId?: string;
}) {
  const fingerprint = normalizeDeviceFingerprint(
    input.deviceFingerprint ?? input.machineId ?? "",
  );

  if (!fingerprint) {
    throw new ApiError(400, "DEVICE_REQUIRED", "deviceFingerprint or machineId is required");
  }

  const license = await prisma.license.findUnique({
    where: {
      licenseKey: input.licenseKey,
    },
    include: {
      activations: true,
      user: true,
    },
  });

  if (!license || license.userId !== input.userId) {
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

export async function deactivateLicenseByAdmin(id: string) {
  return prisma.license.update({
    where: { id },
    data: {
      status: "INACTIVE",
      graceEndsAt: null,
    },
  });
}

export async function reactivateLicenseByAdmin(id: string) {
  return prisma.license.update({
    where: { id },
    data: {
      status: "ACTIVE",
      revokedAt: null,
    },
  });
}

export async function seedTrialLicense(input: {
  userId: string;
  productId: string;
  subscriptionId?: string;
  entitlementId?: string;
  seats?: number;
}) {
  return prisma.license.create({
    data: {
      userId: input.userId,
      productId: input.productId,
      subscriptionId: input.subscriptionId,
      entitlementId: input.entitlementId,
      status: "PENDING",
      maxActivations: input.seats ?? 1,
      graceEndsAt: addDays(new Date(), env.GRACE_DAYS),
      licenseKey: generateLicenseKey(),
    },
  });
}
