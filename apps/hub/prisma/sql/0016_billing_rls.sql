-- 0016 — Merkezi `billing` şemasında Row Level Security (2026-08 güvenlik denetimi #30)
--
-- SORUN: billing tablolarında (TCKN/VKN, adres, ödeme, abonelik) RLS KAPALI ve hiç politika
-- yoktu. Gerçek koruma bugün uygulama katmanındaki scoping; ama Supabase projesinde
-- `anon` / `authenticated` rolleri de mevcut. Bu şemaya yanlışlıkla bir GRANT verilmesi ya da
-- publishable/anon anahtarın sızması, kimlik ve ödeme verisini doğrudan okunur hale getirirdi.
--
-- ÖLÇÜM (varsayım değil): uygulama `postgres` rolüyle bağlanıyor ve bu rolde
-- `rolbypassrls = true`. Yani RLS açmak uygulama sorgularını ETKİLEMEZ — Prisma baypas eder.
-- (Bu doğrulanmadan açılsaydı tüm billing sorguları 0 satır dönerdi: site çöker.)
--
-- POLİTİKA YOK = DENY-ALL: RLS açık + politika tanımsız olan tabloda, baypas yetkisi
-- OLMAYAN her rol sıfır satır görür. Atölye DB'sindeki desenin merkezi karşılığı.
--
-- GERİ ALMA: ALTER TABLE billing."<tablo>" DISABLE ROW LEVEL SECURITY;

ALTER TABLE billing."Account"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing."BillingPlan"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing."BillingProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing."Payment"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing."PaymentIntent"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing."Subscription"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing."WebhookEvent"   ENABLE ROW LEVEL SECURITY;
