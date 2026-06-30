-- 0009_pending_plan.sql
-- HEDEF DB: billing şeması (HUB_DATABASE_URL — Studio Supabase, proje kgbhvruzoaqwwwkhzdex).
--
-- Zamanlanmış plan değişimi (DOWNGRADE). Kullanıcı ACTIVE aboneliğinde daha düşük plana
-- geçerse ödeme ekranı GELMEZ; bunun yerine pendingBillingPlanId yazılır. Yenileme cron'u
-- gelecek dönemde bu planı uygular (o fiyattan çeker + billingPlanId'yi pending yapar + temizler).
-- Kullanıcı dönem sonuna kadar mevcut (yüksek) planını korur. IDEMPOTENT. prisma migrate YOK.

ALTER TABLE billing."Subscription" ADD COLUMN IF NOT EXISTS "pendingBillingPlanId" TEXT;
