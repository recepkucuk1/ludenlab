-- Supabase advisor `WebhookDelivery` ve `AuditLog` tablolarında RLS'nin
-- kapalı olduğunu raporladı. Tablolar `20260408220000` migration'ında RLS
-- enable edilerek yaratılmıştı; muhtemelen prod'a `prisma db push` ile
-- alındılar — `db push` migration .sql dosyasındaki raw ALTER TABLE
-- statement'larını çalıştırmaz, sadece schema.prisma'yı diff'ler. Aynı
-- senaryo `ApiUsageLog` için de geçerli olabilir.
--
-- Defense-in-depth idempotent re-apply: eski 13 tablo da dahil. Prisma
-- superuser bağlantısı RLS'yi bypass ettiği için uygulamayı etkilemez;
-- yalnızca anon/authenticated rolleri için (PostgREST yolu) default-deny
-- davranışı sağlar.

ALTER TABLE "Therapist"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plan"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditTransaction"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Card"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CardAssignment"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Curriculum"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CurriculumGoal"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lesson"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonException"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentProgress"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookDelivery"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiUsageLog"         ENABLE ROW LEVEL SECURITY;
