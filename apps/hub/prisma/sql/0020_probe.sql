-- 0020_probe.sql
-- HEDEF DB: studio → public."ProbeSeries", public."ProbeRun" (Supabase kgbhvruzoaqwwwkhzdex)
--
-- ÖLÇÜM PROBU (2026-11-04 tasarımı). Seri = öğrenci başına sabit kelime seti (ses × pozisyon × düzey);
-- koşu = tarihli ölçüm (doğru/yanlış/ipucu öğeleri + yüzde). Sağlık verisi değil (kelime listesi ve
-- sayılar); öğrenci/uzman silinince CASCADE.
--
-- Additive + idempotent; prisma migrate YOK — raw SQL (canlı proje).
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod.
--
-- RLS: uygulama `postgres` rolüyle (rolbypassrls) bağlanır; politika yok = anon için deny-all
-- (0016 ile aynı gerekçe). GERİ ALMA: DROP TABLE public."ProbeRun"; DROP TABLE public."ProbeSeries";

CREATE TABLE IF NOT EXISTS public."ProbeSeries" (
  "id"          TEXT PRIMARY KEY,
  "studentId"   TEXT NOT NULL,
  "therapistId" TEXT NOT NULL,
  "kind"        TEXT NOT NULL DEFAULT 'articulation',
  "sound"       TEXT NOT NULL,
  "position"    TEXT NOT NULL,
  "level"       TEXT NOT NULL DEFAULT 'word',
  "words"       JSONB NOT NULL,
  "active"      BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProbeSeries_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProbeSeries_therapistId_fkey"
    FOREIGN KEY ("therapistId") REFERENCES public."Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProbeSeries_studentId_active_idx"
  ON public."ProbeSeries" ("studentId", "active");
CREATE INDEX IF NOT EXISTS "ProbeSeries_therapistId_idx"
  ON public."ProbeSeries" ("therapistId");

CREATE TABLE IF NOT EXISTS public."ProbeRun" (
  "id"          TEXT PRIMARY KEY,
  "seriesId"    TEXT NOT NULL,
  "therapistId" TEXT NOT NULL,
  "date"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "items"       JSONB NOT NULL,
  "correct"     INTEGER NOT NULL,
  "total"       INTEGER NOT NULL,
  "pct"         INTEGER NOT NULL,
  "cuedCount"   INTEGER NOT NULL DEFAULT 0,
  "note"        VARCHAR(300),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProbeRun_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES public."ProbeSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProbeRun_therapistId_fkey"
    FOREIGN KEY ("therapistId") REFERENCES public."Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProbeRun_seriesId_date_idx"
  ON public."ProbeRun" ("seriesId", "date");
CREATE INDEX IF NOT EXISTS "ProbeRun_therapistId_idx"
  ON public."ProbeRun" ("therapistId");

ALTER TABLE public."ProbeSeries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProbeRun" ENABLE ROW LEVEL SECURITY;
