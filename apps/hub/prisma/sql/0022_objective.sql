-- 0022_objective.sql
-- HEDEF DB: studio → public."StudentProgress" (üç sütun)
--
-- HEDEF DENETÇİSİ 1c-B (2026-11-05 tasarımı §5.2). MEB müfredat hedefinin altında uzmanın yazdığı kısa dönem hedef
-- (objective, ≤600 karakter) + son denetim sonucu (objectiveAudit: DenetimSonucu JSON, gerçek adla) + tarihi.
-- PUT'ta metin değişirse denetim sunucuda sıfırlanır (bayat denetim gösterilmez).
--
-- Additive + idempotent; prisma migrate YOK — raw SQL. db push KULLANMA.
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod (kod önce giderse progress GET'i `objective` seçerken 500 verir).
-- RLS: tablo zaten kapsamda (0016); politika değişmez. İndeks gerekmez (öğrenci+hedef tekil anahtarıyla okunur).
-- GERİ ALMA: ALTER TABLE public."StudentProgress" DROP COLUMN "objectiveAuditedAt", DROP COLUMN "objectiveAudit", DROP COLUMN "objective";

ALTER TABLE public."StudentProgress" ADD COLUMN IF NOT EXISTS "objective" TEXT;
ALTER TABLE public."StudentProgress" ADD COLUMN IF NOT EXISTS "objectiveAudit" JSONB;
ALTER TABLE public."StudentProgress" ADD COLUMN IF NOT EXISTS "objectiveAuditedAt" TIMESTAMP(3);
