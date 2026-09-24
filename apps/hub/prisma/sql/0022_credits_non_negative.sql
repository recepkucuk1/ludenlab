-- 0022_credits_non_negative.sql
-- HEDEF DB: İKİ MODÜL (bu dosya iki ayrı bağlantıda çalıştırılır — 0018 deseni):
--   studio  → public."Therapist"
--   atolye  → public."Account"
--
-- BAKİYE ASLA EKSİYE İNEMEZ (2026-09 denetimi #21). Uygulama düşümleri koşullu UPDATE ile
-- yapıyor, ama admin geri alımı eskiden oku→azalt idi ve bakiyeyi eksiye indirebiliyordu.
-- Şemada bunu engelleyen kısıt yoktu. Kısıt son savunma hattıdır: bir kod yolu yine
-- hatalı düşüm yaparsa işlem REDDEDİLİR, sessizce eksi bakiye oluşmaz.
--
-- NOT VALID: mevcut satırlar kontrol EDİLMEZ (canlıda eksi bakiye varsa kurulum patlamasın);
-- yeni yazımlar kontrol edilir. Önce aşağıdaki sorguyla eksi bakiyeleri düzeltin, ardından
-- VALIDATE satırını çalıştırın.
--   studio:  SELECT id, credits FROM public."Therapist" WHERE credits < 0;
--   atolye:  SELECT id, credits FROM public."Account"   WHERE credits < 0;
--
-- Additive; prisma migrate YOK — raw SQL (canlı proje).

-- studio DB'de çalıştır:
DO $$ BEGIN
  ALTER TABLE public."Therapist" ADD CONSTRAINT "Therapist_credits_non_negative" CHECK (credits >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- ALTER TABLE public."Therapist" VALIDATE CONSTRAINT "Therapist_credits_non_negative";

-- atolye DB'de çalıştır:
-- DO $$ BEGIN
--   ALTER TABLE public."Account" ADD CONSTRAINT "Account_credits_non_negative" CHECK (credits >= 0) NOT VALID;
-- EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- ALTER TABLE public."Account" VALIDATE CONSTRAINT "Account_credits_non_negative";
