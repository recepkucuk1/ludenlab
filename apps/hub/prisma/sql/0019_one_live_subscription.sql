-- 0019_one_live_subscription.sql
-- HEDEF DB: merkezi billing (Studio Supabase, `billing` şeması).
--
-- HESAP × MODÜL BAŞINA EN FAZLA BİR CANLI iyzico ABONELİĞİ (2026-09 denetimi).
-- İki sekmede açılan iki checkout formu (ya da geri tuşu + tekrar ödeme) ikisi de
-- ödenirse iki ayrı iyzico aboneliği oluşuyor ve müşteriden her dönem İKİ kez çekim
-- yapılıyordu; şemada bunu engelleyen hiçbir kısıt yoktu. Uygulama tarafı
-- (lib/checkoutProvision.ts) ikinci ödemeyi yakalayıp iyzico'da iptal eder; bu indeks
-- eşzamanlı iki callback'in ikisinin de "canlı abonelik yok" görüp yazdığı yarışı DB'de
-- keser (kaybeden P2002 alır → aynı iptal yoluna düşer).
--
-- Kapsam yalnız sağlayıcı ref'li ACTIVE/PAST_DUE satırlar: ref'siz (elle/geçmiş) kayıtlar
-- ve CANCELED/EXPIRED geçmişi etkilenmez.
--
-- Additive + idempotent; prisma migrate YOK — raw SQL (canlı proje). Prisma şeması kısmi
-- indeksi ifade edemez; kaynak bu dosyadır.
-- DEPLOY SIRASI: kod ile SQL bağımsız (kod indeks olmadan da ikinci aboneliği yakalar).
--
-- ÖN KONTROL — indeks kurulamazsa mevcut çiftler vardır; önce bunları elle çözün
-- (fazlasını iyzico'da iptal edip CANCELED yapın), sonra bu dosyayı tekrar çalıştırın:
--
--   SELECT "accountId", module, count(*)
--     FROM billing."Subscription"
--    WHERE status IN ('ACTIVE', 'PAST_DUE') AND "iyzicoSubscriptionRef" IS NOT NULL
--    GROUP BY 1, 2
--   HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_one_live_per_account_module"
  ON billing."Subscription" ("accountId", module)
  WHERE status IN ('ACTIVE', 'PAST_DUE') AND "iyzicoSubscriptionRef" IS NOT NULL;
