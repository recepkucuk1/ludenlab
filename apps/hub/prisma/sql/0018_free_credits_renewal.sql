-- 0018_free_credits_renewal.sql
-- HEDEF DB: İKİ MODÜL (bu dosya iki ayrı bağlantıda çalıştırılır):
--   studio  → public."Therapist"  (Supabase kgbhvruzoaqwwwkhzdex)
--   atolye  → public."Account"    (Supabase uzkbuplwhnwizqflzban)
--
-- ÜCRETSİZ PLAN AYLIK YENİLEMESİ (2026-09-16 ürün kararı). Ücretsiz kullanıcının merkezi
-- aboneliği YOKTUR, dolayısıyla dönem kredisini yükleyen reconcile dalı ona hiç uğramıyor
-- ve hak yalnız kayıtta bir kez veriliyordu — oysa fiyat kartları "ayda 2 üretim hakkı"
-- diyor. Ücretli planların çıpası yerel `Subscription.lastCreditedPeriodEnd`; ücretsiz
-- planın abonelik satırı olmadığı için çıpa hesabın kendisinde tutulur.
--
-- NULL = "hiç yüklenmedi" → ilk render'da yüklenir. Mevcut kullanıcılar bu sayede bir
-- sonraki girişlerinde bu ayın hakkını alır (geriye dönük toplu yükleme GEREKMEZ).
--
-- Additive + idempotent; prisma migrate YOK — raw SQL (canlı proje).
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod (kod bu kolonu okur/yazar).

-- studio DB'de çalıştır:
ALTER TABLE public."Therapist" ADD COLUMN IF NOT EXISTS "freeCreditsRenewedAt" TIMESTAMP(3);

-- atolye DB'de çalıştır:
-- ALTER TABLE public."Account" ADD COLUMN IF NOT EXISTS "freeCreditsRenewedAt" TIMESTAMP(3);
