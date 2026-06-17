-- Account'a profil alanları: kullanıcının kendi düzenlediği hesap bilgileri + KVKK destek rızası.
-- Salt-EKLEME — mevcut satırlar/RLS politikaları etkilenmez (kolon eklemek row-level RLS'i değiştirmez).
-- Idempotent (IF NOT EXISTS) — repo migration stiline uygun; tekrar uygulanabilir.

-- Profil (PII; AI'a gitmez)
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "specialty" TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "institution" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "experienceYears" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "certifications" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "preferences" JSONB;

-- Destek erişimi (KVKK rıza) — null veya geçmiş tarih = izin yok
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "supportAccessExpiresAt" TIMESTAMP(3);
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "supportAccessReason" TEXT;
