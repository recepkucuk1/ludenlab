-- 0007_paynkolay_payment_intent.sql
-- HEDEF DB: billing şeması (HUB_DATABASE_URL — Studio Supabase, proje kgbhvruzoaqwwwkhzdex).
--
-- Paynkolay hosted-form ödeme niyeti. init'te oluşur (Subscription'a DOKUNMADAN → mevcut
-- erişim korunur), callback `CLIENT_REFERENCE_CODE` ile eşleşir. Ödeme PaymentList ile teyit
-- edilince Subscription ACTIVE'e upsert edilir, intent CONSUMED'e geçer. prisma migrate YOK.
-- schema.prisma PaymentIntent modeliyle BİREBİR.

CREATE TABLE IF NOT EXISTS billing."PaymentIntent" (
  "id"            TEXT NOT NULL,
  "clientRefCode" TEXT NOT NULL,
  "accountId"     TEXT NOT NULL,
  "billingPlanId" TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | CONSUMED
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIntent_clientRefCode_key"
  ON billing."PaymentIntent" ("clientRefCode");
CREATE INDEX IF NOT EXISTS "PaymentIntent_accountId_idx"
  ON billing."PaymentIntent" ("accountId");
