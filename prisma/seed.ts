import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/utils/password";
import { generateLicenseKey } from "../src/utils/license-key";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await hashPassword("ChangeMe123!");
  const demoPasswordHash = await hashPassword("DemoPass123!");

  const desktopProduct = await prisma.product.upsert({
    where: { slug: "desktop-pro" },
    update: {
      name: "Desktop Pro",
      description: "Main desktop application license.",
      isBundle: false,
    },
    create: {
      slug: "desktop-pro",
      name: "Desktop Pro",
      description: "Main desktop application license.",
      isBundle: false,
    },
  });

  const mobileProduct = await prisma.product.upsert({
    where: { slug: "mobile-companion" },
    update: {
      name: "Mobile Companion",
      description: "Future mobile companion app entitlement.",
      isBundle: false,
    },
    create: {
      slug: "mobile-companion",
      name: "Mobile Companion",
      description: "Future mobile companion app entitlement.",
      isBundle: false,
    },
  });

  const suiteProduct = await prisma.product.upsert({
    where: { slug: "studio-suite" },
    update: {
      name: "Studio Suite",
      description: "Bundle containing desktop and mobile products.",
      isBundle: true,
    },
    create: {
      slug: "studio-suite",
      name: "Studio Suite",
      description: "Bundle containing desktop and mobile products.",
      isBundle: true,
    },
  });

  await prisma.bundleItem.upsert({
    where: {
      bundleProductId_childProductId: {
        bundleProductId: suiteProduct.id,
        childProductId: desktopProduct.id,
      },
    },
    update: {},
    create: {
      bundleProductId: suiteProduct.id,
      childProductId: desktopProduct.id,
    },
  });

  await prisma.bundleItem.upsert({
    where: {
      bundleProductId_childProductId: {
        bundleProductId: suiteProduct.id,
        childProductId: mobileProduct.id,
      },
    },
    update: {},
    create: {
      bundleProductId: suiteProduct.id,
      childProductId: mobileProduct.id,
    },
  });

  const desktopMonthly = await prisma.plan.upsert({
    where: { slug: "desktop-pro-monthly" },
    update: {
      name: "Desktop Pro Monthly",
      productId: desktopProduct.id,
      seatsIncluded: 1,
      trialDaysOverride: null,
      graceDaysOverride: 7,
      isRecurring: true,
    },
    create: {
      slug: "desktop-pro-monthly",
      name: "Desktop Pro Monthly",
      productId: desktopProduct.id,
      seatsIncluded: 1,
      trialDaysOverride: null,
      graceDaysOverride: 7,
      isRecurring: true,
    },
  });

  await prisma.plan.upsert({
    where: { slug: "desktop-pro-10-pack" },
    update: {
      name: "Desktop Pro 10 Pack",
      productId: desktopProduct.id,
      seatsIncluded: 10,
      trialDaysOverride: null,
      graceDaysOverride: 7,
      isRecurring: true,
    },
    create: {
      slug: "desktop-pro-10-pack",
      name: "Desktop Pro 10 Pack",
      productId: desktopProduct.id,
      seatsIncluded: 10,
      trialDaysOverride: null,
      graceDaysOverride: 7,
      isRecurring: true,
    },
  });

  await prisma.plan.upsert({
    where: { slug: "studio-suite-monthly" },
    update: {
      name: "Studio Suite Monthly",
      productId: suiteProduct.id,
      seatsIncluded: 1,
      trialDaysOverride: null,
      graceDaysOverride: 7,
      isRecurring: true,
    },
    create: {
      slug: "studio-suite-monthly",
      name: "Studio Suite Monthly",
      productId: suiteProduct.id,
      seatsIncluded: 1,
      trialDaysOverride: null,
      graceDaysOverride: 7,
      isRecurring: true,
    },
  });

  await prisma.planExternalRef.upsert({
    where: {
      provider_externalPlanId: {
        provider: "SQUARESPACE",
        externalPlanId: "sq_variant_desktop_monthly",
      },
    },
    update: {
      planId: desktopMonthly.id,
      externalVariantId: "sq_variant_desktop_monthly",
    },
    create: {
      planId: desktopMonthly.id,
      provider: "SQUARESPACE",
      externalPlanId: "sq_variant_desktop_monthly",
      externalVariantId: "sq_variant_desktop_monthly",
      externalProductId: "desktop-pro",
    },
  });

  await prisma.planExternalRef.upsert({
    where: {
      provider_externalPlanId: {
        provider: "SQUARESPACE",
        externalPlanId: "99fcf613-66c7-4931-8c9f-e426e6266daf",
      },
    },
    update: {
      planId: desktopMonthly.id,
      externalVariantId: "99fcf613-66c7-4931-8c9f-e426e6266daf",
      externalProductId: "desktop-pro",
    },
    create: {
      planId: desktopMonthly.id,
      provider: "SQUARESPACE",
      externalPlanId: "99fcf613-66c7-4931-8c9f-e426e6266daf",
      externalVariantId: "99fcf613-66c7-4931-8c9f-e426e6266daf",
      externalProductId: "desktop-pro",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      role: "ADMIN",
      name: "Local Admin",
      passwordHash: adminPasswordHash,
    },
    create: {
      email: "admin@example.com",
      name: "Local Admin",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {
      name: "Demo Customer",
      passwordHash: demoPasswordHash,
    },
    create: {
      email: "demo@example.com",
      name: "Demo Customer",
      passwordHash: demoPasswordHash,
    },
  });

  const activeSubscription = await prisma.subscription.upsert({
    where: {
      provider_providerSubscriptionId: {
        provider: "SEED",
        providerSubscriptionId: "seed-subscription-demo-active",
      },
    },
    update: {
      userId: demoUser.id,
      planId: desktopMonthly.id,
      providerOrderId: "seed-order-demo-active",
      status: "ACTIVE",
      currentPeriodStart: new Date("2026-04-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
    },
    create: {
      userId: demoUser.id,
      planId: desktopMonthly.id,
      provider: "SEED",
      providerSubscriptionId: "seed-subscription-demo-active",
      providerOrderId: "seed-order-demo-active",
      status: "ACTIVE",
      startedAt: new Date("2026-04-01T00:00:00.000Z"),
      currentPeriodStart: new Date("2026-04-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
      metadata: {
        source: "seed",
      },
    },
  });

  const entitlement = await prisma.entitlement.upsert({
    where: {
      id: "seed-entitlement-demo-desktop",
    },
    update: {
      userId: demoUser.id,
      productId: desktopProduct.id,
      subscriptionId: activeSubscription.id,
      source: "seed",
      quantity: 2,
      isActive: true,
    },
    create: {
      id: "seed-entitlement-demo-desktop",
      userId: demoUser.id,
      productId: desktopProduct.id,
      subscriptionId: activeSubscription.id,
      source: "seed",
      quantity: 2,
      isActive: true,
      metadata: {
        source: "seed",
      },
    },
  });

  for (let index = 0; index < 2; index += 1) {
    const licenseKey = `SEED-${String(index + 1).padStart(4, "0")}-${generateLicenseKey()}`;
    const existingLicense = await prisma.license.findFirst({
      where: {
        userId: demoUser.id,
        subscriptionId: activeSubscription.id,
        notes: `seed-license-${index + 1}`,
      },
    });

    if (!existingLicense) {
      await prisma.license.create({
        data: {
          licenseKey,
          userId: demoUser.id,
          productId: desktopProduct.id,
          subscriptionId: activeSubscription.id,
          entitlementId: entitlement.id,
          status: "ACTIVE",
          maxActivations: 1,
          notes: `seed-license-${index + 1}`,
        },
      });
    }
  }

  console.log("Seed complete");
  console.log("Admin login: admin@example.com / ChangeMe123!");
  console.log("Demo login: demo@example.com / DemoPass123!");
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
