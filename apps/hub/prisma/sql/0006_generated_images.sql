-- 0006_generated_images.sql
-- HEDEF DB: billing şeması (HUB_DATABASE_URL — Studio Supabase, proje kgbhvruzoaqwwwkhzdex).
-- Görsel üretim cache'i: kelime → üretilmiş görsel (GLOBAL, PII YOK). prisma/schema.prisma
-- GeneratedImage modeliyle BİREBİR. prisma migrate / db push YOK — pg/MCP ile uygulanır (bkz. 0001).
-- ADDITIVE + IDEMPOTENT (CREATE ... IF NOT EXISTS). public şemasına DOKUNMAZ.

CREATE TABLE IF NOT EXISTS billing."GeneratedImage" (
  "id"             TEXT PRIMARY KEY,
  "cacheKey"       TEXT NOT NULL,
  "wordNormalized" TEXT NOT NULL,
  "styleVersion"   TEXT NOT NULL,
  "model"          TEXT NOT NULL,
  "prompt"         TEXT NOT NULL,
  "storagePath"    TEXT NOT NULL,
  "publicUrl"      TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "GeneratedImage_cacheKey_key"
  ON billing."GeneratedImage" ("cacheKey");

CREATE INDEX IF NOT EXISTS "GeneratedImage_wordNormalized_idx"
  ON billing."GeneratedImage" ("wordNormalized");
