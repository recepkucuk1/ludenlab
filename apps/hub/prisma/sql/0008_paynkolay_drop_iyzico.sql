-- 0008_paynkolay_drop_iyzico.sql
-- HEDEF DB: billing şeması (HUB_DATABASE_URL — Studio Supabase, proje kgbhvruzoaqwwwkhzdex).
--
-- iyzico → Paynkolay geçişinin SON adımı: artık okunmayan iyzico kolonlarını düşür.
-- Kullanım Paynkolay'a taşındı: sonuc→paynkolayClientRefCode, central-billing→merkezi Subscription.id,
-- plan lookup→(module,code,interval). IDEMPOTENT (IF EXISTS). prisma migrate YOK (bkz. 0001).
--
-- NOT: Modül DB'leri için AYRI migration'lar MCP ile uygulandı (bu dosya yalnız MERKEZİ billing
-- şemasıdır). Modüllerde (atolye=uzkbuplwhnwizqflzban public, studio=kgbhvruzoaqwwwkhzdex public):
--   "Subscription": iyzicoSubscriptionRef → centralSubscriptionId (RENAME COLUMN),
--                   iyzicoCustomerRef (studio) + iyzicoPricingPlanRef DROP;
--   "Plan": iyzicoProductRef/iyzicoMonthlyPlanRef/iyzicoYearlyPlanRef DROP;
--   atolye "Account": iyzicoCustomerRef DROP.

ALTER TABLE billing."Subscription" DROP COLUMN IF EXISTS "iyzicoSubscriptionRef";
ALTER TABLE billing."Subscription" DROP COLUMN IF EXISTS "iyzicoPricingPlanRef";
ALTER TABLE billing."Account"      DROP COLUMN IF EXISTS "iyzicoCustomerRef";
ALTER TABLE billing."BillingPlan"  DROP COLUMN IF EXISTS "iyzicoProductRef";
ALTER TABLE billing."BillingPlan"  DROP COLUMN IF EXISTS "iyzicoPlanRef";
ALTER TABLE billing."WebhookEvent" ALTER COLUMN "provider" SET DEFAULT 'paynkolay';
