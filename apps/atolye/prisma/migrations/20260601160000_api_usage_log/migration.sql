-- Faz 2b — AI kullanım/maliyet kaydı (admin gözlem). ADDITIVE & idempotent.
CREATE TABLE IF NOT EXISTS "ApiUsageLog" (
  "id"              TEXT NOT NULL,
  "accountId"       TEXT,
  "model"           TEXT NOT NULL,
  "inputTokens"     INTEGER NOT NULL DEFAULT 0,
  "outputTokens"    INTEGER NOT NULL DEFAULT 0,
  "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
  "costUsd"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "credits"         INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiUsageLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ApiUsageLog_createdAt_idx" ON "ApiUsageLog" ("createdAt");
CREATE INDEX IF NOT EXISTS "ApiUsageLog_accountId_createdAt_idx" ON "ApiUsageLog" ("accountId", "createdAt");
