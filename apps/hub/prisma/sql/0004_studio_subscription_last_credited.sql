-- 0004_studio_subscription_last_credited.sql
-- DİKKAT — HEDEF DB: STUDIO DB (proje kgbhvruzoaqwwwkhzdex, public şema).
-- 0001/0002 billing DB'sine, 0003 atölye DB'sine gider; BU dosya STUDIO_DATABASE_URL'e uygulanır.
--
-- Yenileme-kredisi idempotency çıpası: Subscription'a lastCreditedPeriodEnd kolonu.
-- Modül-tarafı reconcile, dönem yenilemesinde krediyi atomik "claim" ile bir kez yükler
-- (atolye Subscription'da bu kolon zaten vardı; studio'ya bununla eşitlendi).
-- ADDITIVE + IDEMPOTENT (nullable; mevcut satırlar etkilenmez). prisma migrate YOK (bkz. 0001).

ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "lastCreditedPeriodEnd" TIMESTAMP(3);
