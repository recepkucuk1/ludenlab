-- 0019_student_observation.sql
-- HEDEF DB: studio → public."StudentObservation" (Supabase kgbhvruzoaqwwwkhzdex)
--
-- ÖĞRENCİ ASİSTANI GÖZLEM GÜNLÜĞÜ (2026-10-18 tasarımı). Uzmanın seans sonrası yazdığı
-- serbest gözlem; öğrencinin kalıcı hafızası. Bağlam katmanı son 5 kaydı her araca taşır.
-- Sağlık verisi: Student.notes ile aynı sınıf; öğrenci/uzman silinince CASCADE.
--
-- Additive + idempotent; prisma migrate YOK — raw SQL (canlı proje).
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod.
--
-- RLS: uygulama `postgres` rolüyle (rolbypassrls) bağlanır; politika yok = anon için deny-all
-- (0016 ile aynı gerekçe). GERİ ALMA: DROP TABLE public."StudentObservation";

CREATE TABLE IF NOT EXISTS public."StudentObservation" (
  "id"          TEXT PRIMARY KEY,
  "studentId"   TEXT NOT NULL,
  "therapistId" TEXT NOT NULL,
  "text"        TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentObservation_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudentObservation_therapistId_fkey"
    FOREIGN KEY ("therapistId") REFERENCES public."Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentObservation_studentId_createdAt_idx"
  ON public."StudentObservation" ("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "StudentObservation_therapistId_idx"
  ON public."StudentObservation" ("therapistId");

ALTER TABLE public."StudentObservation" ENABLE ROW LEVEL SECURITY;
