# LudenLab — Lansman Öncesi Denetim Raporu (2. Tur)

**Tarih:** 2026-07-02 · **Önceki denetim:** [LANSMAN_DENETIMI_2026-06-24.md](LANSMAN_DENETIMI_2026-06-24.md) (KOŞULLU GO, 5.5/10)
**Kapsam:** `apps/hub` (Studio + Atölye modülleri), `packages/{ai,billing,ui,config}`, 3 Prisma DB, Paynkolay, canlı Supabase advisor'ları
**Yöntem:** 8 boyut paralel ajan denetimi (her ajan Haziran raporundaki kendi bölümünü okuyup bugünkü kodla delta çıkardı; test ajanı `pnpm test` + `tsc` fiilen çalıştırdı) → P0/bloker bulgular için şüpheci doğrulama. Doğrulama dalgasının 5 ajanı oturum limitine takıldı; beş bloker iddiası bunun yerine doğrudan komutla çapraz-teyit edildi (aşağıda kanıtlarıyla). Mobil uyumluluk bu rapora dahil değil — 2026-07-01/02'de ayrıca denetlenip düzeltildi (`4fd1fa2`).
**Bulgu:** 52 (3 P0 · 20 P1 · 29 P2); 5'i lansman-kapısı olarak işaretli.

---

## 1. Karar: KOŞULLU GO — 6.0 / 10 (Haziran: 5.5)

Haziran'ın iki blokerinden **B1 (iptal→çekim sürer) kod düzeyinde kapandı** ve doğrulandı; **B2 (KVKK çocuk-verisi kümesi) ise tek satır bile değişmeden duruyor.** Mühendislik çekirdeği (kimlik, IDOR scope'ları, kredi atomikliği, migration disiplini) sağlamlığını koruyor ve mobil/kimlik/pazarlama yüzeyi belirgin toparlandı. Skoru aşağıda tutan üç şey: **KVKK (3.5, bloker)**, **test kapıları (3.5)** ve **gözlemlenebilirlik (Sentry=0)**. Dördü de mimari değişiklik istemeyen, günler mertebesinde kapatılabilir işler.

> **Özet:** Lansmanı engelleyen şey hâlâ kod kalitesi değil; **bir hukuki uyum kümesi + hiç yapılmamış bir gerçek-para provası + kör uçuş.**

## 2. Boyut Karnesi (Haziran → Bugün)

| # | Perspektif | Haz. | Bugün | Yön | Not |
|---|-----------|:----:|:-----:|:---:|-----|
| 1 | 🔐 Güvenlik & Kimlik | 7.5 | **7.0** | ↘ | Reset akışı örnek nitelikte + Next 16.2.6 CVE kapandı; ama suspend fiilen çalışmıyor (YENİ) + headers hâlâ yok |
| 2 | 💳 Ödeme (Paynkolay) | 4.5 | **6.0** | ↗ | **B1 kapandı (866dc1a, kod teyitli)**; downgrade akışı sağlam; gerçek-kart E2E hâlâ sıfır + 2 yeni P1 |
| 3 | ⚖️ KVKK / Hukuki | 3.5 | **3.5** | → | **B2'nin 4 maddesi de aynen açık** (PARK kararı); + hesap-silme vaadi yerine getirilemiyor (YENİ) |
| 4 | 🤖 AI Maliyet | 6.5 | **6.0** | ↘ | 4 görsel ucu ön-kredisiz (AÇIK); öğrenci-POST bedava Sonnet çağrısı (YENİ); cache zehirleme riski (YENİ) |
| 5 | 🗄️ Veri & DB | 7.0 | **7.5** | ↗ | B1 veri ayağı kapandı, 0009/0010 disiplinli; RLS migration + DDL ledger borcu duruyor |
| 6 | 🚀 Build / Deploy / Ops | 5.5 | **6.0** | ↗ | DEPLOY.md güncel, cron'lar fail-closed; **Sentry=0 (bloker)**, error sayfaları yok, renewal heartbeat yok |
| 7 | 🎨 Frontend / SEO | 6.0 | **6.5** | ↗ | Favicon/OG/kimlik/fiyat tutarlılığı tamam; analytics=0, robots/sitemap=0, 404/500=0 |
| 8 | 🧪 Test & Kalite | 3.5 | **3.5** | → | Sıfır ilerleme; hub'da 0 test; CI'de test adımı yok; lint advisory (19 error geçiyor); ai paketi 1611/1611 yeşil |

## 3. Go-Kapıları (kapanmadan canlıya ÇIKILMAMALI)

Beşi de bağımsız kanıtla teyitli (doğrulayıcı ajanlar koşamadığı için komutla çapraz-doğrulandı):

### G1. KVKK çocuk-verisi kümesi (B2 — Haziran'dan aynen açık) — P0
- **Kanıt:** `prompts/index.ts:212` hâlâ `- İsim: ${ctx.name}` (+ 6 studio ucu + atölye `bep-prompts.ts:15` — "rumuz" alanı gerçekte Ad Soyad); `kayit/page.tsx` tek birleşik onay (granüler m.6/m.9 rızası yok); `(legal)/kvkk/page.tsx:83` aktarım alıcısı olarak **yalnız Anthropic** (OpenAI varsayılan görsel sağlayıcı + fal/Flux beyansız); `schema.prisma:8` "PII YOK" çelişkisi.
- **Yapılacak:** (1) Prompt'lardan gerçek adı çıkar (baş harf/rumuz — `formatStudentContext`, `profilToPrompt`, `bep-prompts`, 5 studio route şablonu), (2) ayrı opt-in rıza + zaman damgası, (3) yasal metinlere OpenAI + fal ekle, (4) şema yorumunu düzelt.

### G2. Gerçek kartla uçtan uca ödeme provası — P1 ama go-şartı
- **Kanıt:** `subscription-renewal/route.ts:21-23` açık TODO (duplicate `clientRefCode` davranışı bilinmiyor); token doluşu best-effort (`odeme/sonuc:71-78`); callback hash hâlâ doğrulanmamış (`paynkolay-hash.ts:88`). Haziran ZORUNLU checklist maddesi işaretsiz.
- **Yapılacak:** Prod merchant'ta 1 gerçek tahsilat → PaymentList teyidi → `listSavedCards` token doluşu → aynı `clientRefCode` ile 2. charge denemesi → 1 iptal→cron-atlama döngüsü; callback POST gövdesini loglayıp hash formülünü sabitle.

### G3. Gözlemlenebilirlik: Sentry + hata sayfaları — P0
- **Kanıt:** repo genelinde `instrumentation.ts`/`Sentry.init` = **0** (paket kurulu, kablo yok); admin health sayfası var olmayan Sentry'ye yönlendiriyor; `error.tsx`/`not-found.tsx`/`global-error.tsx` = 0. Para çeken renewal cron'unun heartbeat'i yok → ölürse kimse görmez.
- **Yapılacak:** Sentry wizard (instrumentation + onRequestError + DSN) + TR marka dilinde error/not-found/global-error + renewal cron heartbeat'i.

### G4. Para-yolu kritik testleri — P1, go-şartı (Haziran'dan taşındı)
- **Kanıt:** `apps/hub` içinde `describe(` = **0 dosya**; CI'de test adımı yok; bu arada para-yolu kodu testsiz değişti (B1 fix + downgrade). En yüksek kaldıraçlı 5 hedef raporda listeli (paynkolay-hash golden vector, credits/entitlement matrisi, central-billing CAS claim, renewal cron filtreleri, cancel çift-yazım + sonuc SUCCESS-şartı).
- **Minimum:** `pnpm test`'i CI'ye ekle (938 ms, hazır) + 5 hedefe vitest.

### G5. Atölye cleanup cron'unun Hostinger'a kurulması — 5 dakikalık operasyon
- **Kanıt:** endpoint hazır ve auth'lu (`atolye/api/cron/subscription-cleanup`); hPanel'de kurulu değil (hafıza kaydı) → iptal eden atölye kullanıcısı süresiz ücretli erişimde kalır (B1'in operasyonel son ayağı).

## 4. Yeni Kritik Bulgular (Haziran'da yoktu — lansman penceresinde kapat)

| Sev. | Bulgu | Dosya | Özü |
|---|---|---|---|
| P1 | **Reconcile kredi claim'i dönem-sonu penceresinde her render'da tekrar yüklüyor** | `modules/studio/lib/central-billing.ts:120` (+atölye eşi) | `lastCreditedPeriodEnd <= now+1g` koşulu periodEnd ilerlemeden tekrar tekrar true olur; token'sız ACTIVE abonelikte süresiz bedava kredi. **Fix tek satır:** claim WHERE'ine `lastCreditedPeriodEnd < periodEnd` ekle |
| P1 | **Başarısız yenileme PAST_DUE ölü ucu** | `subscription-renewal/route.ts:42` | Cron yalnız ACTIVE seçiyor; tek banka reddi = kalıcı sessiz churn. Sorguya PAST_DUE + deneme sayacı + kullanıcı e-postası |
| P1 | **Suspend fiilen çalışmıyor** | `auth.ts:61` | Modül admin'i yerel bayrağı yazıyor, giriş hiç set edilmeyen merkezi `Account.suspended`'a bakıyor, köprüler hiç okumuyor |
| P1 | **Hesap silme çapraz-DB yetim + self-heal diriltmesi** | `studio/api/admin/users/route.ts:105` | Merkezi Subscription (kart token'lı!) silinmiyor → silinen kullanıcıdan çekim sürebilir; self-heal hesabı yeniden yaratıyor; gizlilik "tümü silinir" vaadiyle çelişki |
| P1 | **Öğrenci-oluşturma bedava Sonnet çağrısı** | `studio/api/students/route.ts:96` | Rate-limitsiz + kredisiz `after()` AI çağrısı, sonucu da kaydedilmiyor (saf israf + farming: ~$12/saat/hesap) |
| P2 | **Görsel cache zehirleme** | `packages/ai/src/image/cacheKey.ts:11` | Global kelime-anahtarlı cache'e ilk yazan kazanır → tek kötü hesap tüm hesapların kelime görselini zehirler; admin temizleme aracı yok |

## 5. Haziran P1'lerinden Hâlâ Açık Olanlar (özet)

- `PAYNKOLAY_BASE_URL` sessiz sandbox fallback — prod fail-fast yok (`lib/paynkolay.ts:19`)
- 4 görsel ucunda ön kredi kontrolü yok (`comm-board|phonation|social-story|matching-game/images` — desen `articulation/images:80`'de hazır, kopyala)
- Güvenlik başlıkları yok (`next.config.ts` — headers() hiç tanımlı değil)
- Studio public RLS migration'ı repoda yok + `withRls()` ölü kod; modül DDL'lerinin bir kısmı yalnız yorumda (çift `0006` numarası, ledger yok)
- Merkezi env doğrulama yok; `.env.example` setleri eksik/bayat (ATOLYE_DATABASE_URL, CRON_SECRET, ANTHROPIC_API_KEY şablonda yok; kök dosya iyzico'ya işaret ediyor)
- Analytics = 0, robots.ts/sitemap.ts = 0, Studio SSS hâlâ "havale" vaat ediyor
- Kosullar 14 gün cayma + oransal iade vaat ediyor; kodda hiçbir iade yolu çağrılmıyor (`cancelOrRefund` hazır ama kullanılmıyor)
- Kök dizinde 11 bayat planlama .md'si (DEPLOY_CUTOVER.md iyzico dikte ediyor) — arşivle
- Bağlantılar 5432 direct (pooler TODO) — tek Node süreci gerçeğiyle şimdilik P2

## 6. Hızlı Kazanımlar (her biri ≤1 saat)

1. Reconcile claim'e `lastCreditedPeriodEnd < periodEnd` şartı (2 dosya, kredi sızıntısını kapatır)
2. 4 görsel ucuna articulation'daki ön-kredi bloğu
3. `next.config.ts` headers() (HSTS/XFO/XCTO/Referrer-Policy)
4. Paynkolay prod fail-fast (BASE_URL/sx/secret boş veya "test" içeriyorsa throw)
5. CI'ye `pnpm test` satırı + lint'te `continue-on-error` kaldırma (19 error temizliği ile)
6. robots.ts + sitemap.ts + `/studio` `/atolye` sayfa metadata'ları
7. error.tsx / not-found.tsx / global-error.tsx (poster dili hazır)
8. SSS "havale" ibaresi + destek@/merhaba@ kutularının açılması/forward
9. Atölye cleanup cron'unu hPanel'e ekleme
10. `[central reconcile]` loglarında e-posta → hesap id

## 7. Kapananlar / Güçlü Yönler (korunmalı)

- **B1 tamamen kapandı (kod):** cancel/resume 4 route merkezi Subscription'ı yazıyor; cron ACTIVE-filtreli; reconcile iptali geri almıyor — Haziran'ın para-kaybı senaryosu kod düzeyinde bitti
- **Zamanlanmış downgrade doğru kurgulanmış:** ödemesiz pending → cron dönem sonunda düşük fiyattan uygular; "Vazgeç" güvenli
- **Parola-sıfırlama örnek nitelikte:** enumeration-safe, sha256+expiry+tek-kullanım, rate-limitli
- Next 16.2.6 (middleware-bypass CVE kapalı) · IDOR scope'ları tam · admin gating sağlam · kredi akışları atomik (CAS+ledger) · migration disiplini (0009/0010) · cron'lar fail-closed CRON_SECRET · görsel cache mimarisi çalışıyor · `tsc` temiz · packages/ai 1611/1611 yeşil (938 ms) · DEPLOY.md gerçekle uyumlu · fiyat tutarlılığı tek kaynak · kimlik/OG/favicon tamam

## 8. Önerilen Sıra

1. **Gün 1-2 — G1 (KVKK):** veri minimizasyonu + ayrı rıza + yasal metin + şema yorumu. Ardından hızlı kazanımlar #1-4.
2. **Gün 3 — G3 (görünürlük):** Sentry + error sayfaları + renewal heartbeat + health endpoint.
3. **Gün 4 — G4 (testler):** CI'ye `pnpm test`; 5 para-yolu hedefine vitest; lint kapısını gerçek yap.
4. **Gün 5 — G2 (prova):** Gerçek kartla E2E paket (tahsilat/token/duplicate-ref/iptal/callback-hash yakalama) + G5 cron kurulumu + hızlı kazanımlar #6-10.
5. **Lansman günü:** `page.tsx` → `<FullLanding/>` (tek hamle, kodda dokümante) + robots/sitemap canlı + analytics olayları akıyor.

---
*Not: Bu denetim 8 paralel ajan + kısmi adversarial doğrulama ile yapıldı; 5 doğrulayıcı ajan oturum limitine takıldığından bloker iddiaları rapor sahibi tarafından doğrudan kanıt komutlarıyla (grep/find, satır alıntıları yukarıda) çapraz-teyit edildi. Skorlar bu teyide dayanır.*
