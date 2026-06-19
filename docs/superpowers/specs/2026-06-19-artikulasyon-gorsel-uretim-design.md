# Artikülasyon Görsel Üretimi — Tasarım Dokümanı

- **Tarih:** 2026-06-19
- **Durum:** Onaylandı (implementasyon planı bekleniyor)
- **Kapsam:** AI araçlarına görsel üretim yeteneği eklemek; ilk tüketici artikülasyon aracı.

---

## 1. Amaç

Artikülasyon aracında üretilen kelimeleri **danışana gösterilecek görsel ipuçlarına** dönüştürmek ve dokümana (kart görünümü + PDF) entegre etmek. Görseller tanınabilir, tutarlı ve çocuk-dostu olmalı (çocuk resme bakıp kelimeyi tanıyacak/söyleyecek).

Claude (Anthropic) görsel **üretmez**; bu yüzden ayrı bir görsel-üretim sağlayıcısı entegre edilir. Mimari sağlayıcı-bağımsız kurulur; başlangıç sağlayıcısı **OpenAI GPT Image 1 Mini**, POC'ta Flux (fal.ai) ile karşılaştırılır.

## 2. Mevcut durum (bağlam)

- Monorepo: tek app `apps/hub`; studio ve atölye modül. Artikülasyon **studio** modülünde.
- Üretim: `apps/hub/src/app/studio/api/tools/articulation/route.ts` → `createToolHandler` → Claude `claude-sonnet-4-6`. Maliyet 15 kredi.
- Drill çıktısı `Card.content` (JSON); `items[]` her biri `word`, `syllableBreak`, `position`, `sentence`, **`visualPrompt`** (şu an sadece metin, ör. `"sandal görseli"`).
- Görünüm: `apps/hub/src/modules/studio/components/cards/ArticulationView.tsx`. PDF: `CardPDFDocument.tsx` — `@react-pdf/renderer`, zaten `<Image>` destekliyor.
- AI deseni: `packages/ai/src/client.ts`, `usage.ts`; studio tarafı `apps/hub/src/modules/studio/lib/{anthropic,toolHandler,usage}.ts`. Kredi düşümü atomik transaction; telemetri `ApiUsageLog`.
- **Storage yok:** Supabase Storage yapılandırılmamış; avatarlar DB'de data-URL (300KB). Üretilen görseller için uygun değil → bucket kurulacak.

## 3. Kararlar (özet)

| Karar | Sonuç |
|---|---|
| Görselin amacı | Danışana görsel ipucu (tek-nesne, tanınabilir, çocuk-dostu) |
| Kapsam | `packages/ai` içinde sağlayıcı-bağımsız genel servis; ilk tüketici artikülasyon |
| Başlangıç modeli | GPT Image 1 Mini; mimari sağlayıcı-bağımsız; POC'ta Flux teyit |
| Prompt kaynağı | Claude her kelimeye **İngilizce `visualPrompt`** yazar (disambiguation) |
| Cache | Kelime bazında **global, kalıcı** |
| Kredi | **Her görsel teslimatı 1 kredi (koşulsuz)**; cache yalnız iç telemetri; başarısız teslimat ücretsiz |
| Üretim birimi | Her zaman **tek nesne**; toplu "çalışma sayfası" koddan kolaj (modelden değil) |
| Üretim akışı | Formda "görselli üret" kutusu (toplu) + sonradan tek tek ekleme |
| Storage | Supabase Storage `tool-images` bucket, public-read |
| DB | `GeneratedImage` tablosu → Studio DB (`HUB_DATABASE_URL`) |
| MVP dışı (sonraki faz) | "Yeniden üret" (beğenmeyince) + "elle görsel yükle" |

## 4. Mimari

### 4.1 Sağlayıcı-bağımsız görsel servisi — `packages/ai/src/image/`

`packages/ai/src/client.ts` desenine paralel yeni modül. Tüm çağrılar backend-only.

```
ImageProvider (arayüz)
  generate(prompt: string, opts): Promise<{ bytes: Uint8Array; model: string; rawCost?: number }>

OpenAIImageProvider   → gpt-image-1-mini   (başlangıç varsayılanı)
FluxProvider          → fal.ai flux/schnell (POC / alternatif)

generateImage(input): Promise<GeneratedImageResult>
  // cephe: cache kontrolü + üretim + storage + DB kaydı + URL
```

`generateImage()` akışı (tek kelime için):
1. `key = normalize(word) + styleVersion + model` ile `GeneratedImage` tablosunda ara.
2. **HIT** → kayıtlı `publicUrl` döner; `cacheHit=true`. (Üretim yapılmaz.)
3. **MISS** → seçili provider ile üret → Supabase Storage'a yükle → `GeneratedImage` satırı oluştur → `publicUrl` döner; `cacheHit=false`.
4. Provider env'den seçilir: `IMAGE_PROVIDER=openai|flux`.

### 4.2 Prompt: Claude yazar, görsel modeli çizer

İşbirliği modeli — "Claude'a ek görsel üretim" vizyonu:

- Claude drill üretirken (system prompt güncellenir) her kelime için **kısa, net, İngilizce** bir `visualPrompt` üretir. Bu, anlam belirsizliğini çözer: "sandal" → bağlama göre `"a sandal (footwear)"` veya `"a small rowing boat"`. Claude zaten çağrıldığı için ek maliyet ~0.
- Görsel modeline giden nihai prompt = **sabit stil şablonu** + Claude'un kelime tanımı:

  > `Simple friendly flat illustration of a single {visualPrompt}, centered, plain white background, bright cheerful colors, clear recognizable shape, no text, children's educational flashcard style.`

- Sabit stil + tek-sefer-üretim + global cache = **tutarlılık garantisi** (aynı kelime hep aynı görsel).

### 4.3 Cache anahtarı ve normalize

- Anahtar: `(wordNormalized, styleVersion, model)` — **unique**.
- `normalize`: Türkçe küçük harf (`toLocaleLowerCase("tr")`), `trim`, baş/son noktalama temizliği. (Ek/çekim normalizasyonu MVP dışı.)
- `styleVersion`: stil şablonu değişirse artırılır (ör. `"v1"`); eski görseller geçersiz kılınmadan yeni stil ayrı cache'lenir.
- **Global cache:** görsel yalnız kelimeden üretilir, öğrenci PII içermez → bir terapistin "sandal"ı tüm platformda yeniden kullanılır.
- **Bilinen sınır (kabul edilen):** aynı kelimenin farklı anlamı (sandal = ayakkabı/kayık) tek görsele düşer. Nadir; gerekirse ileride anahtar bağlamla genişletilir.

## 5. Veri modeli + storage

### 5.1 `GeneratedImage` (Studio DB / Prisma `apps/hub/prisma/studio/schema.prisma`)

| Alan | Tip | Not |
|---|---|---|
| `id` | String (cuid) | PK |
| `wordNormalized` | String | normalize edilmiş kelime |
| `styleVersion` | String | ör. "v1" |
| `model` | String | ör. "gpt-image-1-mini" |
| `prompt` | String @db.Text | modele giden nihai prompt (denetim) |
| `storagePath` | String | bucket içi yol |
| `publicUrl` | String | kalıcı URL |
| `createdAt` | DateTime | |

- **Unique:** `(wordNormalized, styleVersion, model)`.
- **Yalnız başarılı (ready) görseller yazılır.** Başarısız üretim cache'e yazılmaz (tekrar denenebilsin), yalnız telemetride `failed` loglanır.

### 5.2 Snapshot

Üretilen/cache'ten gelen URL, `Card.content.items[].imageUrl` alanına da yazılır (PDF/kalıcılık snapshot'ı). Yani: global cache (maliyet) **+** karta gömülü URL (sunum/kalıcılık).

### 5.3 Storage

- Supabase Storage bucket `tool-images`, **public-read** (görseller hassas değil, CDN hızı).
- Backend yüklemesi için `@supabase/supabase-js` + `SUPABASE_SERVICE_ROLE_KEY`.

## 6. Üretim akışı (uçtan uca)

```
Terapist drill üretir
  ├─ "görselli üret" işaretli → drill JSON + her kelimeye İngilizce visualPrompt
  │     → kelimeler için cache lookup
  │     → cache-miss'ler PARALEL üretilir (latency için), cache-hit'ler anında
  │     → URL'ler Card.content.items[].imageUrl'e yazılır + global cache'te kalır
  │     → kart görünümü + PDF'te görsel
  └─ işaretsiz → drill görselsiz gelir; terapist kart görünümünde
        kelime başına "görsel ekle" ile tek tek üretir
```

## 7. Kredi modeli

- **Her başarılı görsel teslimatı = 1 kredi**, cache-hit veya cache-miss fark etmez. Terapise fiyat koşulsuz/öngörülebilir ("15 kelime = 15 kredi").
- **Cache-hit/miss yalnız iç telemetri:** `ApiUsageLog` benzeri kayda `cacheHit` alanı; operatör cache oranını ve marjı görür. Cache-hit'ler ~%100 marj.
- **Yalnız başarı ücretlenir:** moderasyon reddi / teknik hata ile üretilemeyen görselin kredisi alınmaz.
- Atomiklik: mevcut `toolHandler.ts` transaction deseni — görsel kredileri ayrı `CreditTransaction` (`SPEND`, "Görsel üretimi") + telemetri.
- Ön-kontrol: "görselli üret" işaretliyse kelime sayısı kadar kredi gerekir; yetersizse engelle (mevcut pre-check deseni).

## 8. Güvenlik / uygunluk / fallback

- **Moderasyon reddi:** item görselsiz kalır → "üretilemedi" işareti + kredi alınmaz; terapist tekrar deneyebilir.
- **Çocuk güvenliği:** stil prompt'unda "children's educational, safe, friendly, single object"; içerik somut nesneler → risk düşük.
- **Teknik hata:** 1–2 retry, sonra graceful fail (görselsiz, kredi yok). Storage yüklemesi başarısızsa kredi yok (atomiklik).
- **Telemetri:** her üretim loglanır (model, ham maliyet, cacheHit) — maliyet/marj izleme.

## 9. Doküman + PDF entegrasyonu

- **Kart görünümü** (`ArticulationView.tsx`): her kelimenin yanında görsel (`item.imageUrl` varsa); yoksa **"görsel ekle"** butonu (tek tek üretim yolu).
- **PDF** (`CardPDFDocument.tsx`): `<Image>` ile public URL doğrudan basılır.
- **Çalışma sayfası (toplu):** cache'li ayrı görseller **kodla N'li grid'e** dizilir (react-pdf/HTML layout) — modelden değil. "Çalışma sayfası indir" eylemi. Hem tek-tek kart hem toplu sayfa desteklenir, cache bozulmadan.

## 10. Yeni altyapı + env

- `packages/ai/src/image/` — arayüz + OpenAI/Flux adapter + `generateImage()` cephesi + cache.
- `@supabase/supabase-js` bağımlılığı + `tool-images` bucket (public-read).
- Prisma `GeneratedImage` tablosu + migration (Studio DB).
- Claude studio system prompt güncellemesi (İngilizce `visualPrompt`).
- Env (`.env.example`):
  - `OPENAI_API_KEY` — görsel üretimi
  - `IMAGE_PROVIDER=openai`
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `TOOL_IMAGES_BUCKET=tool-images`

## 11. Kapsam

**MVP:** sağlayıcı-bağımsız servis (OpenAI başlangıç) · global cache · Supabase Storage · `GeneratedImage` + migration · Claude visualPrompt · "görselli üret" kutusu (toplu, paralel) · kart görünümünde tek-tek "görsel ekle" · PDF görseli · çalışma sayfası kolajı · kredi (1/görsel koşulsuz) · telemetri (cacheHit) · POC: GPT Image Mini vs Flux temsili kelimelerle.

**MVP dışı (sonraki faz):** beğenmeyince "yeniden üret" · "elle görsel yükle/değiştir" · ek/çekim normalizasyonu · anlam-bağlamlı cache anahtarı · görseli diğer araçlara (sosyal hikaye, materyal) yayma (servis hazır olacak).

## 12. Riskler / açık notlar

- **Latency:** 15 kelimelik toplu üretimde cache-miss'ler paraleldir ama yine birkaç saniye sürebilir; ilerleme göstergesi. İleride job-queue gerekebilir.
- **Storage ilk kurulum:** Supabase Storage henüz yok; bucket + servis anahtarı + (gerekiyorsa) RLS/policy ilk kez yapılandırılacak.
- **Sağlayıcı kararı POC'a bağlı:** mimari sağlayıcı-bağımsız; başlangıç GPT Image Mini, gerçek görsel kalitesiyle teyit.
- **OpenAI moderasyonu** nadir somut kelimelerde aşırı tetiklenebilir → fallback zaten görselsiz + ücretsiz.
