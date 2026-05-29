-- LudenLab Atölye — RLS POLİTİKA TASLAĞI (Faz 2)
-- =============================================================
-- Çocuk verisi güvenlik-kritik. Bu politikalar VERSİYONLU bir
-- prisma migration'ının parçası olarak uygulanır; ASLA `db push`
-- ile değil (RLS/GRANT sessizce düşer — bkz. ROADMAP.md).
--
-- Uygulama bağlantısı, BYPASSRLS YETKİSİ OLMAYAN bir rol kullanmalı.
-- Her istekte ilgili uzmanın kimliği oturuma yazılır:
--     SET LOCAL app.current_account_id = '<account_id>';
-- =============================================================

ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Case" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GeneratedDocument" ENABLE ROW LEVEL SECURITY;

-- Kişi yalnız kendi Account kaydını görür/günceller.
CREATE POLICY account_self ON "Account"
  FOR ALL
  USING (id = current_setting('app.current_account_id', true))
  WITH CHECK (id = current_setting('app.current_account_id', true));

-- Vaka: yalnız sahibinin (ownerId) erişimi.
CREATE POLICY case_owner ON "Case"
  FOR ALL
  USING ("ownerId" = current_setting('app.current_account_id', true))
  WITH CHECK ("ownerId" = current_setting('app.current_account_id', true));

-- Üretilen doküman: ait olduğu vakanın sahibi üzerinden.
CREATE POLICY doc_owner ON "GeneratedDocument"
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM "Case" c
    WHERE c.id = "GeneratedDocument"."caseId"
      AND c."ownerId" = current_setting('app.current_account_id', true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "Case" c
    WHERE c.id = "GeneratedDocument"."caseId"
      AND c."ownerId" = current_setting('app.current_account_id', true)
  ));
