-- Öğrenci Bilgi Sistemi (SIS) alanları — Case'e additive kolonlar.
-- NOT: DB-drift geçmişi nedeniyle doğrudan ALTER (IF NOT EXISTS) ile uygulandı,
-- prisma migrate reset YAPILMADI. Idempotent + nullable → mevcut veri/canlı app güvende.
ALTER TABLE "Case"
  ADD COLUMN IF NOT EXISTS "yas" INTEGER,
  ADD COLUMN IF NOT EXISTS "taniProfili" TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS "guclukDuzeyi" TEXT,
  ADD COLUMN IF NOT EXISTS "gucluYonler" TEXT,
  ADD COLUMN IF NOT EXISTS "ilgiAlanlari" TEXT,
  ADD COLUMN IF NOT EXISTS "displayName" TEXT,
  ADD COLUMN IF NOT EXISTS "okul" TEXT,
  ADD COLUMN IF NOT EXISTS "veliIletisim" TEXT;
