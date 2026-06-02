-- Faz 5 — iyzico abonelik: Plan + Subscription + WebhookDelivery + Account.iyzicoCustomerRef.
-- ADDITIVE & idempotent (ADD COLUMN/CREATE TABLE IF NOT EXISTS, FK DO-block).
-- Enum alanları TEXT (Account.planType konvansiyonu ile hizalı). Billing tablolarında
-- RLS YOK — klinik veri değil; uygulama accountId ile filtreler (CreditTransaction gibi).

-- ── Account: iyzico müşteri referansı ───────────────────────────────────────
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "iyzicoCustomerRef" TEXT;

-- ── Plan (global referans verisi) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Plan" (
  "id"                   TEXT NOT NULL,
  "type"                 TEXT NOT NULL,
  "creditAmount"         INTEGER NOT NULL,
  "monthlyPrice"         INTEGER NOT NULL,
  "yearlyPrice"          INTEGER NOT NULL,
  "iyzicoProductRef"     TEXT,
  "iyzicoMonthlyPlanRef" TEXT,
  "iyzicoYearlyPlanRef"  TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_type_key" ON "Plan" ("type");

-- ── Subscription ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id"                    TEXT NOT NULL,
  "accountId"             TEXT NOT NULL,
  "planId"                TEXT NOT NULL,
  "status"                TEXT NOT NULL DEFAULT 'PENDING',
  "billingCycle"          TEXT NOT NULL,
  "currentPeriodEnd"      TIMESTAMP(3) NOT NULL,
  "iyzicoSubscriptionRef" TEXT,
  "iyzicoPricingPlanRef"  TEXT,
  "cancelledAt"           TIMESTAMP(3),
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_iyzicoSubscriptionRef_key"
  ON "Subscription" ("iyzicoSubscriptionRef");
CREATE INDEX IF NOT EXISTS "Subscription_accountId_idx" ON "Subscription" ("accountId");

DO $$ BEGIN
  ALTER TABLE "Subscription"
    ADD CONSTRAINT "Subscription_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Subscription"
    ADD CONSTRAINT "Subscription_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── WebhookDelivery (iyzico webhook idempotency defteri) ─────────────────────
CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
  "id"          TEXT NOT NULL,
  "provider"    TEXT NOT NULL,
  "externalId"  TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'received',
  "attempts"    INTEGER NOT NULL DEFAULT 1,
  "payload"     JSONB NOT NULL,
  "error"       TEXT,
  "receivedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookDelivery_provider_externalId_key"
  ON "WebhookDelivery" ("provider", "externalId");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_status_idx" ON "WebhookDelivery" ("status");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_receivedAt_idx" ON "WebhookDelivery" ("receivedAt");
