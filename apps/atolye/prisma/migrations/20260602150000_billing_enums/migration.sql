-- iyzico billing enum tipleri. Prisma Client enum alanlarını ::"PlanType" diye
-- cast eder; PG tipleri yoksa YAZMA patlar (okuma değil). Kolonları TEXT→enum çevir.
-- Idempotent: CREATE TYPE DO-block ile, ALTER ... USING aynı-tip için no-op.

DO $$ BEGIN
  CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO', 'ADVANCED', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Account.planType: TEXT → PlanType (default'u koru)
ALTER TABLE "Account"
  ALTER COLUMN "planType" DROP DEFAULT,
  ALTER COLUMN "planType" TYPE "PlanType" USING "planType"::"PlanType",
  ALTER COLUMN "planType" SET DEFAULT 'FREE';

-- Plan.type: TEXT → PlanType (tablo boş)
ALTER TABLE "Plan"
  ALTER COLUMN "type" TYPE "PlanType" USING "type"::"PlanType";

-- Subscription.status: TEXT → SubscriptionStatus (default'u koru)
ALTER TABLE "Subscription"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SubscriptionStatus" USING "status"::"SubscriptionStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Subscription.billingCycle: TEXT → BillingCycle
ALTER TABLE "Subscription"
  ALTER COLUMN "billingCycle" TYPE "BillingCycle" USING "billingCycle"::"BillingCycle";
