import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { hashPassword } from "../utils/password";

export async function bootstrapAdmin() {
  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: env.ADMIN_BOOTSTRAP_EMAIL,
    },
  });

  if (existingAdmin) {
    return existingAdmin;
  }

  return prisma.user.create({
    data: {
      email: env.ADMIN_BOOTSTRAP_EMAIL,
      passwordHash: await hashPassword(env.ADMIN_BOOTSTRAP_PASSWORD),
      role: "ADMIN",
      name: "Bootstrap Admin",
    },
  });
}
