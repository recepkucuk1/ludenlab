-- 0003_atolye_rls.sql
-- DİKKAT — HEDEF DB: Atölye KLİNİK DB = AYRI Supabase (ATOLYE_DATABASE_URL, public şema).
-- 0001/0002 billing DB'sine (HUB_DATABASE_URL) gider; BU dosya ATOLYE_DATABASE_URL'e uygulanır.
--
-- RLS sertleştirmesi: tüm public tablolarda Row Level Security aç → anon/authenticated
-- (Supabase PostgREST veri-API'si) erişimini kapat. `Account` (passwordHash + PII),
-- `Subscription`, `CreditTransaction` vb. aksi halde anon key'i olan herkese AÇIK.
--
-- App'i ETKİLEMEZ: runtime `postgres` rolüyle bağlanır (rolbypassrls=true + tüm tabloların
-- sahibi, FORCE RLS yok) → RLS bypass edilir. App zaten yalnız Prisma kullanır (supabase-js/
-- anon-key yok). Doğrulama: owner Account'ta tüm satırları okur; anon 0 satır.
--
-- ADDITIVE + IDEMPOTENT (ENABLE RLS tekrar = no-op; politikalar DROP IF EXISTS + CREATE).
-- prisma migrate / db push YOK — pg (adapter-pg) ile elle uygulanır (bkz. 0001, ROADMAP drift notu).

-- ── Sahip-keyed politikalı klinik tablolar ───────────────────────────────────
-- `app.current_account_id` GUC'unu withRls() (transaction-local) set eder; anon set
-- edemediğinden bu politikalar anon için de etkin olarak deny-all'dır.
ALTER TABLE "Case" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "case_owner" ON "Case";
CREATE POLICY "case_owner" ON "Case" FOR ALL
  USING ("ownerId" = current_setting('app.current_account_id', true))
  WITH CHECK ("ownerId" = current_setting('app.current_account_id', true));

ALTER TABLE "GeneratedDocument" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doc_owner" ON "GeneratedDocument";
CREATE POLICY "doc_owner" ON "GeneratedDocument" FOR ALL
  USING (EXISTS (SELECT 1 FROM "Case" c
                 WHERE c.id = "GeneratedDocument"."caseId"
                   AND c."ownerId" = current_setting('app.current_account_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "Case" c
                 WHERE c.id = "GeneratedDocument"."caseId"
                   AND c."ownerId" = current_setting('app.current_account_id', true)));

ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "session_owner" ON "Session";
CREATE POLICY "session_owner" ON "Session" FOR ALL
  USING ("ownerId" = current_setting('app.current_account_id', true))
  WITH CHECK ("ownerId" = current_setting('app.current_account_id', true));

-- ── Deny-all tablolar (RLS açık, politika YOK = anon/authenticated tam ret) ───
-- App postgres/BYPASSRLS ile erişir; anon/authenticated tüm satırlardan reddedilir.
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiUsageLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionException" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
