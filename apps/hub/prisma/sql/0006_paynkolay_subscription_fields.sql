-- 0006_paynkolay_subscription_fields.sql
-- HEDEF DB: billing şeması (HUB_DATABASE_URL — Studio Supabase, proje kgbhvruzoaqwwwkhzdex).
--
-- iyzico → Paynkolay (nkolay VPOS) geçişi. Paynkolay'da süresiz native abonelik YOK:
-- ilk ödeme hosted form + csAutoSave ile kart token'lanır, yenileme cron'u csToken ile çeker.
-- Bu migration merkezi Subscription'a Paynkolay alanlarını ADDITIVE ekler. iyzico kolonları
-- (iyzicoSubscriptionRef/iyzicoPricingPlanRef) kullanım taşındıktan sonra ayrı migration'da
-- (Faz D) düşürülecek. prisma migrate YOK (bkz. 0001). schema.prisma Subscription ile BİREBİR.

ALTER TABLE billing."Subscription"
  ADD COLUMN IF NOT EXISTS "paynkolayClientRefCode" TEXT,
  ADD COLUMN IF NOT EXISTS "paynkolayCardToken"     TEXT,
  ADD COLUMN IF NOT EXISTS "paynkolayCustomerKey"   TEXT,
  ADD COLUMN IF NOT EXISTS "paynkolayRefCode"       TEXT;

-- clientRefCode benzersiz: callback'i aboneliğe idempotent bağlar (nullable → çoklu NULL serbest).
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_paynkolayClientRefCode_key"
  ON billing."Subscription" ("paynkolayClientRefCode");
