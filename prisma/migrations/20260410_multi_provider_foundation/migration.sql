-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('SQUARESPACE', 'APPLE_APP_STORE', 'GOOGLE_PLAY', 'MANUAL', 'SEED');

-- Convert existing provider values in Subscription
ALTER TABLE "Subscription" ADD COLUMN "provider_new" "BillingProvider";
UPDATE "Subscription"
SET "provider_new" = CASE LOWER(COALESCE("provider", 'squarespace'))
  WHEN 'squarespace' THEN 'SQUARESPACE'::"BillingProvider"
  WHEN 'seed' THEN 'SEED'::"BillingProvider"
  WHEN 'manual' THEN 'MANUAL'::"BillingProvider"
  ELSE 'SQUARESPACE'::"BillingProvider"
END;
ALTER TABLE "Subscription" ADD COLUMN "providerCustomerId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "providerEnvironment" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "providerOriginalTransactionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "providerPlanId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "providerProductId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "providerPurchaseToken" TEXT;
ALTER TABLE "Subscription" DROP COLUMN "provider";
ALTER TABLE "Subscription" RENAME COLUMN "provider_new" TO "provider";
ALTER TABLE "Subscription" ALTER COLUMN "provider" SET NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "provider" SET DEFAULT 'SQUARESPACE';

-- Convert existing provider values in WebhookEvent
ALTER TABLE "WebhookEvent" ADD COLUMN "provider_new" "BillingProvider";
UPDATE "WebhookEvent"
SET "provider_new" = CASE LOWER(COALESCE("provider", 'squarespace'))
  WHEN 'squarespace' THEN 'SQUARESPACE'::"BillingProvider"
  WHEN 'seed' THEN 'SEED'::"BillingProvider"
  WHEN 'manual' THEN 'MANUAL'::"BillingProvider"
  ELSE 'SQUARESPACE'::"BillingProvider"
END;
ALTER TABLE "WebhookEvent" DROP COLUMN "provider";
ALTER TABLE "WebhookEvent" RENAME COLUMN "provider_new" TO "provider";
ALTER TABLE "WebhookEvent" ALTER COLUMN "provider" SET NOT NULL;

CREATE TABLE "PlanExternalRef" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "externalProductId" TEXT,
    "externalVariantId" TEXT,
    "externalPlanId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanExternalRef_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlanExternalRef" (
  "id",
  "planId",
  "provider",
  "externalProductId",
  "externalVariantId",
  "externalPlanId",
  "createdAt",
  "updatedAt"
)
SELECT
  'planext_' || substr(md5("id" || COALESCE("squarespaceVariantId", '')), 1, 24),
  "id",
  'SQUARESPACE'::"BillingProvider",
  NULL,
  "squarespaceVariantId",
  "squarespaceVariantId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Plan"
WHERE "squarespaceVariantId" IS NOT NULL;

DROP INDEX "Plan_squarespaceVariantId_key";
ALTER TABLE "Plan" DROP COLUMN "squarespaceVariantId";

DROP INDEX "Subscription_providerSubscriptionId_key";
DROP INDEX "WebhookEvent_providerEventId_key";

CREATE INDEX "PlanExternalRef_provider_externalProductId_idx" ON "PlanExternalRef"("provider", "externalProductId");
CREATE INDEX "PlanExternalRef_provider_externalVariantId_idx" ON "PlanExternalRef"("provider", "externalVariantId");
CREATE UNIQUE INDEX "PlanExternalRef_provider_externalPlanId_key" ON "PlanExternalRef"("provider", "externalPlanId");
CREATE INDEX "Subscription_provider_providerOrderId_idx" ON "Subscription"("provider", "providerOrderId");
CREATE UNIQUE INDEX "Subscription_provider_providerSubscriptionId_key" ON "Subscription"("provider", "providerSubscriptionId");
CREATE UNIQUE INDEX "WebhookEvent_provider_providerEventId_key" ON "WebhookEvent"("provider", "providerEventId");

ALTER TABLE "PlanExternalRef" ADD CONSTRAINT "PlanExternalRef_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
