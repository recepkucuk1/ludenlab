-- 0011_billing_profile_payments.sql
-- HEDEF DB: billing şeması (HUB_DATABASE_URL — Studio Supabase, proje kgbhvruzoaqwwwkhzdex).
--
-- Faturalama altyapısı (idempotent, prisma migrate YOK):
--  1) BillingProfile — e-Arşiv/e-Fatura için müşteri vergi kimliği (hesap başına bir).
--     type: INDIVIDUAL (ad-soyad + il; TCKN opsiyonel) | CORPORATE (ünvan + VKN/TCKN +
--     vergi dairesi + adres zorunlu — uygulama doğrular). Ödeme (hosted form) yolu bu
--     profil olmadan BAŞLATILMAZ (init 428 döner).
--  2) Payment — her BAŞARILI tahsilatın kalıcı kaydı (fatura kesme listesi):
--     ilk ödeme /odeme/sonuc (INITIAL), yenileme cron'u (RENEWAL). clientRefCode UNIQUE
--     → tekrar çalıştırmalar idempotent (pk... | renew<subId>P<gün>).

CREATE TABLE IF NOT EXISTS billing."BillingProfile" (
  "id"          TEXT NOT NULL,
  "accountId"   TEXT NOT NULL,
  "type"        TEXT NOT NULL, -- INDIVIDUAL | CORPORATE
  "fullName"    TEXT NOT NULL, -- bireysel ad-soyad; kurumsalda yetkili kişi
  "tckn"        TEXT,          -- bireysel opsiyonel TCKN (11 hane)
  "companyName" TEXT,          -- kurumsal ünvan
  "taxNumber"   TEXT,          -- VKN (10) ya da şahıs şirketi TCKN (11)
  "taxOffice"   TEXT,          -- vergi dairesi
  "address"     TEXT,          -- açık adres (kurumsalda zorunlu)
  "city"        TEXT NOT NULL, -- il
  "district"    TEXT,          -- ilçe
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingProfile_accountId_fkey" FOREIGN KEY ("accountId")
    REFERENCES billing."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BillingProfile_accountId_key"
  ON billing."BillingProfile" ("accountId");

CREATE TABLE IF NOT EXISTS billing."Payment" (
  "id"               TEXT NOT NULL,
  "accountId"        TEXT NOT NULL,
  "module"           billing."BillingModule" NOT NULL,
  "billingPlanId"    TEXT,
  "amount"           DECIMAL(10,2) NOT NULL,
  "kind"             TEXT NOT NULL, -- INITIAL | RENEWAL
  "clientRefCode"    TEXT NOT NULL,
  "paynkolayRefCode" TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_accountId_fkey" FOREIGN KEY ("accountId")
    REFERENCES billing."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Payment_billingPlanId_fkey" FOREIGN KEY ("billingPlanId")
    REFERENCES billing."BillingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_clientRefCode_key"
  ON billing."Payment" ("clientRefCode");
CREATE INDEX IF NOT EXISTS "Payment_accountId_idx"
  ON billing."Payment" ("accountId");
CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx"
  ON billing."Payment" ("createdAt");
