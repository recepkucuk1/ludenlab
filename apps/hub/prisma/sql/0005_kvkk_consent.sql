-- 0005_kvkk_consent.sql
-- HEDEF DB: billing şeması (HUB_DATABASE_URL — Studio Supabase, proje kgbhvruzoaqwwwkhzdex).
--
-- KVKK rızası: kayıt ekranındaki "Aydınlatma Metni'ni okudum, onaylıyorum" onay kutusu
-- işaretlenince billing."Account"."kvkkAcceptedAt" zaman damgası yazılır (ispatlanabilir rıza).
-- prisma/schema.prisma Account modeliyle BİREBİR (TIMESTAMP(3)).
-- ADDITIVE + IDEMPOTENT (nullable; mevcut hesaplar null kalır). prisma migrate YOK (bkz. 0001).

ALTER TABLE billing."Account" ADD COLUMN IF NOT EXISTS "kvkkAcceptedAt" TIMESTAMP(3);
