-- 0015_payment_retention.sql
-- HEDEF DB: billing şeması (HUB_DATABASE_URL — Studio Supabase, proje kgbhvruzoaqwwwkhzdex).
--
-- HESAP SİLME + FATURA SAKLAMA ÇATIŞMASI (2026-08 güvenlik denetimi #03).
--
-- Sorun: `Payment.accountId` CASCADE'di → hesabı silmek e-Arşiv/e-Fatura kayıtlarını da
-- siliyordu. Oysa VUK saklama yükümlülüğü bu kayıtların KALMASINI gerektirir; KVKK'nın
-- silme hakkı, yasal saklama yükümlülüğü karşısında geri adım atar.
--
-- Çözüm: fatura kaydı KALIR, kişiyle canlı bağı KOPAR.
--   · accountId nullable + ON DELETE SET NULL (hesap gidince kayıt öksüz kalır, silinmez)
--   · invoiceSnapshot: silme ANINDA fatura kimliği (ad/TCKN/VKN/adres/e-posta) buraya
--     kopyalanır — aksi hâlde kalan kayıt KİMLİKSİZ olurdu ve vergi açısından işe yaramazdı.
--     Yani bu alan bilinçli olarak kişisel veri taşır: dayanağı KVKK m.5/2-a (hukuki
--     yükümlülük), amacı yalnız faturalama; işletme sistemindeki diğer kopyalar silinir.
--
-- Additive + idempotent; prisma migrate YOK — raw SQL (canlı proje).
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod.

ALTER TABLE billing."Payment" ALTER COLUMN "accountId" DROP NOT NULL;
ALTER TABLE billing."Payment" ADD COLUMN IF NOT EXISTS "invoiceSnapshot" JSONB;

ALTER TABLE billing."Payment" DROP CONSTRAINT IF EXISTS "Payment_accountId_fkey";
ALTER TABLE billing."Payment" ADD CONSTRAINT "Payment_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES billing."Account"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;
