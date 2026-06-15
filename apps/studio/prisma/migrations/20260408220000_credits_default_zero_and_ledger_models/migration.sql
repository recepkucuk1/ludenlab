-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Pre-iyzico hardening migration                                          │
-- │                                                                         │
-- │ 1. Therapist.credits default 40 → 0                                     │
-- │    Register route explicit olarak grantCredits() çağırıyor, bu sayede   │
-- │    CreditTransaction ledger'ı ile Therapist.credits bakiyesi her zaman  │
-- │    senkron kalacak. (Eski default kredileri ledger'sız yaratıyordu.)    │
-- │                                                                         │
-- │ 2. AuditLog modeli                                                      │
-- │    Admin eylemleri, plan/kredi/rol değişiklikleri, ödeme webhook'ları   │
-- │    için denetim kaydı. Uyuşmazlık ve regülasyon sorguları için kritik.  │
-- │                                                                         │
-- │ 3. WebhookDelivery modeli                                                │
-- │    Ödeme sağlayıcı webhook idempotency store'u. iyzico retry yapınca    │
-- │    aynı olayın iki kere işlenmesini önler.                              │
-- └─────────────────────────────────────────────────────────────────────────┘

-- 1. Therapist.credits default'u 0'a çek
ALTER TABLE "Therapist" ALTER COLUMN "credits" SET DEFAULT 0;

-- 2. AuditLog
CREATE TABLE "AuditLog" (
    "id"         TEXT NOT NULL,
    "actorId"    TEXT,
    "action"     TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId"   TEXT NOT NULL,
    "diff"       JSONB,
    "ip"         TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
CREATE INDEX "AuditLog_actorId_idx"             ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_createdAt_idx"           ON "AuditLog"("createdAt");

-- RLS (defense-in-depth; Prisma superuser bağlantısı zaten bypass ediyor)
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- 3. WebhookDelivery
CREATE TABLE "WebhookDelivery" (
    "id"          TEXT NOT NULL,
    "provider"    TEXT NOT NULL,
    "externalId"  TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'received',
    "attempts"    INTEGER NOT NULL DEFAULT 1,
    "payload"     JSONB NOT NULL,
    "error"       TEXT,
    "receivedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookDelivery_provider_externalId_key" ON "WebhookDelivery"("provider", "externalId");
CREATE INDEX        "WebhookDelivery_status_idx"              ON "WebhookDelivery"("status");
CREATE INDEX        "WebhookDelivery_receivedAt_idx"          ON "WebhookDelivery"("receivedAt");

ALTER TABLE "WebhookDelivery" ENABLE ROW LEVEL SECURITY;
