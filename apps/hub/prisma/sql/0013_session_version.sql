-- 0013_session_version.sql
-- HEDEF DB: billing şeması (HUB_DATABASE_URL — Studio Supabase, proje kgbhvruzoaqwwwkhzdex).
--
-- OTURUM İPTALİ (2026-08 güvenlik denetimi #06): şifre değişikliği/sıfırlaması mevcut JWT
-- oturumlarını geçersiz kılmıyordu — strategy "jwt" olduğu için imzalı token DB'ye hiç
-- danışmadan ~30 gün geçerli kalıyor ve aktif kullanımda yenileniyordu. Sonuç: ele geçirilmiş
-- bir oturum, kurban şifresini değiştirse bile erişimini koruyordu (hesap kurtarma işe yaramaz).
--
-- Çözüm: monotonik `sessionVersion`. Token bu değeri taşır; merkezi auth() her istekte DB ile
-- karşılaştırır, uyuşmazsa oturum düşer. Şifre değişikliği/sıfırlaması değeri +1 artırır →
-- o hesabın TÜM eski oturumları anında geçersiz olur.
--
-- Additive + idempotent; prisma migrate / db push YOK — raw SQL (canlı proje).
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod (kod bu kolonu okur).

ALTER TABLE billing."Account"
  ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
