# LudenLab — Birleşik Billing Cutover Runbook

> **Tetikleyici:** iyzico, mevcut sistemde per-subdomain (studio./atolye./brytakip.) iş
> modelini **REDDETTİ**. Tek üyelik = tek iş modeli + kayıtlı domain yalnız **apex
> `ludenlab.com`** olabilir. Dolayısıyla tüm checkout + webhook apex'e taşınmak
> **zorunda** (tercih değil). Bu doküman o göçün runbook'udur.

> **Durum:** Faz A başladı (2026-06-08). Sıradaki blocker: kullanıcı merkezi Supabase'i açıp
> `HUB_DATABASE_URL` verecek → Faz A'nın P2 (şema) adımı açılır.

---

## 1. Kilitli kararlar

- **Model: kalın apex sahibi.** Hub (`apps/hub`, `ludenlab.com`) merkezi `Account` (kimlik)
  + `Subscription` + `BillingPlan` + `WebhookEvent` sahibi. Modüller (studio/atolye/bry)
  yalnız **entitlement okur**.
- **Merkezi DB: yeni özel Supabase** (kimlik + billing). Atölye klinik DB'si **ayrı/RLS**
  kalır — klinik/PII bu merkezi DB'ye **GİRMEZ**.
- **Studio dahil (şimdi):** canlı Studio (`/Users/recepkucuk/terapimat`) billing'i de merkeze
  alınır. Studio kodu **terapimat'ta kalır**, billing'i repoint edilir — `apps/studio` tam
  monorepo göçü (Faz 5) ayrı/sonra.
- **Client: iyzipay SDK korunuyor** (REST rewrite YOK). `upgradeSubscription` eklendi (SDK
  `subscription.upgrade` doğrulandı). Webhook imzası v3 (`X-IYZ-SIGNATURE-V3`), zaten var.
- **Sandbox önce**, sonra prod anahtarı + domain switch.
- **Hostinger:** Edge middleware yok → entitlement guard server-component/route-handler.

---

## 1b. DB hosting (2026-06-08 — §3/§5/§8'deki "yeni Supabase" ifadelerini GÜNCELLER)

Free tier 2-proje dolu (Studio eu-west-1 + Atölye eu-central-1) → yeni proje açılamadı.
**Karar: merkezi DB = Studio'nun mevcut Supabase projesi**, ama canlıya dokunmadan:

- Hub kendi tablolarını **ayrı `billing` şemasında** kurar; Studio'nun canlı `public` tabloları
  (Therapist/Plan/Subscription/...) **DOKUNULMAZ** → canlı sisteme sıfır şema-riski.
- `HUB_DATABASE_URL` = Studio Supabase bağlantısı + `?schema=billing` (prod öncesi hub'a özel
  least-privilege rol).
- **Studio abonelik göçü YOK** — zaten bu DB'de; `public.*`→`billing.*` aynı-DB SQL ile kopyalanır.
  Yalnız **Atölye** billing'i cross-DB (eu-central → eu-west) içe taşınır.
- DDL **additive raw SQL (pg)** ile uygulanır; **prisma migrate / db push YOK** (bkz. Prisma drift
  disiplini). Hub Prisma yalnız `billing` şemasını yönetir; migration SQL uygulanmadan gösterilir.

---

## 2. Hedef mimari

```
                         ┌──────────────────────── apex: ludenlab.com (apps/hub) ───────────────────────┐
  kullanıcı  ──(abone ol)──▶ /odeme?module=&plan=  ──▶ iyzico checkout (SDK)  ──▶ /odeme/sonuc (callback)
                         │   merkezi DB: Account · Subscription · BillingPlan · WebhookEvent             │
  iyzico  ──(tek webhook)──▶ /api/iyzico/webhook (createWebhookRouter)  ──fan-out──▶ modül fulfillment   │
                         └───────────────────────────────────────────────────────────────────────────────┘
        studio.ludenlab.com        atolye.ludenlab.com         brytakip.ludenlab.com
        (terapimat, repoint)       (apps/atolye)               (ayrı repo, Faz 4 sonrası)
        — checkout YOK; "abone ol" → apex; entitlement ← merkezi DB
```

- **Tek iyzico-facing yüzey = apex hub:** checkout init + callback + webhook. Subdomain'lerde
  iyzico anahtarı / checkout formu **bulunmaz**.
- Ödeme sonrası hub aboneliği merkezi DB'ye yazar → kullanıcıyı modül subdomain'ine döndürür.
- Webhook tek uçta (`ludenlab.com/api/iyzico/webhook`); `createWebhookRouter` ile modüle
  fan-out (mevcut tasarım — `forwardUrls` + `FulfillmentHandler.owns`).

---

## 3. Önerilen merkezi şema (apps/hub/prisma — İNCELEME İÇİN; Supabase gelince uygulanır)

Studio (`Therapist`/`Plan`/`Subscription`/`WebhookDelivery`) + Atölye
(`Account`/`Plan`/`Subscription`/`WebhookDelivery`) modelleri uzlaştırıldı. **Entitlement
semantiği modülde kalır** (Studio: studentLimit/pdfEnabled; her ikisi: kredi/dönem); merkez
yalnız **kim + hangi modül + hangi tier + durum + dönem sonu** tutar.

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("HUB_DATABASE_URL") }

enum BillingModule { STUDIO ATOLYE BRYTAKIP }

// İç normalize durum. iyzico ham → iç map:
//   ACTIVE→ACTIVE · PENDING→PENDING · UNPAID→PAST_DUE · CANCELED→CANCELED
//   EXPIRED→EXPIRED · UPGRADED→ACTIVE(yeni plan). TRIAL init'te set edilir.
enum SubscriptionStatus { PENDING TRIAL ACTIVE PAST_DUE CANCELED EXPIRED }
enum BillingInterval { MONTHLY YEARLY }

// Merkezi kimlik = SSO otoritesi. Modül hesapları (Studio.Therapist / Atolye.Account)
// e-posta ile buna map'lenir (varsayım: 1 e-posta = 1 kişi; bkz. §9).
model Account {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String?
  passwordHash      String                       // credentials auth (next-auth v5)
  role              String   @default("user")     // user | admin
  suspended         Boolean  @default(false)
  iyzicoCustomerRef String?                       // tek iyzico müşteri referansı
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  subscriptions     Subscription[]
  @@index([email])
}

// iyzico ürün/plan referansları (bootstrap doldurur). Modül × tier × interval.
model BillingPlan {
  id               String          @id @default(cuid())
  module           BillingModule
  code             String          // tier: "PRO" | "ADVANCED" | "ENTERPRISE" (FREE iyzico'suz)
  interval         BillingInterval
  name             String          // "Atölye Pro Aylık"
  price            Decimal         @db.Decimal(10, 2) // TL major-unit
  iyzicoProductRef String
  iyzicoPlanRef    String          @unique
  active           Boolean         @default(true)
  createdAt        DateTime        @default(now())
  subscriptions    Subscription[]
  @@unique([module, code, interval])
  @@index([module])
}

// Bir hesabın BİR modüldeki aboneliği.
model Subscription {
  id                    String             @id @default(cuid())
  accountId             String
  module                BillingModule
  billingPlanId         String?
  status                SubscriptionStatus @default(PENDING)
  iyzicoSubscriptionRef String?            @unique
  iyzicoPricingPlanRef  String?
  currentPeriodEnd      DateTime?
  cancelledAt           DateTime?
  lastSyncedPeriodEnd   DateTime?          // callback↔webhook idempotency (mükerrer kredi/erişim yok)
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
  account     Account      @relation(fields: [accountId], references: [id], onDelete: Cascade)
  billingPlan BillingPlan? @relation(fields: [billingPlanId], references: [id])
  @@index([accountId, module])
  @@index([module, status])
}

// Tek apex webhook ucu için idempotency + iz. (Studio/Atölye'deki WebhookDelivery deseni.)
model WebhookEvent {
  id          String         @id @default(cuid())
  provider    String         @default("iyzico")
  eventType   String
  externalId  String         @unique           // iyzico olay kimliği → tekrarları engeller
  module      BillingModule?                    // route edilen modül (biliniyorsa)
  payload     Json
  status      String         @default("received") // received | processed | failed
  attempts    Int            @default(1)
  error       String?        @db.Text
  processedAt DateTime?
  createdAt   DateTime       @default(now())
  @@index([status])
  @@index([createdAt])
}
```

---

## 4. Yeniden kullan / taşı / emekli et

| Yeniden kullan (dokunma) | Apex hub'a taşı | Emekli et |
|---|---|---|
| `@ludenlab/billing` iyzipay SDK client (+`upgradeSubscription` ✅) · `createWebhookRouter` fan-out · v3 imza · `WebhookDelivery` CAS idempotency · atolye/studio fulfillment mantığı | checkout init (`/odeme`) · callback (`/odeme/sonuc`) · webhook **entry** (`/api/iyzico/webhook`) · ürün/plan provisioning (atolye `admin/iyzico/setup` mantığı → apex bootstrap) | atolye `api/subscription/{checkout,callback}` (subdomain) · studio'nun kendi iyzico checkout/webhook ucu · atolye webhook'u **leaf**'e iner |

---

## 5. Fazlı plan

### Faz A — Temel (prod etkisi YOK) · ⏳ başladı
- [x] `@ludenlab/billing`: `upgradeSubscription` eklendi (SDK doğrulandı), typecheck ✅.
- [x] Karar: `env.ts` pakete değil **hub tüketici katmanına** girer (paket config-injected
      kalır; atolye `lib/iyzico.ts` deseni). IYZWSv2 `signature.ts` **gereksiz** (SDK auth'u
      imzalar; v3 webhook imzası `webhook.ts`'te mevcut).
- [x] **DB host:** Studio Supabase (§1b); `apps/hub/.env` → `HUB_DATABASE_URL` (+`?schema=billing`)
      + iyzico sandbox anahtarları yazıldı; read-only connectivity ✓ (port 5432 session pooler;
      `public`=17 tablo dokunulmadı; `billing` yok).
- [x] **P2 yazıldı + UYGULANDI ✓** (2026-06-08): `apps/hub/prisma/schema.prisma` +
      `apps/hub/prisma/sql/0001_init_billing.sql` → **pg ile çalıştırıldı** (prisma migrate YOK).
      Sonuç: `billing` şeması + 4 tablo (Account/BillingPlan/Subscription/WebhookEvent) + 3 enum +
      15 index; Studio `public`=17 tablo DOKUNULMADI.
- [ ] **P2 client:** `@prisma/client`/`prisma` hub'a ekle + `prisma generate` (Faz B'de adapter-pg wiring).

### Faz B — Apex yüzey (SANDBOX)
- [x] **Foundation ✓** (2026-06-08): hub deps (Prisma7 + adapter-pg + next-auth + bcryptjs + pg +
      zod + @ludenlab/billing) + `prisma generate` + `lib/db.ts` (adapter-pg, `schema:"billing"` →
      `public` görünmez) + `lib/iyzico.ts` (env wrap, `upgradeSubscription` dahil) + `IYZICO_*` /
      `HUB_DATABASE_URL` env + transpilePackages. typecheck ✓.
- [x] **next-auth ✓** (2026-06-08): `src/auth.ts` (credentials → `billing.Account`, JWT,
      `.ludenlab.com` cookie via `COOKIE_DOMAIN`) + `[...nextauth]` route + `types/next-auth.d.ts`
      + register API (`billing.Account` oluşturur) + `/giris` + `/kayit` (poster UI, `callbackUrl`).
      `AUTH_SECRET` .env'de. typecheck ✓.
- [x] **P4 ✓** (2026-06-08): `/odeme?module=&code=&interval=` (server auth gate → `/giris?callbackUrl`;
      `BillingPlan` lookup) + `CheckoutClient` (form inject) + `/api/odeme/init` (initializeCheckoutForm,
      callbackUrl = `NEXT_PUBLIC_APP_URL/odeme/sonuc`) + `/odeme/sonuc` (callback → `billing.Subscription`
      upsert; plan'ı iyzico ref'inden OTORİTER bul → `moduleReturnUrl` ile modül subdomain'ine 303).
      Kredi grant YOK (modül işi). `packages/billing/urls.ts`: buildCheckoutUrl + moduleReturnUrl. typecheck+lint ✓.
- [x] **P5 ✓** (2026-06-08): `/api/iyzico/webhook` — verify (X-IYZ-SIGNATURE-V3) + normalize +
      `WebhookEvent` CAS idempotency + merkezi `Subscription` durum güncelle (success→ACTIVE+dönem ·
      unpaid/failure→PAST_DUE · cancelled→CANCELED · expired→EXPIRED). Modül fulfillment/fan-out Faz C. typecheck+lint ✓.
- [x] **P3 ✓** (2026-06-08): `apps/hub/scripts/bootstrap-iyzico.mjs` (env-driven, idempotent;
      iyzico'da ürün/plan OLUŞTURMAZ — zaten var; price+interval ile eşler; iyzipay/pg'yi .pnpm
      store-glob ile çözer). Sandbox → `billing.BillingPlan` **9 satır** (STUDIO 4 Pro/Advanced ×ay/yıl
      · ATOLYE 4 · BRYTAKIP 1 STANDARD/ay). PROD cutover'da prod-anahtarlı `.env` ile yeniden çalıştır.
- [x] **Lokal smoke test ✓** (2026-06-08): hub dev → health / auth-gate (307→/giris, callbackUrl korunur) /
      register (`Account` yazıldı) / login (bcrypt + session) / **checkout-init** hepsi çalıştı; init
      **gerçek sandbox iyzico formu** döndü (token + 3694-char checkoutFormContent). **FIX:** hub
      `next.config`'e `serverExternalPackages:["iyzipay"]` eklendi (iyzipay dinamik require → Turbopack
      bundle edemiyor; atolye'de vardı, hub'da eksikti). Test hesabı temizlendi.
- [ ] **Sandbox e2e test** — callback/webhook PUBLIC URL gerektirir (iyzico localhost'a ulaşamaz):
      tunnel (cloudflared/ngrok) ya da deploy → `NEXT_PUBLIC_APP_URL`'i o URL'e çevir + iyzico **sandbox
      panelinde** webhook = `<public>/api/iyzico/webhook`. Akış: kayıt → /odeme → sandbox kart → callback
      → `Subscription` → webhook. (Lokalde yalnız form yüklemesi + auth test edilebilir.)

### Faz C — Modül entegrasyonu
- [ ] **P6:** atolye + studio "abone ol" → `buildCheckoutUrl({module,plan})` ile apex'e yönlenir;
      ikisinin de kendi iyzico yüzeyi kaldırılır; atolye webhook'u leaf'e iner.
- [ ] **P7:** entitlement guard — `getEntitlement(accountId, module)` (server-side); ACTIVE/TRIAL
      geç, PAST_DUE uyarı bandı + apex /odeme CTA, diğer → plan seçimi.
- [ ] SSO: atolye + studio merkezi oturumu (`.ludenlab.com` cookie) tüketir; modül hesapları
      merkezi `Account`'a e-posta ile bağlanır.

### Faz D — Veri göçü + CUTOVER (PROD) · ⚠️ yüksek risk
- [ ] **Veri göçü:** canlı Studio + atolye `Account`/`Subscription` → merkezi DB (e-posta ile
      dedup; `iyzicoSubscriptionRef` ile eşle). Önce kuru-çalıştır + sayım doğrula.
- [ ] Prod iyzico anahtarı + `IYZICO_BASE_URL=https://api.iyzipay.com`.
- [ ] **Cutover sırası (§6).**
- [ ] Eski subdomain checkout/webhook uçlarını emekli et.

---

## 6. Cutover sırası (KRİTİK — yanlış sıra canlı ödemeyi kırar)

1. Apex hub yüzeyi **prod'da CANLI + sağlıklı** (checkout/callback/webhook 200/405 doğrulandı).
2. Veri göçü tamam + doğrulandı (Studio canlı abonelikler merkezde görünüyor).
3. **iyzico panel (kullanıcı):** üyelik domain → `ludenlab.com`; webhook URL →
   `https://ludenlab.com/api/iyzico/webhook` (success+failure aynı uç).
4. Modüllerin "abone ol" akışları apex'e yönlenmiş + eski uçlar kapalı.
5. İlk canlı işlemi + webhook'u izle (Sentry/log); 24-48s gözlem.

> ⚠️ **3. adımı 1-2'den ÖNCE yapma.** Domain switch anında iyzico apex'i bekler; apex hazır
> değilse **canlı Studio dahil** checkout + webhook düşer.

---

## 7. Rollback

- **Apex hub bozulursa (cutover öncesi):** modüller kendi mevcut billing'inde kalır (henüz
  emekli edilmedi) — sadece apex'i düzelt, prod etkisi yok.
- **Cutover sonrası webhook düşerse:** iyzico panelden webhook URL'i eski (çalışan) uca geri al;
  iyzico başarısız webhook'ları retry eder → kayıp olay minimum. Apex `WebhookEvent` idempotency
  tekrar işlemeyi güvenli kılar.
- **Veri göçü hatalıysa:** merkezi DB write-only doldurulduğu için modül DB'leri bozulmaz;
  merkezi tabloları temizle + yeniden göç.

---

## 8. Yalnız kullanıcı yapabilir (CLI dışı)

1. **`apps/hub/.env` → `HUB_DATABASE_URL`** = Studio'nun Supabase bağlantısı + `?schema=billing`
   (yeni proje YOK; §1b). Prod öncesi: hub'a özel least-privilege DB rolü (SQL'ini ben veririm).
2. **iyzico sandbox anahtarları** (Faz B testi).
3. **Faz D öncesi:** canlı Studio'da kaç gerçek abonelik var? (cutover risk ölçeği).
4. **iyzico panel:** domain → ludenlab.com + webhook URL (Faz D, §6 sırasıyla).
5. **hPanel:** hub Node app env (`HUB_DATABASE_URL`, `IYZICO_*`, `AUTH_*`); apex DNS zaten var.

---

## 9. Açık varsayımlar (onayla / düzelt)

- **Kimlik birleştirme:** 1 e-posta = 1 kişi; Studio + Atölye'de aynı e-posta → tek merkezi
  `Account`. (Farklıysa göç stratejisi değişir.)
- **Entitlement modülde:** merkez tier+durum tutar; "PRO ne demek" (kredi/limit/pdf) modülde
  map'lenir. (Merkez entitlement detayını tutsun isteniyorsa şema büyür.)
- **FREE plan:** iyzico'suz; `Subscription` satırı gerekmez (yokluk = FREE).
- **Studio repoint:** terapimat kodda kalır, billing'i merkeze bağlanır; tam `apps/studio`
  göçü Faz 5.

---

## 10. PROD iyzico envanteri (2026-06-08 — read-only keşif)

⚠️ Kullanıcının verdiği "sandbox" anahtarları aslında **PROD** (sandbox-api'de 401; api.iyzipay.com'da
success). **Prod iyzico ZATEN tam kurulu** — P3 (ürün/plan oluşturma) prod'da yapılmış. Sandbox-first
test için AYRI sandbox merchant + sandbox anahtarı + sandbox ürün gerekir. Prod anahtarları chat'e düştü → **ROTATE**.

| Modül | Ürün ref | Plan | Fiyat (TRY) | Interval | Plan ref |
|---|---|---|---|---|---|
| STUDIO | `2f0032b0-4165-4d35-9862-c61000f52d29` | Pro Aylık | 449 | MONTHLY | `19ab231d-4648-4ffc-a291-5f7d751d4bfd` |
| STUDIO | ″ | Pro Yıllık | 4579.8 | YEARLY | `fef3c8a8-5065-4562-83ed-beebd8cafe6b` |
| STUDIO | ″ | Advanced Aylık | 1999 | MONTHLY | `6a02f590-aff6-45ce-a1f2-f9fa2d3dbea6` |
| STUDIO | ″ | Advanced Yıllık | 20389.8 | YEARLY | `63a0a2a7-c7f9-4315-90e8-cc75b37c1084` |
| ATOLYE | `0edf59ee-27d7-4704-9f4c-87bf90a630a3` | Pro Aylık | 449 | MONTHLY | `010cd87c-8b21-4282-b9bd-674a362b51ef` |
| ATOLYE | ″ | Pro Yıllık | 4579.8 | YEARLY | `086ac3be-ac25-402b-8e33-4bbf4ecfaa7d` |
| ATOLYE | ″ | Gelişmiş Aylık | 1999 | MONTHLY | `801da161-ad16-49d9-a074-0c0285d35370` |
| ATOLYE | ″ | Gelişmiş Yıllık | 20389.8 | YEARLY | `8fa33f9f-5487-4ddd-9c35-c07dcc15aa81` |
| BRYTAKIP | `92a1409c-996a-4999-8a15-b7832cf23526` | Aylık (249₺) | 249 | MONTHLY | `dd82b6e9-4196-494d-a562-6853a02a172a` |
| BRYTAKIP | ″ | Aylık (eski 279₺, duplike) | 279 | MONTHLY | `67e8596b-7e7a-498e-a063-c65f982e1d70` |

**Notlar:** Studio & Atölye yapısı aynı (Pro + Advanced/Gelişmiş × aylık/yıllık). BRY'de 2 aylık plan
var (249 güncel, 279 eski) → temizlenebilir. BillingPlan.code → PRO/ADVANCED; BillingPlan bu ref'lerle
(PROD) doldurulacak — sandbox test istenirse sandbox'ta ayrı set gerekir.
