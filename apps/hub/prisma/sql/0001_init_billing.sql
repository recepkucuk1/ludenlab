-- LudenLab merkezi billing — Studio Supabase'inde `billing` ŞEMASI.
-- ADDITIVE + IDEMPOTENT. `public` (Studio canlı) şemasına DOKUNMAZ.
-- Uygulama: pg ile (adapter-pg), prisma migrate/db push YOK. schema.prisma'ya birebir uyar.

CREATE SCHEMA IF NOT EXISTS billing;

-- ── Enums (idempotent) ───────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE billing."BillingModule" AS ENUM ('STUDIO', 'ATOLYE', 'BRYTAKIP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE billing."SubscriptionStatus" AS ENUM
    ('PENDING', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE billing."BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Account (merkezi kimlik / SSO) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing."Account" (
  "id"                TEXT PRIMARY KEY,
  "email"             TEXT NOT NULL,
  "name"              TEXT,
  "passwordHash"      TEXT NOT NULL,
  "role"              TEXT NOT NULL DEFAULT 'user',
  "suspended"         BOOLEAN NOT NULL DEFAULT false,
  "iyzicoCustomerRef" TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_email_key" ON billing."Account" ("email");
CREATE INDEX IF NOT EXISTS "Account_email_idx" ON billing."Account" ("email");

-- ── BillingPlan (iyzico ürün/plan referansları) ──────────────────────────────
CREATE TABLE IF NOT EXISTS billing."BillingPlan" (
  "id"               TEXT PRIMARY KEY,
  "module"           billing."BillingModule" NOT NULL,
  "code"             TEXT NOT NULL,
  "interval"         billing."BillingInterval" NOT NULL,
  "name"             TEXT NOT NULL,
  "price"            DECIMAL(10, 2) NOT NULL,
  "iyzicoProductRef" TEXT NOT NULL,
  "iyzicoPlanRef"    TEXT NOT NULL,
  "active"           BOOLEAN NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "BillingPlan_iyzicoPlanRef_key"
  ON billing."BillingPlan" ("iyzicoPlanRef");
CREATE UNIQUE INDEX IF NOT EXISTS "BillingPlan_module_code_interval_key"
  ON billing."BillingPlan" ("module", "code", "interval");
CREATE INDEX IF NOT EXISTS "BillingPlan_module_idx" ON billing."BillingPlan" ("module");

-- ── Subscription ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing."Subscription" (
  "id"                    TEXT PRIMARY KEY,
  "accountId"             TEXT NOT NULL,
  "module"                billing."BillingModule" NOT NULL,
  "billingPlanId"         TEXT,
  "status"                billing."SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "iyzicoSubscriptionRef" TEXT,
  "iyzicoPricingPlanRef"  TEXT,
  "currentPeriodEnd"      TIMESTAMP(3),
  "cancelledAt"           TIMESTAMP(3),
  "lastSyncedPeriodEnd"   TIMESTAMP(3),
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_accountId_fkey" FOREIGN KEY ("accountId")
    REFERENCES billing."Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Subscription_billingPlanId_fkey" FOREIGN KEY ("billingPlanId")
    REFERENCES billing."BillingPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_iyzicoSubscriptionRef_key"
  ON billing."Subscription" ("iyzicoSubscriptionRef");
CREATE INDEX IF NOT EXISTS "Subscription_accountId_module_idx"
  ON billing."Subscription" ("accountId", "module");
CREATE INDEX IF NOT EXISTS "Subscription_module_status_idx"
  ON billing."Subscription" ("module", "status");

-- ── WebhookEvent (tek apex webhook ucu — idempotency + iz) ────────────────────
CREATE TABLE IF NOT EXISTS billing."WebhookEvent" (
  "id"          TEXT PRIMARY KEY,
  "provider"    TEXT NOT NULL DEFAULT 'iyzico',
  "eventType"   TEXT NOT NULL,
  "externalId"  TEXT NOT NULL,
  "module"      billing."BillingModule",
  "payload"     JSONB NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'received',
  "attempts"    INTEGER NOT NULL DEFAULT 1,
  "error"       TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_externalId_key"
  ON billing."WebhookEvent" ("externalId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_status_idx" ON billing."WebhookEvent" ("status");
CREATE INDEX IF NOT EXISTS "WebhookEvent_createdAt_idx" ON billing."WebhookEvent" ("createdAt");
