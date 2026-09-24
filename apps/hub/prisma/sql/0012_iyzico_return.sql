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
--    2026-09 düzeltmesi: bu dosya ref'lerin yalnız 8 karakterlik ÖNEKLERİNİ içeriyordu —
--    yeniden çalıştırılırsa BillingPlan iyzico'nun döndürdüğü tam ref'le eşleşmez, checkout
--    ve callback "plan_not_found" ile kırılırdı. Tam UUID'ler BILLING_CUTOVER.md §10'dan.)
--    fiyatlar bugünkü BillingPlan satırlarıyla birebir: PRO 449/4579.80, ADV 1999/20389.80) ──
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='2f0032b0-4165-4d35-9862-c61000f52d29', "iyzicoPlanRef"='19ab231d-4648-4ffc-a291-5f7d751d4bfd' WHERE module='STUDIO' AND code='PRO'      AND interval='MONTHLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='2f0032b0-4165-4d35-9862-c61000f52d29', "iyzicoPlanRef"='fef3c8a8-5065-4562-83ed-beebd8cafe6b' WHERE module='STUDIO' AND code='PRO'      AND interval='YEARLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='2f0032b0-4165-4d35-9862-c61000f52d29', "iyzicoPlanRef"='6a02f590-aff6-45ce-a1f2-f9fa2d3dbea6' WHERE module='STUDIO' AND code='ADVANCED' AND interval='MONTHLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='2f0032b0-4165-4d35-9862-c61000f52d29', "iyzicoPlanRef"='63a0a2a7-c7f9-4315-90e8-cc75b37c1084' WHERE module='STUDIO' AND code='ADVANCED' AND interval='YEARLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='0edf59ee-27d7-4704-9f4c-87bf90a630a3', "iyzicoPlanRef"='010cd87c-8b21-4282-b9bd-674a362b51ef' WHERE module='ATOLYE' AND code='PRO'      AND interval='MONTHLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='0edf59ee-27d7-4704-9f4c-87bf90a630a3', "iyzicoPlanRef"='086ac3be-ac25-402b-8e33-4bbf4ecfaa7d' WHERE module='ATOLYE' AND code='PRO'      AND interval='YEARLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='0edf59ee-27d7-4704-9f4c-87bf90a630a3', "iyzicoPlanRef"='801da161-ad16-49d9-a074-0c0285d35370' WHERE module='ATOLYE' AND code='ADVANCED' AND interval='MONTHLY';
UPDATE billing."BillingPlan" SET "iyzicoProductRef"='0edf59ee-27d7-4704-9f4c-87bf90a630a3', "iyzicoPlanRef"='8fa33f9f-5487-4ddd-9c35-c07dcc15aa81' WHERE module='ATOLYE' AND code='ADVANCED' AND interval='YEARLY';
