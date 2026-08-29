-- 0017 — Hesap silme kütüğü (KVKK kanıtı; 2026-08 güvenlik denetimi)
--
-- Silme tamamlandığında geriye hiçbir iz kalmıyordu: ödemesi olmayan bir hesap silindiğinde
-- sistemde o hesabın var olduğuna/silindiğine dair kayıt YOKTU. Bu tablo silme olayını
-- kanıtlar ama silinen kişisel veriyi GERİ GETİRMEZ: e-posta düz metin değil,
-- HMAC-SHA256(e-posta, AUTH_SECRET) olarak tutulur.

CREATE TABLE IF NOT EXISTS billing."AccountDeletion" (
  "id"              TEXT PRIMARY KEY,
  "emailHash"       TEXT        NOT NULL,
  "deletedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedBy"       TEXT        NOT NULL,
  "actorId"         TEXT,
  "modules"         JSONB       NOT NULL,
  "paymentsKept"    INTEGER     NOT NULL DEFAULT 0,
  "hadSubscription" BOOLEAN     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS "AccountDeletion_emailHash_idx" ON billing."AccountDeletion" ("emailHash");
CREATE INDEX IF NOT EXISTS "AccountDeletion_deletedAt_idx" ON billing."AccountDeletion" ("deletedAt");

-- Diğer billing tablolarıyla aynı duruş (0016): RLS açık, politika yok = deny-all.
ALTER TABLE billing."AccountDeletion" ENABLE ROW LEVEL SECURITY;
