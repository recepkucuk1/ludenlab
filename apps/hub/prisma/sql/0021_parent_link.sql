-- 0021_parent_link.sql
-- HEDEF DB: studio → public."ParentLink" (yeni) + public."StudentObservation" (iki sütun)
--
-- VELİ GERİ BİLDİRİM BAĞLANTISI (2026-11-05 tasarımı). Uzman çocuk başına sürekli bir bağlantı üretir;
-- veli hesapsız yanıtlar; yanıt StudentObservation'a source='parent' + meta ile yazılır.
-- Token DÜZ saklanır (bağlantı süresiz, modal QR'ı yeniden gösterir; token yalnız rumuzlu bir forma yanıt
-- yazma hakkı verir, okuma hakkı vermez).
--
-- Additive + idempotent; prisma migrate YOK — raw SQL. db push KULLANMA (kısmi tekil indeks Prisma'da yok).
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod (kod önce giderse gözlem GET'i `source` seçerken 500 verir).
-- RLS: uygulama `postgres` rolüyle bağlanır (rolbypassrls); politika yok = anon deny-all (0016 gerekçesi).
-- GERİ ALMA: DROP TABLE public."ParentLink"; ALTER TABLE public."StudentObservation" DROP COLUMN "meta", DROP COLUMN "source";

CREATE TABLE IF NOT EXISTS public."ParentLink" (
  "id"             TEXT PRIMARY KEY,
  "studentId"      TEXT NOT NULL,
  "therapistId"    TEXT NOT NULL,
  "token"          TEXT NOT NULL,
  "active"         BOOLEAN NOT NULL DEFAULT TRUE,
  "answerCount"    INTEGER NOT NULL DEFAULT 0,
  "lastAnsweredAt" TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt"      TIMESTAMP(3),
  CONSTRAINT "ParentLink_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ParentLink_therapistId_fkey"
    FOREIGN KEY ("therapistId") REFERENCES public."Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ParentLink_token_key"
  ON public."ParentLink" ("token");
CREATE INDEX IF NOT EXISTS "ParentLink_studentId_active_idx"
  ON public."ParentLink" ("studentId", "active");
CREATE INDEX IF NOT EXISTS "ParentLink_therapistId_idx"
  ON public."ParentLink" ("therapistId");
-- Öğrenci başına tek AKTİF bağlantı: yenileme = pasifleştir + oluştur (tek transaction); eşzamanlı çift gönderim → P2002 → 409.
CREATE UNIQUE INDEX IF NOT EXISTS "ParentLink_student_active_uidx"
  ON public."ParentLink" ("studentId")
  WHERE "active";

ALTER TABLE public."ParentLink" ENABLE ROW LEVEL SECURITY;

-- Gözlem kaynağı: 'therapist' (varsayılan, mevcut satırlar) | 'parent'. meta: { days, easy[], hard[] } yalnız parent'ta.
ALTER TABLE public."StudentObservation" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'therapist';
ALTER TABLE public."StudentObservation" ADD COLUMN IF NOT EXISTS "meta" JSONB;
CREATE INDEX IF NOT EXISTS "StudentObservation_studentId_source_createdAt_idx"
  ON public."StudentObservation" ("studentId", "source", "createdAt");
