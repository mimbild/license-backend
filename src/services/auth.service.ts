import crypto from "crypto";

import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { signAuthToken } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/password";
import { toSafeUser } from "../utils/serializers";
import { sendTemplatedEmail } from "./mail.service";

export async function registerUser(input: { email: string; password: string; name?: string }) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingUser) {
    throw new ApiError(409, "EMAIL_IN_USE", "Email already registered");
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      name: input.name,
      trialEndsAt: null,
    },
  });

  await sendTemplatedEmail({
    userId: user.id,
    recipient: user.email,
    template: "welcome",
    variables: {
      email: user.email,
    },
  });

  return {
    user: toSafeUser(user),
    token: signAuthToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    }),
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const isValid = await verifyPassword(input.password, user.passwordHash);

  if (!isValid) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  return {
    user: toSafeUser(user),
    token: signAuthToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    }),
  };
}

export async function requestPasswordSetup(input: { email: string }) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    return {
      ok: true,
    };
  }

  const plainToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = hashSetupToken(plainToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await prisma.passwordSetupToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const setupUrl = `${env.APP_BASE_URL}/setup-password?token=${plainToken}`;

  await sendTemplatedEmail({
    userId: user.id,
    recipient: user.email,
    template: "password_setup",
    variables: {
      setupUrl,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return {
    ok: true,
  };
}

export async function completePasswordSetup(input: {
  token: string;
  password: string;
  name?: string;
}) {
  const tokenHash = hashSetupToken(input.token);

  const record = await prisma.passwordSetupToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new ApiError(400, "INVALID_SETUP_TOKEN", "Invalid or expired password setup token");
  }

  const passwordHash = await hashPassword(input.password);

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: {
        id: record.userId,
      },
      data: {
        passwordHash,
        name: input.name ?? record.user.name,
      },
    });

    await tx.passwordSetupToken.update({
      where: {
        id: record.id,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return user;
  });

  return {
    user: toSafeUser(updatedUser),
    token: signAuthToken({
      sub: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    }),
  };
}

export async function issuePasswordSetupForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  return requestPasswordSetup({
    email: user.email,
  });
}

function hashSetupToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
