-- 0020_pending_plan_applies_at.sql
-- HEDEF DB: merkezi billing (Studio Supabase, `billing` şeması).
--
-- ZAMANLANMIŞ DÜŞÜRME ERKEN UYGULANIYORDU (2026-09 denetimi). iyzico abonelik v2 plan
-- değişikliğini yalnız "NOW" ile kabul ediyor; sweep bu yüzden değişikliği dönem sonuna
-- ~36 saat kala iyzico'ya iletip yerel `billingPlanId`'yi de AYNI ANDA düşürüyordu →
-- kullanıcı, kendisine gösterilen tarihten önce üst plan erişimini kaybediyordu.
--
-- Artık iki adım: sağlayıcıya iletildiğinde bu kolona ORİJİNAL dönem sonu yazılır (yerel
-- plan değişmez); sweep bu tarih geçince yerel planı uygular. Kolon doluysa değişiklik
-- sağlayıcıya iletilmiş demektir → "vazgeç" artık mümkün değildir.
--
-- Additive + idempotent; prisma migrate YOK — raw SQL (canlı proje).
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod (kod bu kolonu okur/yazar).

ALTER TABLE billing."Subscription" ADD COLUMN IF NOT EXISTS "pendingPlanAppliesAt" TIMESTAMP(3);
