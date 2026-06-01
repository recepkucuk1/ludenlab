-- Faz 3 — Tekrar eden seans occurrence override/iptal. ADDITIVE & idempotent.
CREATE TABLE IF NOT EXISTS "SessionException" (
  "id"           TEXT NOT NULL,
  "sessionId"    TEXT NOT NULL,
  "originalDate" DATE NOT NULL,
  "title"        TEXT,
  "startTime"    TEXT,
  "endTime"      TEXT,
  "status"       TEXT,
  "note"         TEXT,
  CONSTRAINT "SessionException_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SessionException_sessionId_originalDate_key"
  ON "SessionException" ("sessionId", "originalDate");
CREATE INDEX IF NOT EXISTS "SessionException_sessionId_idx" ON "SessionException" ("sessionId");

-- FK (idempotent: zaten varsa yut)
DO $$ BEGIN
  ALTER TABLE "SessionException"
    ADD CONSTRAINT "SessionException_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
