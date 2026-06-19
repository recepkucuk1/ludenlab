# Görselli Çalışma Kâğıdı + Görsel Kalite Düzeltmeleri — Tasarım Dokümanı

- **Tarih:** 2026-06-19
- **Durum:** Onaylandı (implementasyon planı bekleniyor)
- **Bağlam:** Artikülasyon görsel üretimi canlıya alındı; gerçek kullanımda çıkan sorunların düzeltmesi + "işe yarar çalışma kâğıdı" iterasyonu. İlk özelliğin spec'i: `docs/superpowers/specs/2026-06-19-artikulasyon-gorsel-uretim-design.md`.

## 1. Amaç

Artikülasyon sonucunu **görsel-odaklı flashcard çalışma kâğıdına** dönüştürmek (hem tablet ekranı hem baskı) ve canlıda gözlenen görsel/PDF bug'larını düzeltmek.

## 2. Kararlar (özet)

| Karar | Sonuç |
|---|---|
| Düzen | **Flashcard grid** — kart = büyük görsel + altında kelime (hedef ses renkli vurgulu) |
| Sütun | **3 sütun** (~9 kart/sayfa); izole/hece'de görsel yoksa büyük kelime kartı |
| Kapsam | **Tüm seviyeler** (kelime/cümle/izole/hece/bağlam); görseli olmayan kelime görselsiz kart |
| Sütun temizliği | **Heceler + Pozisyon sütunları kaldırılır** |
| Görünüm | Ekran (tool sonuç + kütüphane) **ve** PDF aynı flashcard düzeni |
| PDF erişimi | Tool sayfasına da **"Çalışma Kâğıdı (PDF)"** düğmesi (şu an sadece kütüphanede) |

## 3. Flashcard grid (ekran + PDF)

Mevcut tablo görünümü (`# / Kelime / Heceler / Pozisyon / Görsel`) yerine kart grid'i:
- **Kart:** üstte büyük görsel (yoksa boş/placeholder), altında kelime; kelimede **hedef ses vurgulanır** (mevcut `highlightSound` mantığı korunur).
- **Seviyeye göre içerik:**
  - *Kelime:* görsel + kelime
  - *Cümle:* görsel + kelime + altında küçük örnek cümle
  - *İzole / hece:* genelde görsel yok → ortalanmış büyük kelime kartı (grid tutarlı kalır)
- **3 sütun**, kartlar arası tutarlı boşluk; baskıda A4'e, tablette de okunur.
- Tool sayfası içindeki `DrillResultView` ve kütüphanedeki `ArticulationView` aynı grid mantığını kullanır (ortak bir kart bileşeni hedeflenir; mevcut seviye-özel view'lar grid'e indirgenir).

## 4. PDF — çalışma kâğıdı + çökme düzeltmesi

- **Yeni düğme:** Tool sayfası sonucuna "Çalışma Kâğıdı (PDF)" eklenir (kütüphanedeki mevcut PDF de flashcard grid düzenine geçer).
- **PDF Image çökme bug'ı (kritik):** `cards/[id]/page.tsx` `downloadArticulationPDF` içinde tek bir bozuk/erişilemeyen görsel URL'i react-pdf'i komple çökertiyor. Düzeltme: her görseli **güvenli sarmala** — yüklenemeyen görsel o kartı görselsiz bırakır, PDF yine üretilir. (react-pdf `Image` hata davranışına göre: yalnız geçerli/erişilebilir URL'leri bas; gerekiyorsa üretimden önce URL doğrulaması / try-catch ile kart-bazlı atlama.)
- Layout: flashcard grid (3 sütun); başlık + hedef sesler; opsiyonel uzman notu/veli rehberi alt bölümleri korunur.

## 5. Görsel kalite düzeltmeleri

### 5.1 Boş visualPrompt → Türkçe kelimeye düşme KALDIRILIR
Kök neden: `planImageGeneration` boş `visualPrompt`'u `?? word`'e düşürüyor → `"a single vücut"` (Türkçe) → model karışıyor / OpenAI moderasyonu reddediyor ("vücut", "havuç" başarısızlıkları).
- **Çözüm:** Fallback Türkçe kelimeye düşmesin. Somut kelimeler için Claude **her zaman İngilizce `visualPrompt`** üretsin (system prompt sıkılaştırma). Gerçekten görselleştirilemeyen kelime için `visualPrompt` boş kalır ve o kelime **görsel hedefinden çıkarılır** (`plan.ts`: boş visualPrompt → `skipped` "no_visual"; word'e düşme yok). Görselsiz kart sorun değil (grid tutarlı).

### 5.2 "no text" güçlendirme (STYLE_VERSION v2)
`buildImagePrompt` stil şablonuna `no text, no letters, no words, no labels` eklenir → "sabun→SOAP yazısı" gibi ihlaller azalır (model sınırı; %100 garanti değil). `STYLE_VERSION` → **v2**.

### 5.3 Claude visualPrompt tutarlılığı
SYSTEM_PROMPT'a: "visualPrompt, `word` ile **birebir aynı nesneyi** betimlemeli; alakasız nesne yazma" netliği → "top→çiçek" türü tutarsızlıkları azaltır.

### 5.4 Cache notu
`STYLE_VERSION` v2 → yeni cache anahtarı; eski v1 görseller (ör. SOAP'lı sabun) cache'te kalır ama yeni üretimlerde v2 kullanılır (eski otomatik yenilenmez). Eski cache temizliği YAGNI — gerekirse ayrı yapılır.

## 6. Etkilenen dosyalar

| Dosya | Değişiklik |
|---|---|
| `apps/hub/src/app/studio/(main)/tools/articulation/page.tsx` | DrillResultView → flashcard grid; "Çalışma Kâğıdı (PDF)" düğmesi |
| `apps/hub/src/modules/studio/components/cards/ArticulationView.tsx` | flashcard grid (salt-okunur) |
| `apps/hub/src/app/studio/(main)/cards/[id]/page.tsx` | `downloadArticulationPDF` → flashcard grid + görsel güvenli sarma |
| `packages/ai/src/image/imagePrompt.ts` | "no text" güçlendirme + STYLE_VERSION v2 |
| `packages/ai/src/image/plan.ts` | boş visualPrompt → skip ("no_visual"), Türkçe-word fallback kaldır |
| `apps/hub/src/app/studio/api/tools/articulation/route.ts` | SYSTEM_PROMPT: İngilizce visualPrompt zorunlu + word-eşleşme netliği |
| `packages/ai/src/image/*.test.ts` | yeni stil/fallback için test güncellemeleri (TDD: plan + imagePrompt) |

## 7. Kapsam

**Bu iterasyon:** flashcard grid (ekran+PDF, tüm seviyeler, 3 sütun, hece/pozisyon yok) · PDF çökme düzeltmesi · tool page PDF düğmesi · visualPrompt fallback düzeltmesi · no-text v2 · Claude prompt netliği.

**Dışı (sonra):** eski v1 cache temizliği · "yeniden üret" / elle yükleme · görsel stil tutarlılığı (outline) ince ayarı · sağlayıcı kıyası (Flux).

## 8. Doğrulama disiplini

Saf mantık (`plan.ts` boş-visualPrompt skip, `imagePrompt.ts` v2) → vitest TDD. UI/PDF (grid, PDF güvenli görsel) → manuel typecheck + Claude Preview. Gerçek görsel üretimi (prompt değişikliklerinin etkisi) → canlı/gerçek key ile gözlem.
