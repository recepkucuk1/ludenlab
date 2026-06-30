-- 0010_password_reset.sql
-- HEDEF DB: billing şeması (HUB_DATABASE_URL — Studio Supabase, proje kgbhvruzoaqwwwkhzdex).
--
-- "Şifremi unuttum" akışı: billing."Account"a parola-sıfırlama token alanları (additive, idempotent).
-- Token e-postayla HAM gider, DB'de yalnız sha256'sı saklanır (emailVerifyToken ile aynı desen).
-- 1 saat geçerli, tek kullanımlık (sıfırlamada temizlenir). prisma migrate / db push YOK — raw SQL.

ALTER TABLE billing."Account" ADD COLUMN IF NOT EXISTS "passwordResetToken"   TEXT;
ALTER TABLE billing."Account" ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3);

-- findUnique({ where: { passwordResetToken } }) için unique index (Postgres NULL'lara izin verir).
CREATE UNIQUE INDEX IF NOT EXISTS "Account_passwordResetToken_key"
  ON billing."Account" ("passwordResetToken");
