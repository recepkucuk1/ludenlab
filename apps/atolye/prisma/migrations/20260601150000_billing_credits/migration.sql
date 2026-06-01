-- Faz 4 — Billing iskeleti (kredi bakiyesi + defter). ADDITIVE & idempotent. iyzico YOK.
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "planType" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "credits" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "CreditTransaction" (
  "id"        TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "amount"    INTEGER NOT NULL,
  "type"      TEXT NOT NULL,
  "reason"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CreditTransaction_accountId_createdAt_idx"
  ON "CreditTransaction" ("accountId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "CreditTransaction"
    ADD CONSTRAINT "CreditTransaction_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Mevcut hesaplara FREE kredi tanımı (kilitlenmesinler); yeni hesaplar kayıt sırasında alır.
UPDATE "Account" SET "credits" = 100 WHERE "credits" = 0;
