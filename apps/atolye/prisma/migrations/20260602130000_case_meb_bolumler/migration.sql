-- Case'e çalışılan MEB hedef alanları (bölüm kodları) kolonu.
-- Salt-EKLEME — mevcut satırlar/RLS politikaları etkilenmez.
-- Idempotent (IF NOT EXISTS) — repo migration stiline uygun.

ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "mebBolumler" TEXT[] NOT NULL DEFAULT '{}'::text[];
