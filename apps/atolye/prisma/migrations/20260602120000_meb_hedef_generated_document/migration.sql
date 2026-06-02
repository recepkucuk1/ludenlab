-- Faz 3: GeneratedDocument'a MEB hedef hizalaması kolonları.
-- Salt-EKLEME — mevcut satırlar/RLS politikaları etkilenmez (kolon eklemek row-level RLS'i değiştirmez).
-- Idempotent (IF NOT EXISTS) — repo migration stiline uygun; tekrar uygulanabilir.

ALTER TABLE "GeneratedDocument" ADD COLUMN IF NOT EXISTS "mebHedefKod" TEXT;
ALTER TABLE "GeneratedDocument" ADD COLUMN IF NOT EXISTS "mebDavranisKodlari" TEXT[] NOT NULL DEFAULT '{}'::text[];
