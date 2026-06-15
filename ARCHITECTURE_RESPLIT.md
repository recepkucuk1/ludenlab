# LudenLab — Mimari Yeniden Yapılandırma (Re-Split) · Spec & Runbook

> **Karar:** Tek-merchant + subdomain + apex-router modeli terk ediliyor. Yerine:
> **(1)** BRY Takip merkezden tamamen ÇIKAR → `brytakip.com`'da kendi iyzico merchant'ıyla
> standalone. **(2)** Studio + Atölye TEK Next.js app'te birleşir → `ludenlab.com/studio` +
> `ludenlab.com/atolye` (subdomain YOK), **tek üyelik** (`Account`) + **yeni tek iyzico
> merchant** + modül-bazlı aylık abonelik.
>
> **Durum:** Spec onaylandı (2026-06-15). Sıradaki: Track 1 (BRY) detaylı uygulama planı.
> **Ölçek/risk:** Studio+Atölye'de ~0 gerçek recurring ödeyen (çoğu test/comp; 6 comp Studio
> müşterisi) → **düşük-riskli re-platform**, zero-downtime/bakım penceresi gerekmez.

---

## 0. TL;DR

| | Eski (apex-billing, `BILLING_CUTOVER.md`) | Yeni (bu doküman) |
|---|---|---|
| Domain modeli | apex + subdomain (`studio.`/`atolye.`/`brytakip.ludenlab.com`) | tek origin `ludenlab.com` + path (`/studio`, `/atolye`); BRY ayrı domain `brytakip.com` |
| App sayısı | 3 ayrı Next app (hub/studio/atolye) + 1 Fastify (bry) | **1 birleşik Next app** (hub büyür) + 1 Fastify (bry, ayrı) |
| iyzico | tek merchant, 3 modül, apex webhook router | **2 merchant:** ludenlab (studio+atolye) · brytakip (kendi) |
| Üyelik | merkezi `Account` + modül auth + e-posta bridge + (planlı) SSO token | **tek `Account`, tek next-auth, tek çerez** (bridge/SSO token GEREKSİZ) |
| BRY | merkeze bağlı modül (BRYTAKIP enum) | **tamamen bağımsız** ürün |

**Neden bu basitleştirme işe yarıyor:** Tek origin olunca cross-subdomain çerez, e-posta token
handoff (`BILLING_CUTOVER §13`), ve flag'li `central-billing` köprülerinin **hepsi
gereksizleşiyor** — aynı app, aynı `Account`, doğrudan entitlement okuma.

---

## 1. Neden (trigger) + bu doküman neyi günceller

- `BILLING_CUTOVER.md` per-subdomain modeli iyzico tarafından reddedilince apex-consolidation'a
  gitmişti (tek merchant, apex router). O iş büyük ölçüde tamamlandı (sandbox e2e ✓, prod cutover).
- **Yeni iş kararı:** BRY Takip ayrı bir ürün/iş olarak `brytakip.com`'da kendi başına yürüyecek;
  Studio + Atölye ise tek çatı altında (LudenLab) **tek üyelik + modül-bazlı abonelik** ile
  birleşecek, ama **subdomain olmadan** — `ludenlab.com/studio` ve `ludenlab.com/atolye`.
- Bu, iyzico'nun "tek iş = tek apex domain" kuralına **daha uyumlu**: ludenlab.com tek iş
  (studio+atolye), brytakip.com ayrı iş.

**Supersede / güncelleme ilişkisi:**
- `ROADMAP.md` Faz 4/5 (subdomain + tek-merchant konsolidasyon) → **bu dokümanla değişti.**
- `BILLING_CUTOVER.md` §2 hedef mimari (subdomain'li apex), §13 SSO token → **iptal** (tek origin).
- `F4_BRY_CUTOVER.md` (`brytakip.ludenlab.com`) → **tersine çevriliyor** (Track 1: BRY → brytakip.com).
- `WebhookEvent` idempotency, `Account`/`Subscription`/`BillingPlan` şeması, apex checkout/webhook
  kodu, `@ludenlab/billing` SDK → **korunuyor / yeniden kullanılıyor.**

---

## 2. Kilitli kararlar

1. **Tek app birleştirme.** Studio (terapimat) monorepo'ya taşınır; hub büyür ve `/`, `/studio/*`,
   `/atolye/*` route segment'lerini tek Node process'te sunar. Subdomain yok, proxy yok.
2. **Tek üyelik = Hub `Account`.** Tek next-auth, tek oturum çerezi (tek origin). Modül auth'ları,
   e-posta bridge, SSO token handoff emekli.
3. **Veri sınırları korunur (ROADMAP kilitli kararı):**
   - Kimlik + billing → merkezi `billing` şeması (şu an Studio Supabase içinde; kalabilir).
   - Studio domain verisi → Studio Supabase `public`.
   - **Atölye klinik verisi → AYRI Supabase + RLS, DOKUNULMAZ.**
   - Birleşik app çoklu Prisma client ile her DB'yi ayrı okur.
4. **Hafif kimlik göçü.** Modül user tabloları (`Therapist`, atölye `Account`) yerinde kalır;
   e-posta ile merkezi `Account`'a bağlanır. FK remap YOK. Şifre hash uyumluysa taşınır, değilse
   tek seferlik şifre-belirleme daveti.
5. **2 iyzico merchant.** ludenlab (studio+atolye, **yeni**) · brytakip (**kendi mevcut**). Eski
   sızmış konsolide merchant emekli; tüm sızan secret'lar rotate.
6. **BRY tamamen bağımsız.** `BillingModule.BRYTAKIP` ve tüm BRY-merkez kuplajı kaldırılır.
7. **Hosting Hostinger.** Edge middleware yok → entitlement guard server-component/route-handler'da.
   Birleşik app `output: standalone`, `outputFileTracingRoot` monorepo köküne.

---

## 3. Hedef mimari (birleşik app)

```
                         ┌──────────── ludenlab.com  (TEK Next app — hub büyümüş) ────────────┐
  kullanıcı ──(kayıt/giriş)──▶ tek Account / next-auth (tek çerez, tek origin)                 │
                         │                                                                       │
   /                     │  vitrin + giriş/kayıt + HESAP & ABONELİK paneli + modül launcher      │
   /studio/*             │  Studio (DKT araçları)   → Studio Supabase `public` (Prisma client A) │
   /atolye/*             │  Atölye (ÖÖB araçları)   → Atölye Supabase + RLS  (Prisma client B)   │
   /odeme, /odeme/sonuc  │  checkout (yeni merchant SDK)                                          │
   /api/iyzico/webhook   │  tek webhook ucu → merkezi Subscription (Prisma client C: billing)    │
                         └───────────────────────────────────────────────────────────────────────┘
                                   entitlement: merkezi Subscription'dan DOĞRUDAN (flag/bridge yok)

   ════════════════════════════════  AYRI ÜRÜN  ════════════════════════════════
   brytakip.com  (Fastify + MySQL — brytakip-api, standalone)
     /api/subscription/checkout → KENDİ iyzico merchant'ı (in-app form)
     /api/webhooks/iyzico       → KENDİ merchant webhook'u
     /api/license/verify        → Tauri desktop app (API base = brytakip.com)
```

**Prisma client topolojisi (birleşik app):**
- `billingDb` → merkezi `billing` şeması (Account/Subscription/BillingPlan/WebhookEvent)
- `studioDb` → Studio Supabase `public` (Therapist/Student/Card/Lesson/...)
- `atolyeDb` → Atölye Supabase (Case/GeneratedDocument/Session/... + RLS via `withRls`)

**Modül kullanıcı çözümleme:** Oturum merkezi `Account` (e-posta) taşır → modül sayfası kendi
user kaydını (Studio `Therapist` / atölye `Account`) e-posta ile çözer. (Mevcut bridge deseni;
artık aynı app içinde, ağ çağrısı yok.)

---

## 4. İki track

- **Track 1 — BRY çıkarma** (`brytakip.com`, kendi iyzico): bağımsız, düşük risk, ~%90 hazır
  (`CENTRAL_BILLING` flag zaten kapalı). **ÖNCE.**
- **Track 2 — Studio+Atölye birleşik app**: asıl mühendislik. S2 (iki app'i tek app'te birleştirme)
  en yüksek riskli adım. **SONRA.**

Sıralama gerekçesi: Track 1 BRY'yi merkezden düşürür → Track 2'ye girmeden önce taşınacak modül
sayısını azaltır + canlı BRY install'larını erkenden güvenli domaine taşır.

---

## 5. TRACK 1 — BRY → brytakip.com (kendi iyzico'su)

| Faz | İş | Kim | Risk |
|---|---|---|---|
| **B1** | `brytakip-api` sertleştir: `CENTRAL_BILLING` kapalı teyit; hardcoded `brytakip.ludenlab.com`→`brytakip.com` (`src/server.ts` CORS, `src/lib/mailer.ts`, `src/routes/license.ts` mesajları) + `BRYTAKIP_WEB_URL` env; kendi iyzico merchant key'leri (prod) + `IYZICO_PRICING_PLAN_REF` doğrula | ben | düşük |
| **B2** | Tauri repoint (luden-bkds): API base + checkout link → `brytakip.com`; imzalı yeni release (macOS+Windows); `latest.json` updater zinciri doğrula | ben (kod) + sen (release/secrets) | orta |
| **B3** | iyzico paneli: BRY merchant webhook URL → `https://brytakip.com/api/webhooks/iyzico`; checkout callback/return ref'leri brytakip.com | sen | düşük |
| **B4** | Hostinger: `brytakip.com` → `brytakip.ludenlab.com` 301'ini KALDIR (brytakip.com Node app'i primary'ye geri al); `brytakip.ludenlab.com` → 301 → `brytakip.com`; lisans verify e2e (eski install'lar dahil) | sen | orta |
| **B5** | Merkezden BRYTAKIP düş: hub `BillingModule` enum, `bootstrap-iyzico.mjs`, `createWebhookRouter` fan-out, `moduleReturnUrl`, `migrate-subscriptions.mjs`, `set-prod-plan-refs.mjs`'ten BRYTAKIP temizliği; eski merchant'taki BRY plan(lar)ı emekli | ben | düşük |

**Track 1 done-tanımı:** brytakip.com kendi merchant'ıyla tam standalone (signup→checkout→callback→
license→Tauri verify); merkezde BRYTAKIP referansı kalmadı; `brytakip.ludenlab.com` 301.

---

## 6. TRACK 2 — Studio + Atölye birleşik app

| Faz | İş | Kim | Risk |
|---|---|---|---|
| **S0** | Yeni iyzico merchant (prod) + sandbox merchant aç (studio+atolye için). Eski konsolide merchant'ı emekliye yaz | sen | düşük |
| **S1** | Studio'yu monorepo'ya taşı (`apps/studio`): npm→pnpm, `@ludenlab/{ui,ai,billing,config}` wiring, `output: standalone` + `outputFileTracingRoot`, build/lint/typecheck yeşil. **Davranış değişmez** (hâlâ ayrı app olarak çalışır) — saf taşıma, izole doğrulama | ben | orta |
| **S2** | **Birleşik app shell (işin kalbi):** hub'ı büyüt → `app/(hub)/` (`/`, hesap, abonelik, launcher), `app/studio/*` (terapimat'tan), `app/atolye/*` (apps/atolye'den). Tek next-auth (`Account`); `studioDb`/`atolyeDb`/`billingDb` çoklu Prisma client; route çakışmalarını path prefix ile çöz (`/studio/giris` vs `/giris` vb.); modül sayfaları user'ı e-posta ile çözer; ortak `AppShell` + modül switcher; AI tool API route'ları `/studio/api/*` & `/atolye/api/*` altına | ben | **yüksek** |
| **S3** | Billing yeni merchant'a: hub checkout/webhook'u yeni key'lere repoint; `bootstrap-iyzico.mjs` ile STUDIO+ATOLYE ürün/plan kur (sandbox→prod); hesap panelinden modül-bazlı aylık abonelik (modül seç → `/odeme`); entitlement merkezi `Subscription`'dan DOĞRUDAN (flag/bridge emekli) | ben + sen (key) | orta |
| **S4** | Hafif kimlik göçü: her Studio `Therapist` + atölye `Account` → e-posta ile merkezi `Account` upsert (hash uyumluysa taşı, değilse şifre-belirleme daveti); 6 comp Studio müşterisine merkezde elle ACTIVE PRO grant (iyzico'suz). Dry-run → say doğrula → apply | ben | düşük |
| **S5** | **Deploy + cutover:** birleşik standalone app `ludenlab.com` Node app'ine (mevcut hub'ı devralır); `studio.ludenlab.com`→301→`/studio`, `atolye.ludenlab.com`→301→`/atolye` (SEO/bookmark); terapimat standalone + atolye standalone emekli; iyzico domain=`ludenlab.com` + webhook=`ludenlab.com/api/iyzico/webhook` (yeni merchant); e2e: kayıt→modül seç→abone→entitlement→araç | ben + sen (DNS/panel) | **yüksek** |
| **S6** | Temizlik: flag'li `central-billing` köprüleri + `§13` SSO token tasarımı sil; sızan secret'ları rotate (iyzico/DB/AUTH/ANTHROPIC/HCAPTCHA/CRON); `ROADMAP.md`/`BILLING_CUTOVER.md`'yi yeni mimariye göre güncelle/arşivle | ben + sen (secret) | düşük |

**Track 2 done-tanımı:** `ludenlab.com` tek app olarak `/studio` + `/atolye`'yi tek üyelikle sunar;
modül-bazlı abonelik yeni merchant'tan çalışır; subdomain'ler 301; eski standalone deploy'lar + flag
köprüleri emekli.

---

## 7. Riskler & rollback

- **S2 (birleştirme) en yüksek risk.** İki olgun app, overlapping route adları, 2 ayrı DB. Azaltma:
  S1'de izole taşıma + yeşil build; S2'de modül-modül (önce studio, sonra atolye) path altına alıp her
  adımda lint/typecheck/build + smoke. Route çakışmaları path prefix ile deterministik.
- **S5 cutover.** Yanlış sıra canlı ödemeyi/girişi kırar. Sıra: (1) birleşik app prod'da sağlıklı →
  (2) hafif göç doğrulandı → (3) iyzico domain+webhook yeni merchant'a (⚠️ geri dönüşü en zor adım,
  EN SON) → (4) subdomain 301 → (5) 24-48s izle. Rollback: subdomain 301'leri geri al + eski standalone
  app'lere dön (henüz silinmediyse); webhook URL'i eski uca al (iyzico retry + `WebhookEvent` idempotency).
- **Düşük genel risk:** ~0 gerçek recurring ödeyen → veri/billing-bozma riski minimal. Asıl risk
  teknik (merge regresyonu), finansal değil.
- **Secret sızıntısı:** konsolide merchant prod key'leri + DB şifreleri chat'e düşmüştü → cutover
  öncesi MUTLAKA rotate.

---

## 8. Yalnız kullanıcı yapabilir (CLI dışı)

1. **iyzico:** yeni ludenlab merchant (prod+sandbox) aç; BRY merchant webhook URL'i; cutover'da
   ludenlab domain+webhook switch; eski merchant emekli.
2. **Hostinger/hPanel:** `brytakip.com` 301 kaldır + `brytakip.ludenlab.com` 301; birleşik app'i
   `ludenlab.com` Node app olarak deploy; subdomain 301'leri; env güncelle.
3. **Tauri release:** imzalı 0.6.x release (CI secrets).
4. **Secret rotation:** iyzico (her iki merchant), DB şifreleri, `AUTH_SECRET`, ANTHROPIC/HCAPTCHA/CRON.
5. **KVKK/yasal:** domain/iş yapısı değişiminin metinlere yansıması (gerekirse).

---

## 9. Açık varsayımlar (onayla / düzelt)

- **BRY'nin "mevcut iyzico'su"** = `brytakip-api` env'indeki kendi merchant key'leri (orijinal
  brytakip.com merchant'ı). Konsolide merchant'taki BRY planları emekli edilir.
- **1 e-posta = 1 kişi** (Studio+Atölye'de aynı e-posta → tek merkezi `Account`).
- **Şifre hash uyumu:** Studio (`Therapist.password` bcrypt) + Atölye (`Account.passwordHash` bcrypt)
  + Hub (`Account.passwordHash` bcrypt) aynı bcrypt → hash taşınabilir (doğrulanacak).
- **FREE plan iyzico'suz** (Subscription satırı yok = FREE).
- **App home = hub'ı büyüt** (yeni `apps/web` yerine). Studio+Atölye yüzeyleri hub'a taşınır.

---

## 10. Sıradaki adım

Track 1 (BRY) detaylı uygulama planı (writing-plans) → uygula → doğrula → Track 2'ye geç.
Track 2 kendi içinde S1→S6 sırayla planlanır; S2 için ayrı detaylı alt-plan.
