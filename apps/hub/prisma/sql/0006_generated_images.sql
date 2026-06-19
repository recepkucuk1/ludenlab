-- 0006_generated_images.sql
-- HEDEF DB: STUDIO DB (proje kgbhvruzoaqwwwkhzdex, public şema) — STUDIO_DATABASE_URL.
-- (Card/Therapist/CreditTransaction ile AYNI yer; billing DEĞİL — bkz. 0004.)
-- Görsel üretim cache'i: kelime → üretilmiş görsel (GLOBAL, PII YOK). prisma/studio/schema.prisma
-- GeneratedImage modeliyle BİREBİR. prisma migrate / db push YOK — pg/MCP ile uygulanır (bkz. 0001).
-- ADDITIVE + IDEMPOTENT (CREATE ... IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS "GeneratedImage" (
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
  ON "GeneratedImage" ("cacheKey");

CREATE INDEX IF NOT EXISTS "GeneratedImage_wordNormalized_idx"
  ON "GeneratedImage" ("wordNormalized");

-- RLS: diğer tüm public Studio tablolarıyla tutarlı — anon/authenticated (supabase-js
-- veri-API'si) erişimini kapat. App `postgres` rolüyle bağlanır (rolbypassrls) → ETKİLENMEZ.
-- Global cache, PII yok; politika yok = anon için deny-all. Görseller zaten public storage
-- bucket'ından servis edilir (bu tablo yalnız app tarafından okunur).
ALTER TABLE "GeneratedImage" ENABLE ROW LEVEL SECURITY;
