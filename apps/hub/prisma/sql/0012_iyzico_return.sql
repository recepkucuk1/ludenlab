-- 0012_iyzico_return.sql
-- HEDEF DB: billing şeması (HUB_DATABASE_URL — Studio Supabase, proje kgbhvruzoaqwwwkhzdex).
--
-- Sağlayıcı: Paynkolay → iyzico DÖNÜŞÜ (PayTR reddetti). iyzico native Abonelik v2 modeli
-- geri geliyor (ürün/plan ref + checkout form + webhook; yenilemeyi iyzico yönetir).
-- Idempotent; prisma migrate YOK. Eski iyzico kolonları 0008'de DROP edilmişti → geri gelir
-- (bu kez nullable — mevcut satırlar ref'siz başlar, seed UPDATE'i doldurur).

-- Account: iyzico müşteri referansı
ALTER TABLE billing."Account" ADD COLUMN IF NOT EXISTS "iyzicoCustomerRef" TEXT;

-- BillingPlan: iyzico ürün/plan referansları (PROD ref'leri aşağıda seed'lenir)
ALTER TABLE billing."BillingPlan" ADD COLUMN IF NOT EXISTS "iyzicoProductRef" TEXT;
ALTER TABLE billing."BillingPlan" ADD COLUMN IF NOT EXISTS "iyzicoPlanRef"    TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "BillingPlan_iyzicoPlanRef_key"
  ON billing."BillingPlan" ("iyzicoPlanRef");

-- Subscription: iyzico referansları + paynkolay kolonlarını DROP
ALTER TABLE billing."Subscription" ADD COLUMN IF NOT EXISTS "iyzicoSubscriptionRef" TEXT;
ALTER TABLE billing."Subscription" ADD COLUMN IF NOT EXISTS "iyzicoPricingPlanRef"  TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_iyzicoSubscriptionRef_key"
  ON billing."Subscription" ("iyzicoSubscriptionRef");
ALTER TABLE billing."Subscription" DROP COLUMN IF EXISTS "paynkolayClientRefCode";
ALTER TABLE billing."Subscription" DROP COLUMN IF EXISTS "paynkolayCardToken";
ALTER TABLE billing."Subscription" DROP COLUMN IF EXISTS "paynkolayCustomerKey";
ALTER TABLE billing."Subscription" DROP COLUMN IF EXISTS "paynkolayRefCode";

-- Payment: sağlayıcı-adlı kolonu jenerikleştir (paynkolayRefCode → providerRef)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='billing' AND table_name='Payment' AND column_name='paynkolayRefCode') THEN
    ALTER TABLE billing."Payment" RENAME COLUMN "paynkolayRefCode" TO "providerRef";
  END IF;
END $$;

-- WebhookEvent: iyzico webhook idempotency kaydı (0008'de düşmüştü; aynen geri)
CREATE TABLE IF NOT EXISTS billing."WebhookEvent" (
  "id"          TEXT NOT NULL,
  "provider"    TEXT NOT NULL DEFAULT 'iyzico',
  "eventType"   TEXT NOT NULL,
  "externalId"  TEXT NOT NULL,
  "module"      billing."BillingModule",
  "payload"     JSONB NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'received', -- received | processed | failed
  "attempts"    INTEGER NOT NULL DEFAULT 1,
  "error"       TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_externalId_key" ON billing."WebhookEvent" ("externalId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_status_idx"    ON billing."WebhookEvent" ("status");
CREATE INDEX IF NOT EXISTS "WebhookEvent_createdAt_idx" ON billing."WebhookEvent" ("createdAt");

-- ── SEED: PROD iyzico ürün/plan referansları (2026-06-04'te iyzico panelde oluşturulmuştu;
--    fiyatlar bugünkü BillingPlan satırlarıyla birebir: PRO 449/4579.80, ADV 1999/20389.80) ──
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='2f0032b0', "iyzicoPlanRef"='19ab231d' WHERE module='STUDIO' AND code='PRO'      AND interval='MONTHLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='2f0032b0', "iyzicoPlanRef"='fef3c8a8' WHERE module='STUDIO' AND code='PRO'      AND interval='YEARLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='2f0032b0', "iyzicoPlanRef"='6a02f590' WHERE module='STUDIO' AND code='ADVANCED' AND interval='MONTHLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='2f0032b0', "iyzicoPlanRef"='63a0a2a7' WHERE module='STUDIO' AND code='ADVANCED' AND interval='YEARLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='0edf59ee', "iyzicoPlanRef"='010cd87c' WHERE module='ATOLYE' AND code='PRO'      AND interval='MONTHLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='0edf59ee', "iyzicoPlanRef"='086ac3be' WHERE module='ATOLYE' AND code='PRO'      AND interval='YEARLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='0edf59ee', "iyzicoPlanRef"='801da161' WHERE module='ATOLYE' AND code='ADVANCED' AND interval='MONTHLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='0edf59ee', "iyzicoPlanRef"='8fa33f9f' WHERE module='ATOLYE' AND code='ADVANCED' AND interval='YEARLY';
