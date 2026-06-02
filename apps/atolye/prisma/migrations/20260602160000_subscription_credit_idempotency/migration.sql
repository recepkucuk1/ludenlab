-- Kredi grant idempotency: callback (ilk ödeme) ile webhook (order.success) aynı
-- dönem için iki kez kredi yüklemesin. Dönem-sonu tarihini "kredilendi" işareti tutar.
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "lastCreditedPeriodEnd" TIMESTAMP(3);
