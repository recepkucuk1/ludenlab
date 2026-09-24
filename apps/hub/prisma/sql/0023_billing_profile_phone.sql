-- 0023_billing_profile_phone.sql
-- HEDEF DB: merkezi billing (Studio Supabase, `billing` şeması).
--
-- iyzico'ya SABİT TELEFON gidiyordu (2026-09 denetimi #24): checkout müşteri bilgisinde
-- `gsmNumber` herkes için "+905350000000" idi — gerçek bir aboneye ait olabilecek numara
-- ve sağlayıcının risk/iletişim kontrollerini anlamsızlaştıran bir değer. Artık fatura
-- profilinde cep telefonu toplanır; telefonu olmayan profil ödemeden önce tamamlatılır.
--
-- Additive + idempotent; prisma migrate YOK — raw SQL (canlı proje).
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod.

ALTER TABLE billing."BillingProfile" ADD COLUMN IF NOT EXISTS "phone" TEXT;
