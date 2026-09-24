-- 0021_sales_consent.sql
-- HEDEF DB: merkezi billing (Studio Supabase, `billing` şeması).
--
-- MESAFELİ SATIŞ ONAY KAYDI (2026-09 denetimi). Checkout'ta onay yalnız "ödemeye devam
-- ederek kabul edersiniz" metniydi (browsewrap); kullanıcının hangi sözleşme sürümünü ne
-- zaman onayladığı ve Koşullar §6'nın öngördüğü "dijital içeriğin ifasına önceden onay"
-- (cayma hakkının sona ermesi) hiç kaydedilmiyordu — ispat yükü satıcıdadır.
-- Artık tahsilata giden her yol (yeni checkout, anında yükseltme) açık onay kutusu ister
-- ve bu tabloya bir satır yazar.
--
-- Hesap silinince satır SİLİNMEZ (ispat kaydı), accountId NULL'a düşer — Payment deseni.
-- ip: onayın ispatı için; kişisel veri — dayanak KVKK m.5/2-ç/e (hukuki yükümlülük/hakkın tesisi).
--
-- Additive + idempotent; prisma migrate YOK — raw SQL (canlı proje).
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod (checkout bu tabloya yazamazsa ödeme formu açılmaz).

CREATE TABLE IF NOT EXISTS billing."SalesConsent" (
  "id"            TEXT PRIMARY KEY,
  "accountId"     TEXT REFERENCES billing."Account"("id") ON DELETE SET NULL,
  "billingPlanId" TEXT,
  "kind"          TEXT NOT NULL,          -- CHECKOUT | UPGRADE
  "version"       TEXT NOT NULL,          -- lib/salesConsent.ts SALES_CONSENT_VERSION
  "checkoutToken" TEXT,                   -- CHECKOUT: iyzico form token'ı (PaymentIntent ile eşleşir)
  "ip"            TEXT,
  "acceptedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SalesConsent_accountId_idx" ON billing."SalesConsent" ("accountId");

-- 0016 deseni: politika yok = baypas yetkisi olmayan roller için deny-all.
ALTER TABLE billing."SalesConsent" ENABLE ROW LEVEL SECURITY;
