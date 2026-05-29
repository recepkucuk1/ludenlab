-- RLS: Session (seans/randevu) — klinik veri, ownerId-kapsamlı.
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_owner ON "Session"
  FOR ALL
  USING ("ownerId" = current_setting('app.current_account_id', true))
  WITH CHECK ("ownerId" = current_setting('app.current_account_id', true));
