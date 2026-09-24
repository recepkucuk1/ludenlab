-- ops/atolye_billing_reader.sql — ŞABLON (numaralı migration DEĞİL; elle, gözden geçirilerek uygulanır)
-- HEDEF DB: merkezi billing (Studio Supabase, `billing` şeması).
--
-- EN AZ YETKİ (2026-09 denetimi #18): Atölye'nin merkezi aboneliği OKUDUĞU bağlantı
-- (`CENTRAL_BILLING_DATABASE_URL`, atolye/lib/central-billing.ts → centralPool) bugün
-- `postgres` rolüyle bağlanıyor: RLS'yi baypas eder ve tüm billing tablolarına YAZABİLİR
-- (TCKN'li BillingProfile, parola hash'li Account dahil). Bu havuz yalnız okuma yapar ve
-- yalnız şu sütunlara ihtiyaç duyar — rol tam olarak bunlarla sınırlanır.
--
-- UYGULAMA:
--   1) Aşağıdaki şifreyi güçlü bir değerle değiştirip çalıştırın.
--   2) Pooler URL'ini bu rolle kurun (Supavisor: kullanıcı adı `atolye_billing_reader.<proje-ref>`).
--   3) hPanel'de CENTRAL_BILLING_DATABASE_URL'i yeni URL ile değiştirin, redeploy.
--   4) Atölye'de ücretli bir hesapla giriş yapıp planın doğru göründüğünü doğrulayın.
-- GERİ ALMA: CENTRAL_BILLING_DATABASE_URL'i eski değere döndürün (rol zararsız kalır).
--
-- NOT: billing tablolarında RLS açık ve politika yok (0016 → deny-all). BYPASSRLS OLMAYAN bu
-- rol için aşağıdaki SELECT politikaları olmadan her sorgu 0 satır döner ve Atölye'de
-- ödeyen kullanıcıların planı sessizce FREE'ye düşer — politikaları ATLAMAYIN.

DO $$ BEGIN
  CREATE ROLE atolye_billing_reader LOGIN PASSWORD 'DEGISTIR-guclu-bir-sifre' NOBYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT USAGE ON SCHEMA billing TO atolye_billing_reader;

-- Sütun düzeyinde: parola hash'i, doğrulama/sıfırlama token'ları, müşteri ref'i OKUNAMAZ.
GRANT SELECT (id, email) ON billing."Account" TO atolye_billing_reader;
GRANT SELECT (id, "accountId", module, status, "billingPlanId", "currentPeriodEnd", "createdAt")
  ON billing."Subscription" TO atolye_billing_reader;
GRANT SELECT (id, code, interval) ON billing."BillingPlan" TO atolye_billing_reader;

DO $$ BEGIN
  CREATE POLICY atolye_reader_select ON billing."Account" FOR SELECT TO atolye_billing_reader USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY atolye_reader_select ON billing."Subscription" FOR SELECT TO atolye_billing_reader
    USING (module = 'ATOLYE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY atolye_reader_select ON billing."BillingPlan" FOR SELECT TO atolye_billing_reader USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
