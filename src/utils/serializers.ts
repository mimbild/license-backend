import type { Subscription, User } from "@prisma/client";

export function toSafeUser(
  user: Pick<User, "id" | "email" | "role" | "name" | "trialEndsAt" | "createdAt" | "updatedAt">,
) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    trialEndsAt: user.trialEndsAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toSafeSubscription(
  subscription: Subscription & {
    user?: User | null;
  },
) {
  return {
    ...subscription,
    user: subscription.user ? toSafeUser(subscription.user) : undefined,
  };
}

