-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ApiUsageLog — Claude API teknik maliyet telemetrisi                    │
-- │                                                                         │
-- │ Her Claude çağrısı için token dağılımı ve USD maliyet kaydı. Kredi      │
-- │ sistemi (business) ile karıştırılmamalı — bu yalnızca mühendislik       │
-- │ gözlemlenebilirliği için. Admin panelinde aylık maliyet aggregation'ı  │
-- │ ve prompt değişikliklerinin maliyet etkisini ölçmek için kullanılır.   │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE "ApiUsageLog" (
    "id"               TEXT NOT NULL,
    "therapistId"      TEXT NOT NULL,
    "endpoint"         TEXT NOT NULL,
    "model"            TEXT NOT NULL,
    "inputTokens"      INTEGER NOT NULL DEFAULT 0,
    "outputTokens"     INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens"  INTEGER NOT NULL DEFAULT 0,
    "costUsd"          DECIMAL(10,6) NOT NULL,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApiUsageLog_therapistId_createdAt_idx" ON "ApiUsageLog"("therapistId", "createdAt");
CREATE INDEX "ApiUsageLog_createdAt_idx"              ON "ApiUsageLog"("createdAt");

ALTER TABLE "ApiUsageLog"
    ADD CONSTRAINT "ApiUsageLog_therapistId_fkey"
    FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (defense-in-depth; Prisma superuser bağlantısı bypass ediyor)
ALTER TABLE "ApiUsageLog" ENABLE ROW LEVEL SECURITY;
