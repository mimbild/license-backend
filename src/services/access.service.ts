import type { License, LicenseActivation, Subscription } from "@prisma/client";

import { env } from "../config/env";
import { isFuture } from "../utils/date";

export type AccessDecision =
  | "full_access"
  | "blocked"
  | "payment_required"
  | "grace";

export function resolveAccessState(input: {
  subscription?: Subscription | null;
  license: License;
  activation?: LicenseActivation | null;
}) {
  if (input.license.status === "REVOKED" || input.activation?.status === "BLOCKED") {
    return decision("blocked", "license_revoked");
  }

  if (!input.subscription) {
    if (input.license.graceEndsAt && isFuture(input.license.graceEndsAt)) {
      return decision("grace", "license_grace_active");
    }

    return decision("payment_required", "missing_subscription");
  }

  switch (input.subscription.status) {
    case "ACTIVE":
      return decision("full_access", "subscription_active");
    case "TRIALING":
      return decision("full_access", "subscription_active");
    case "PAST_DUE": {
      const graceEndsAt = input.subscription.graceEndsAt ?? input.license.graceEndsAt;
      if (graceEndsAt && isFuture(graceEndsAt)) {
        return decision("grace", "subscription_grace_active");
      }

      return decision("payment_required", "grace_expired");
    }
    case "CANCELED":
    case "EXPIRED":
      return decision("blocked", "subscription_inactive");
    default:
      return decision("blocked", "unsupported_status");
  }
}

export function deriveGraceEndDate(referenceDate = new Date()) {
  const date = new Date(referenceDate);
  date.setUTCDate(date.getUTCDate() + env.GRACE_DAYS);
  return date;
}

function decision(access: AccessDecision, reason: string) {
  return {
    access,
    reason,
  };
}
