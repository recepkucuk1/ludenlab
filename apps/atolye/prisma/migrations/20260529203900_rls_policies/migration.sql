-- RLS: klinik tablolar (çocuk verisi). Account, auth (register/login) için açık kalır.
-- Uygulama her klinik sorguyu withRls() içinden geçirir → transaction-local
-- `app.current_account_id` set edilir. (BYPASSRLS olmayan rolde RLS enforce eder;
--  Supabase postgres rolünde uygulama-düzeyi ownerId filtresi birincil korumadır.)

ALTER TABLE "Case" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GeneratedDocument" ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_owner ON "Case"
  FOR ALL
  USING ("ownerId" = current_setting('app.current_account_id', true))
  WITH CHECK ("ownerId" = current_setting('app.current_account_id', true));

CREATE POLICY doc_owner ON "GeneratedDocument"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Case" c
      WHERE c.id = "GeneratedDocument"."caseId"
        AND c."ownerId" = current_setting('app.current_account_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Case" c
      WHERE c.id = "GeneratedDocument"."caseId"
        AND c."ownerId" = current_setting('app.current_account_id', true)
    )
  );
