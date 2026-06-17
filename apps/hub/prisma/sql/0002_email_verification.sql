-- 0002_email_verification.sql
-- Üyelik e-posta doğrulaması: billing."Account"a 3 kolon (additive, idempotent).
-- prisma/schema.prisma Account modeliyle BİREBİR (BOOLEAN / TEXT / TIMESTAMP(3)).
-- prisma migrate / db push YOK — raw SQL (bkz. 0001_init_billing.sql, ROADMAP drift notu).
--
-- KRİTİK: mevcut hesaplar (göç edilmiş kimlikler + canlı kullanıcılar) "doğrulanmış"
-- kabul edilir → hard gate sonrası KİLİTLENMESİNLER. Yalnız bu migration'dan SONRA
-- açılan kayıtlar emailVerified=false başlar (uygulama açıkça set eder).

-- emailVerified: önce nullable ekle → mevcut tüm satırları true yap → default + NOT NULL.
-- (Re-run güvenli: ADD IF NOT EXISTS no-op; UPDATE WHERE IS NULL yeni kayıtları ETKİLEMEZ.)
ALTER TABLE billing."Account" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN;
UPDATE billing."Account" SET "emailVerified" = true WHERE "emailVerified" IS NULL;
ALTER TABLE billing."Account" ALTER COLUMN "emailVerified" SET DEFAULT false;
ALTER TABLE billing."Account" ALTER COLUMN "emailVerified" SET NOT NULL;

ALTER TABLE billing."Account" ADD COLUMN IF NOT EXISTS "emailVerifyToken"   TEXT;
ALTER TABLE billing."Account" ADD COLUMN IF NOT EXISTS "emailVerifyExpires" TIMESTAMP(3);

-- findUnique({ where: { emailVerifyToken } }) için unique index (Postgres NULL'lara izin verir).
CREATE UNIQUE INDEX IF NOT EXISTS "Account_emailVerifyToken_key"
  ON billing."Account" ("emailVerifyToken");
