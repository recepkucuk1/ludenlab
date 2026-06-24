# LudenLab — Lansman Öncesi Denetim Raporu

**Tarih:** 2026-06-24
**Kapsam:** `apps/hub` (merged hub — Studio + Atölye modülleri), `packages/{ai,billing,config,ui}`, 3 Prisma DB, Paynkolay ödeme
**Yöntem:** 10 uzman perspektifinden paralel kod denetimi → her P0/P1 bulgusu için bağımsız, şüpheci (adversarial) doğrulama → çapraz-kesit go/no-go sentezi
**Bulgu sayısı:** 69 (6 P0-iddia · 21 P1 · 27 P2 · 15 P3); doğrulamada hiçbir bulgu çürütülmedi, birkaç P0 → P1'e indirildi

---

## 1. Karar: KOŞULLU GO

Teknik temel **beklenenden çok daha sağlam** (auth/IDOR scope'lama, kredi atomikliği, ödeme callback otoritesi, `tsc` temiz, `packages/ai`'de 1611 yeşil test). Ancak **iki küme gerçek lansman blokeri** var; bunlar kapatılmadan canlıya **çıkılmamalı**:

1. **Para kaybı (P0 — teyitli):** Abonelik iptali çalışmıyor — iptal eden kullanıcının kartından çekim devam ediyor ve erişim/kredi geri geliyor.
2. **KVKK hukuki açık (bloker küme):** Özel nitelikli çocuk verisi (gerçek ad + tanı) yurt dışı AI'a ayrı açık rıza olmadan gidiyor; OpenAI/fal sağlayıcıları yasal metinlerde hiç beyan edilmemiş; atölye şeması "PII yok" diye yanlış beyan ediyor.

**Genel hazırlık skoru: 5.5 / 10.** Bu skor düşük görünebilir ama yanıltıcı: çekirdek mühendislik 7+ seviyesinde; skoru aşağı çeken iki şey **hukuki uyum (3.5)** ve **ödeme iptal akışı (4.5)** — ikisi de günler içinde kapatılabilir, mimari yeniden yazım gerektirmez.

> **Özet cümle:** Ürün teknik olarak lansmana hazıra yakın; lansmanı engelleyen şey kod kalitesi değil, **iki kapatılabilir uyum/akış kusuru + zayıf operasyonel/pazarlama yüzeyi.**

---

## 2. Boyut Karnesi

| # | Perspektif | Skor | Durum |
|---|-----------|:----:|-------|
| 1 | 🔐 Güvenlik & Kimlik/Yetki | **7.5** | İyileştirme gerek |
| 2 | 🗄️ Veri Katmanı & DB / RLS | **7.0** | İyileştirme gerek |
| 3 | 🧱 Kod Kalitesi & Mimari | **7.0** | İyileştirme gerek |
| 4 | 🤖 AI Maliyet & Rate-Limit | **6.5** | İyileştirme gerek |
| 5 | 🎨 Frontend / UX / Erişilebilirlik | **6.0** | İyileştirme gerek |
| 6 | 🚀 Build / Deploy / Ops | **5.5** | İyileştirme gerek |
| 7 | 📣 SEO / Pazarlama / Marka | **5.5** | İyileştirme gerek |
| 8 | 💳 Ödeme / Faturalama (Paynkolay) | **4.5** | 🔴 **Bloker** |
| 9 | ⚖️ KVKK / Hukuki / Gizlilik | **3.5** | 🔴 **Bloker** |
| 10 | 🧪 Test & Kalite Kapıları | **3.5** | İyileştirme gerek |

---

## 3. P0 — Lansman Blokerleri (kapatılmadan go YOK)

### B1. İptal aboneliği durdurmuyor → iptal sonrası kart çekimi devam ediyor (PARA KAYBI) — *teyitli P0*

- **Kanıt:** İptal route'ları (`studio/api/subscription/cancel/route.ts:36-42`, `atolye/api/subscription/cancel/route.ts:36-42`) yalnızca **modül-yerel DB'ye** yazıyor. Yenileme cron'u (`api/paynkolay/cron/subscription-renewal/route.ts:40-66`) **merkezi `billing.Subscription`'ı `status:ACTIVE` ile** okuyup `chargeStoredCard` ile çekim yapıyor. Merkezi tabloyu `CANCELED` yapan **tek satır yok** (grep ile doğrulandı). Cancel route'undaki "renewal cron CANCELLED sub'ı çekmez" yorumu (`cancel/route.ts:9-12`) **yanlış**.
- **Etki:** İptal eden kullanıcı dönem sonunda saklı token ile yeniden tahsil edilir → yetkisiz çekim + KVKK/tüketici/mesafeli satış ihlali + chargeback/itibar.
- **Yan etki (B1b — reconcile geri alma):** Merkezi sub ACTIVE kaldığı için modül reconcile (`modules/*/lib/central-billing.ts:109-136`) iptali her render'da geri alıp planType'ı yükseltip kredi yüklüyor → "iptal ettim ama erişim+kredi geri geldi" destek kabusu.
- **Düzeltme:** İptali tek otorite olan **merkezi `billing.Subscription`'a yaz** (CANCELED veya `cancelledAt` set). Reconcile sorgusu zaten `status=ACTIVE` filtreli olduğundan sorun kendiliğinden çözülür. Alternatif: renewal cron sorgusuna `cancelledAt IS NULL` ekle. En temizi iptal akışını apex'e taşımak.
- **Not:** Cron harici scheduler ile tetikleniyor (Hostinger); scheduler kurulmazsa pratik etki gecikir ama kod yolu net. Ayrıca uçtan-uca token-charge runtime testi **hiç yapılmadı** (3DS ACS down) → prod'da token gerçekten doluyor mu belirsiz.

### B2. KVKK uyum kümesi — özel nitelikli çocuk verisi + yurt dışı AI aktarımı (bloker küme)

Doğrulayıcılar bu kümenin parçalarını **tek tek P1'e indirdi** (aydınlatma metni mevcut, UI alanı dürüstçe "Ad Soyad" diyor), ancak **özel nitelikli çocuk verisi işleyen bir üründe ve "pazarlamayla görünürlük artıracağız" hedefiyle** bu küme bütün olarak go-blokeridir:

- **B2a — Ayrı açık rıza yok:** Kayıtta (`kayit/page.tsx:170-183`) tek birleşik "okudum onaylıyorum" kutusu var. KVKK m.6 (özel nitelikli veri) ve m.9 (yurt dışı aktarım) **ayrı, granüler, opt-in** açık rıza gerektirir. Çocuğun gerçek adı (`prompts/index.ts:212-217`, `bep-prompts.ts:16`) + tanısı Anthropic'e (ABD) gidiyor.
- **B2b — OpenAI/fal beyansız:** Görsel üretimi OpenAI (`gpt-image-1-mini`, varsayılan) ve fal/Flux kullanıyor (`packages/ai/src/image/selectProvider.ts:8-16`); yasal metinler (`(legal)/kvkk/page.tsx:83`, `gizlilik/page.tsx:98`) aktarım alıcısı olarak **yalnız Anthropic'i** listeliyor. KVKK m.10 aydınlatma ihlali.
- **B2c — Şema yanlış beyan:** `prisma/atolye/schema.prisma:8` "PII YOK / rumuz tutulur" diyor ama aynı dosya `:75-81` "code = Ad Soyad (AI'a gider)" diyor — iç çelişki.
- **Düzeltme (öncelik sırası):**
  1. **Veri minimizasyonu (en sağlam):** AI prompt'larına gerçek ad yerine baş harf/takma ad gönder. Tek değişiklik noktası `bep-prompts.ts:15` / `profilToPrompt` ve studio prompt builder'ları — ad alanı prompt'tan kolayca çıkarılabilir.
  2. **Ayrı açık rıza kutusu:** Kayıtta veya öğrenci ekleme/araç çalıştırma anında özel nitelikli veri + yurt dışı aktarım için ayrı opt-in onay + ayrı zaman damgası.
  3. **Yasal metin düzelt:** KVKK + Gizlilik aktarım listelerine OpenAI (ABD) ve fal/Flux (ABD) ekle; hangi veri (sahne/kelime, ad değil) gittiğini yaz.
  4. Şema yorumunu (`schema.prisma:8`) gerçekle hizala.

---

## 4. P1 — Lansman Penceresinde Kapatılmalı

### Ödeme / Operasyon (gelir-kritik)
- **PAYNKOLAY_BASE_URL test'e düşüyor** (`lib/paynkolay.ts:19`): prod'da set edilmezse tüm tahsilat **sessizce sandbox'a** gider = hiç para tahsil edilmez. `.env.example:15` de test host'u veriyor. → Prod'da fail-fast yap.
- **Yenileme cron çift-çekim koruması doğrulanmamış** (`subscription-renewal/route.ts:57-77`): charge başarılı + DB update başarısız olursa bir sonraki cron aynı `clientRefCode` ile tekrar dener; idempotency Paynkolay'a bağımlı, test edilmedi.
- **Gerçek kartla uçtan-uca ödeme testi hiç yapılmadı** (3DS ACS down).
- **Callback hash formülü hiç doğrulanmadı** (`packages/billing/src/paynkolay-hash.ts:85-113` — açık TODO): 1170 permütasyon denenmiş, üretilemmiş. Gerçek 3DS callback yakalanıp alan adı+sırası doğrulanmalı.

### AI Maliyet
- **4 görsel ucunda ön kredi kontrolü yok** (`comm-board/images`, `phonation/images`, `social-story/images`, `matching-game/images`): pahalı OpenAI/FLUX çağrısı bakiye kontrolünden **önce** yapılıyor → 0 kredili kullanıcı gerçek para harcatabilir. `articulation/images`'taki ön-kontrol deseni 4'üne de eklenmeli.

### Güvenlik / Veri
- **Güvenlik başlıkları tamamen yok** (`next.config.ts` — `headers()` yok): HSTS, CSP, X-Frame-Options, X-Content-Type-Options sıfır. Standalone Node çıktısında `next.config headers()` çalışır (edge gerekmez). → Kolay ekleme.
- **RLS repo-drift'i:** Studio public tablolarının RLS'i prod'da **açık** (Supabase advisor doğruladı) ama **hiçbir commit'li migration'da yok** → şema durumu repodan üretilemez. `withRls()` tanımlı ama **hiç çağrılmıyor** (`lib/db/atolye.ts:29-37`) → izolasyon tamamen app-katmanı `ownerId` filtresine bağlı (şu an doğru, ama tek unutulan sorgu çapraz-hesap sızıntısı). → `0009_studio_public_rls.sql` commit'le.
- **Bağlantı havuzu yok:** Tüm Prisma istemcileri 5432 direct, `max` tanımsız → yük altında bağlantı tükenmesi. → Supavisor pooler (6543).

### Build / Deploy / Gözlemlenebilirlik
- **Sentry bağımlı ama wire edilmemiş** (`package.json`'da var, kodda `Sentry.init`/`instrumentation.ts`/DSN sıfır) → canlıda **sıfır hata görünürlüğü**. Üstelik admin health sayfası "Sentry'ye bak" diyor.
- **Deploy runbook'ları bayat** (`DEPLOY.md`, `DEPLOY_CUTOVER.md`): operatöre hâlâ `IYZICO_*`, `RESEND_API_KEY`, `HCAPTCHA_SECRET` dikte ediyor — kod bunları kullanmıyor (Paynkolay + SMTP). Yanlış env = bozuk deploy.
- **`.env.example` eksik:** `CRON_SECRET`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_APEX_URL`, `NEXT_PUBLIC_CENTRAL_BILLING` yok → prod'da sessiz/runtime patlama.

### Frontend / UX
- **Atölye'nin TÜM AI araçları mobilde 2 kolonda kalıyor:** responsive kural yanlış CSS dosyasında (`studio.css`'te var, atölye `atolye.css` yüklüyor). Ana hedef kitle eğitimciler telefonda → kullanılamaz form ekranları. → `poster-tool-grid` collapse kuralını `packages/ui` ortak CSS'ine taşı.
- **`error.tsx` / `not-found.tsx` / `global-error.tsx` hiç yok:** çökmede ham İngilizce ekran. → Türkçe, poster temalı sayfalar ekle.

### SEO / Pazarlama (lansman hedefiyle doğrudan çelişiyor)
- **SEO temel asset'leri yok:** favicon, robots.txt, sitemap.xml, og:image, twitter card. → `app/icon.png`, `app/opengraph-image.png`, `app/robots.ts`, `app/sitemap.ts`.
- **Hiç analitik yok** (GA/Plausible/PostHog): "pazarlama aşaması" hedefiyle dönüşüm ölçülemez. → KVKK-dostu hafif analitik + hero/kayıt/ödeme olayları.
- **Studio FAQ "havale" vaat ediyor** ama yalnız Paynkolay kart var (`StudioLanding.tsx:42`) → kaldır veya ekle.

### Test
- **Para/kredi/IDOR/callback kritik yollarında sıfır test** + **CI test çalıştırmıyor** (`ci.yml`'de `pnpm test` yok, hub'da koşucu yok). 1611 test var ama hepsi `packages/ai`'de. → 6-8 kritik-yol testi (aşağıda) + CI'ye `pnpm test` adımı.

---

## 5. Çapraz-Kesit Örüntüler

1. **iyzico→Paynkolay göçü kodda temiz, çevrede yarım:** kod kalıntısı sıfır ✅; ama runbook'lar (iyzico), gerçek-kart testi, callback hash hâlâ açık.
2. **Merkezi vs modül-yerel billing otorite karmaşası:** iptal/reconcile çift-yazım, ~160 satır kopya reconcile kodu (ince farklarla) → para/erişim tutarsızlığının kök nedeni. **Tek otorite = merkezi billing** ilkesi netleştirilmeli.
3. **"Beyan ≠ gerçek" (KVKK):** yasal/şema metinleri gerçek veri akışını yansıtmıyor (Anthropic beyanlı, OpenAI/fal değil; "PII yok" diyor ama ad+tanı gidiyor).
4. **"Kurulu ama bağlanmamış" bağımlılıklar:** Sentry + hCaptcha `package.json`'da var, kodda yok → yanlış güvenlik hissi.
5. **Gözlemlenebilirlik + test boşluğu birlikte:** Sentry yok + kritik-yol test yok + CI test yok → canlıda **kör uçuş**; ödeme/kredi hatası sessizce kullanıcıya yansır.
6. **Pazarlama yüzeyi mühendislikten geride:** SEO asset yok, analitik yok — bu, lansmanın asıl amacıyla (görünürlük + dönüşüm) çelişiyor.

---

## 6. Bugün Lansman Yapılırsa — En Olası Felaket Senaryoları

1. **İlk iptal eden müşteri dönem sonunda yeniden tahsil edilir** → chargeback + şikayet; aynı anda erişim/kredi geri döner → çözülmesi zor destek + iade yükü + güven kaybı. *(B1)*
2. **KVKK şikayeti/denetimi:** özel nitelikli çocuk verisi yurt dışına ayrı açık rıza olmadan + eksik sağlayıcı beyanıyla aktarılıyor → idari para cezası riski; pazarlamayla görünürlük arttıkça dikkat çeker. *(B2)*
3. **PAYNKOLAY_BASE_URL yanlış set edilirse** gerçek ödemeler sandbox'a gider → **hiç para tahsil edilmez**, kimse fark etmez (Sentry de yok). *(P1)*

---

## 7. Minimum Lansman Checklist'i (go için ZORUNLU)

- [ ] **B1:** İptal merkezi `billing.Subscription`'a yazsın (veya cron `cancelledAt IS NULL` filtresi). Reconcile geri-alma ortadan kalksın.
- [ ] **B2.1:** AI prompt'larından gerçek çocuk adı çıkarılsın (baş harf/takma ad) — veri minimizasyonu.
- [ ] **B2.2:** Özel nitelikli veri + yurt dışı aktarım için **ayrı açık rıza** kutusu + zaman damgası.
- [ ] **B2.3:** KVKK + Gizlilik metinlerine **OpenAI ve fal (ABD)** aktarım alıcısı olarak eklensin; `schema.prisma:8` "PII yok" yorumu düzeltilsin.
- [ ] **Ödeme env güvenliği:** `PAYNKOLAY_BASE_URL` prod'da set + boşsa fail-fast. `.env.example` tamamlansın.
- [ ] **Gerçek kartla uçtan-uca ödeme testi** (1 başarılı tahsilat + 1 yenileme + 1 iptal doğrulaması).
- [ ] **Callback hash** gerçek 3DS POST'uyla doğrulansın (golden vector testi).
- [ ] **4 görsel ucuna ön kredi kontrolü** eklensin.
- [ ] **Güvenlik başlıkları** (`next.config.ts headers()`).
- [ ] **Sentry wire** edilsin (en az ödeme/kredi yolları) — yoksa canlı kör.
- [ ] **Atölye mobil grid** düzeltilsin (`error.tsx`/`not-found.tsx` ile birlikte).
- [ ] **SEO asset'leri** (favicon/robots/sitemap/og) + **analitik**.
- [ ] Deploy runbook'ları Paynkolay/merged-hub gerçeğine göre güncellensin.

### Lansman öncesi yazılacak kritik-yol testleri (6-8 adet)
1. Callback idempotency — aynı `clientRefCode` iki kez POST → tek subscription, ikincisi CONSUMED.
2. PaymentList'te SUCCESS yoksa provisioning YAPILMAZ.
3. Reconcile çift-çağrı → kredi yalnız bir kez yüklenir (CAS claim).
4. Kredi düşürme yarış koşulu → negatif bakiye/çift-harcama olmaz.
5. IDOR — başka therapist/owner kaydına erişim 404/403 döner.
6. İptal → merkezi sub CANCELED + renewal cron çekmez.
7. Paynkolay hash golden vector (pure fonksiyon).
8. KVKK rıza kaydı yazılır + sürümlenir.

---

## 8. Güçlü Yönler (sağlam olan — korunmalı)

- **Kimlik/Yetki:** Tüm `[id]` uçları istisnasız `ownerId/therapistId = session.user.id` scope'lu — **gerçek IDOR yok**. 18 admin ucu `requireAdmin()` + taze DB rol okuması. bcrypt(12), e-posta doğrulama gate, giriş rate-limit, hash'li token.
- **Ödeme tasarımı:** Callback **kendine güvenmiyor**, imzalı PaymentList S2S ile SUCCESS teyidi + idempotent (CONSUMED). Tutar %100 sunucu/DB kaynaklı (manipülasyon yok). Kredi yükleme atomik + CAS claim. Cron'lar `CRON_SECRET` ile fail-closed. PCI yükü hosted form'da dışarıda.
- **Veri katmanı:** Klinik veri ayrı fiziksel DB'de izole, RLS canlıda açık (deny-all), `onDelete:Cascade` ile yetim klinik veri yok, idempotency altyapısı (`@unique` her yerde), additive+idempotent SQL migration'lar.
- **AI maliyet:** Tüm uçlar auth'lu, kredi atomik, **global görsel cache** (cache-hit ücretsiz), atölye tek ortak boğaz (`withCredits`), girdi uzunlukları capli, sonlu retry.
- **Kod kalitesi:** `tsc --noEmit` temiz (0 hata), yalnız 9 gerekçeli `any`, `@ts-ignore` yok, iyzico kalıntısı sıfır, pür billing primitive'leri `packages/billing`'de doğru.
- **Build:** CI var (typecheck+build bloklayıcı), `output:standalone` + `outputFileTracingRoot` doğru, `postbuild.mjs` fail-fast.
- **Marka:** iyzico kalıntısı sıfır, "11 araç" iddiası gerçek, ücretsiz başlangıç net, yasal kimlik (MERSİS/sicil/adres) eksiksiz.

---

## 9. Önerilen Sıralama

1. **Hafta 1 (blokerler):** B1 (iptal/cron) + B2 (KVKK rıza + veri minimizasyonu + metin) + `PAYNKOLAY_BASE_URL` fail-fast + 4 görsel ön-kredi + güvenlik başlıkları. Kritik-yol testleri yaz.
2. **Hafta 1-2 (gerçek-kart testi + gözlemlenebilirlik):** Sentry wire + callback hash doğrula + gerçek kartla uçtan-uca ödeme/iptal testi + CI'ye `pnpm test`.
3. **Hafta 2 (pazarlama yüzeyi):** SEO asset'leri + analitik + Atölye mobil grid + error/not-found sayfaları + runbook güncelle.
4. **Lansman sonrası:** RLS migration commit + pooler + reconcile dedup + KDV/fatura + kolon şifreleme (kart token) + P2/P3 borç.

---

*Bu rapor 10-perspektifli, adversarial-doğrulamalı bir kod denetiminin sentezidir. Tüm bulgular koddan `file:line` ile kanıtlanmıştır; ham bulgu verisi workflow çıktısında mevcuttur.*
