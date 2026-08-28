-- 0014_llm_alias.sql
-- HEDEF DB: İKİ MODÜL (bu dosya iki ayrı bağlantıda çalıştırılır):
--   studio  → public."Student"  (Supabase kgbhvruzoaqwwwkhzdex)
--   atolye  → public."Case"     (Supabase uzkbuplwhnwizqflzban)
--
-- ÇOCUK PII TAKMA-ADI (2026-08 güvenlik denetimi #09): gerçek ad artık LLM sağlayıcısına
-- (Anthropic/OpenAI/fal) GİTMEZ. Yerine çocuk başına SABİT bir rumuz gider; dönen metinde
-- rumuz gerçek adla değiştirilir. Terapist her zaman gerçek adı görür, eşleme yalnız bizde.
--
-- Rumuz DB'de tutulur ki üretimler arasında tutarlı olsun (kümülatif dersler) ve havuzdan
-- yeniden seçim gerekmesin. İlk kullanımda atanır (lazy), sonra değişmez.
--
-- Additive + idempotent; prisma migrate YOK — raw SQL (canlı proje).
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod (kod bu kolonu okur/yazar).

-- studio DB'de çalıştır:
ALTER TABLE public."Student" ADD COLUMN IF NOT EXISTS "llmAlias" TEXT;

-- atolye DB'de çalıştır:
-- ALTER TABLE public."Case" ADD COLUMN IF NOT EXISTS "llmAlias" TEXT;
