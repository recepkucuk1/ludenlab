# S2 — Studio + Atölye Tek App Birleştirme · Tasarım & Runbook

> **Karar (2026-06-16):** Studio + Atölye **tek Next app**'te birleşir → `ludenlab.com/studio` +
> `ludenlab.com/atolye`, **tek üyelik** (`Account`). Base = **hub'ı büyüt** (canlı spine stabil).
> **Yapısal birleştirme önce** (S2a-c); UI birleştirme (→ Studio look) ayrı faz **S2d**.
>
> **Durum:** Tasarım onaylandı. Sıradaki: **S2a** detaylı uygulama planı (writing-plans).
> **Üzerine kurulur:** S1 (`apps/studio` monorepo'da, build yeşil, branch `feat/studio-monorepo`).

---

## 0. Kilitli kararlar

1. **Base = hub'ı büyüt.** `apps/hub` → `ludenlab.com` tek Next app (standalone, tek Hostinger Node app, mevcut hub deploy'unu devralır). Spine (auth+billing+ödeme) zaten hub'da, canlı + doğru → taşınmaz.
2. **Tek `Account`** (`billing` şeması) + tek next-auth + tek çerez. Tek origin → cross-subdomain çerez / e-posta token handoff (`§13 SSO`) / flag'li `central-billing` köprüleri **GEREKSİZ**.
3. **Ödeme modeli:** kayıtta **"ücretsiz başla" VEYA "abone ol"** seçimi; **per-modül** abonelik (iyzico-native, bağımsız iptal); ikinci modül/upgrade sonradan `/hesap`'tan. **Cart YOK** (recurring iyzico tek-plan-tek-checkout). FREE = iyzico'suz (abonelik yokluğu = FREE).
4. **Yapısal önce (S2a-c), UI sonra (S2d).** UI hedefi = **Studio'nun tasarımı** (en olgun poster; `@ludenlab/ui` Studio token'larından çıkarılmış erken snapshot). Atölye + shell S2d'de Studio look'una yakınsar. Bu, base seçimini etkilemez.
5. **Veri sınırları korunur:** kimlik+billing → `billing` şeması · Studio domain → Studio Supabase `public` · **Atölye klinik → AYRI Supabase + RLS, DOKUNULMAZ** (`withRls`). 3 ayrı Prisma client (custom output, clobber yok).
6. **Hafif kimlik köprüsü:** modül user tabloları (`Therapist`, atölye `Account`) yerinde; merkezi session'dan **e-posta ile** çözülür. FK remap YOK.

---

## 1. Topoloji

```
                 ┌──────────── ludenlab.com  (apps/hub büyümüş — TEK Next app) ────────────┐
 (shell/spine)   │  /            vitrin + (authed) modül launcher                            │
                 │  /giris /kayit  tek next-auth → billing.Account (tek çerez)               │
                 │  /hesap       modül-bazlı abonelik paneli (abone ol/yükselt/ekle/iptal)   │
                 │  /odeme /odeme/sonuc /api/iyzico/webhook   (mevcut hub billing — büyür)   │
 (modüller)      │  /studio/*    Studio yüzeyi   → studioDb (Studio Supabase public)         │
                 │  /atolye/*    Atölye yüzeyi   → atolyeDb (Atölye Supabase + RLS)           │
                 └───────────────────────────────────────────────────────────────────────────┘
                  entitlement: merkezi billing.Subscription'dan DOĞRUDAN (aynı app; flag/bridge yok)
```

**Kod organizasyonu (apps/hub içinde):**
- Shell: `src/app/(shell)/*`, `src/lib/*`, `src/components/*` (hub'ın mevcut + büyüyen kabuğu).
- Modüller: `src/app/studio/*` + `src/app/atolye/*` (route'lar); modül-içi paylaşılan kod `src/modules/studio/*` + `src/modules/atolye/*` (lib/components/prompts). Route çakışmaları path prefix ile çözülür (`/studio/giris` yok → merkezi `/giris`).
- **3 Prisma client** (custom output, clobber-free; S1'deki `prisma-client` generator deseni):
  - `src/lib/db/billing.ts` → `billing` şeması (Account/Subscription/BillingPlan/WebhookEvent) — hub'da var.
  - `src/lib/db/studio.ts` → Studio Supabase `public` (Therapist/Student/Card/Lesson/...).
  - `src/lib/db/atolye.ts` → Atölye Supabase (Case/Session/... + `withRls`).
- next.config: `output:standalone` + `outputFileTracingRoot` + `transpilePackages:[@ludenlab/billing(, ui, ai)]` + `serverExternalPackages:[iyzipay]` + `scripts/postbuild.mjs`. Sentry (Studio'dan) opsiyonel olarak shell'e taşınabilir (S2b'de değerlendirilir).

## 2. Üyelik & shell

- **`/kayit`:** Account oluştur → onboarding seçimi: **(a) Ücretsiz başla** → modül seç → o modülün FREE tier'ı aktif (merkezi Subscription YOK; modülün kendi FREE default'u). **(b) Abone ol** → `/odeme?module=&code=&interval=` (subscribe-at-signup).
- **`/giris`:** tek giriş (billing.Account). Modüllerin kendi login'i kalkar.
- **`/hesap`:** modül-bazlı abonelik durumu (Studio: FREE/PRO/ADVANCED · Atölye: FREE/PRO/Gelişmiş), per-modül **abone ol / yükselt / modül ekle / iptal**. Merkezi `Subscription` okunur/yazılır.
- **`/` landing:** public pazarlama + modül vitrini; authed → launcher (→ `/studio` veya `/atolye`) + hesap kısayolu.
- **Launcher/nav:** modüller arası geçiş (persistent app-bar ya da `/` launcher). Aktif modül bağlamı.

## 3. Modül mount + köprü + entitlement

- **`/studio/*`:** Studio route'ları taşınır. Sayfalar merkezi session'dan `Account.email` alır → **`Therapist`'i e-posta ile çözer** (studioDb) → domain verisi. Studio'nun `/login`/`/register`/`/subscription` sayfaları kalkar → merkezi `/giris`/`/kayit`/`/hesap`'a yönlenir.
- **`/atolye/*`:** aynısı; atölye `Account`'u e-posta ile çözülür (atolyeDb). **Klinik RLS izolasyonu korunur** (`withRls`, ayrı DB).
- **Entitlement (sadeleşti):** merkezi `billing.Subscription` (per modül) → modül sayfası **doğrudan** okur (aynı app, ağ/flag/bridge yok). Modül tier'ı kendi semantiğine map'ler (Studio: studentLimit/pdf/credits · Atölye: credits). FREE = Subscription yokluğu.
- **E-posta eşleşmesi (varsayım):** 1 e-posta = 1 kişi; her Account ↔ Studio Therapist ↔ Atölye Account e-posta ile. Eksik eşleşmeler hafif göçte (S4/cutover) doldurulur; S2'de dev/test hesaplarıyla doğrulanır.

## 4. Fazlama (big-bang DEĞİL — her faz build/typecheck yeşil + smoke)

| Faz | İş | Done-tanımı |
|---|---|---|
| **S2a — Shell + spine** | hub'ı büyüt: modül launcher (`/`) + `/hesap` (account/billing paneli) + free-or-subscribe `/kayit` akışı + 3-DB client iskelesi (studioDb/atolyeDb wiring, henüz yüzey yok). Hub'ın mevcut Account auth + `/odeme` korunur. | kayıt(free+paid)/giriş/`/hesap`/subscribe-at-signup checkout (sandbox `3422180`) çalışır; build+typecheck yeşil |
| **S2b — Studio → `/studio`** | `apps/studio` yüzeyini birleşik app'e `/studio` altına taşı; e-posta köprüsü (Therapist by Account email); Studio auth/subscription sayfaları kalkar → merkezi; entitlement merkezi Subscription'dan. | giriş → `/studio` araçları çalışır + entitlement gate doğru; build yeşil; **terapimat canlı paralel kalır** |
| **S2c — Atölye → `/atolye`** | aynısı; klinik DB + RLS (`withRls`) korunur; atölye'nin flag'li `central-billing` köprüsü emekli (artık doğrudan). | giriş → `/atolye` araçları + klinik veri izole + entitlement; build yeşil |

Her faz ayrı commit + ayrı doğrulama. S2a kendi detaylı planını alır (writing-plans); S2b/S2c S2a bitince planlanır.

## 5. S2 DIŞI (sonraki fazlar — bilinçli)

- **S2d — UI birleştirme:** Studio'nun olgun tasarımını kanonikleştir (gerekirse `@ludenlab/ui`'a yükselt) → Atölye + shell yakınsar. Ayrı faz.
- **S3 — Billing YENİ merchant:** S2 checkout'u dev'de **sandbox `3422180`** kullanır; prod yeni merchant (S0 başvuru) gelince plan ref'leri + key'ler repoint (`bootstrap-iyzico` yeni key'le). Eski 101029161 = BRY'nin.
- **S5 — Deploy/cutover:** birleşik app `ludenlab.com`'a (hub deploy'unu devralır); `studio.ludenlab.com`/`atolye.ludenlab.com` → 301 → path; terapimat + apps/atolye standalone deploy emekli; iyzico domain+webhook yeni merchant.

## 6. Riskler & rollback

- **En riskli = S2b (Studio mount).** 193 dosyalık olgun app'i birleşik app'e taşımak + auth'unu merkezi Account'a köprülemek. Azaltma: S1 zaten `apps/studio`'yu monorepo'da yeşil derliyor → taşıma mekaniği biliniyor; faz-faz + her adımda build/typecheck. terapimat **canlı paralel** kalır (cutover S5'e kadar) → rollback = birleşik app'i deploy etme.
- **Auth köprü boşluğu:** bir Account'un modül user kaydı (e-posta) yoksa modül sayfası boş/oluştur. S2'de dev hesaplarıyla; gerçek göç S4/cutover.
- **Klinik RLS regresyonu:** atölye taşınırken `withRls` + ayrı DB bozulmamalı. Azaltma: atölye DB client'ı + RLS deseni olduğu gibi taşınır (dokunma); S2c smoke = klinik veri izolasyon testi.
- **Deploy yok (S5'e kadar):** tüm S2 branch'te; canlı Studio/Atölye subdomain'lerinde çalışmaya devam → S2 boyunca canlı etki YOK.

## 7. Açık varsayımlar (onayla/düzelt)

- 1 e-posta = 1 kişi (Account ↔ Therapist ↔ atölye Account).
- S2 checkout dev'de sandbox merchant; prod merchant S3.
- Sentry: Studio'da var (atolye/hub'da yok) — birleşik app'e taşınır mı, yoksa Studio route'larına mı kapsanır → S2b'de karar.
- Route prefix çakışmaları path ile çözülür (`/studio/*`, `/atolye/*`); shell route'ları kök.

---

## 8. Sıradaki adım

**S2a** (Shell + spine) detaylı uygulama planı → uygula → doğrula → S2b planla → S2c. Her alt-faz kendi spec/plan/impl döngüsü.
