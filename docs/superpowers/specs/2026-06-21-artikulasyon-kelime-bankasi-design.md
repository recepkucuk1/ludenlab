# Artikülasyon Küratе Kelime Bankası — Tasarım Dokümanı

- **Tarih:** 2026-06-21
- **Durum:** Onaylandı (implementasyon planı bekleniyor)
- **Bağlam:** Artikülasyon aracının kelime üretimi canlıda güvenilmez çıktı veriyor. Bu doküman, AI kelime üretimini **küratе (uzman-onaylı) kelime bankasıyla** değiştirerek kalite + sayı garantisi getirir. İlk özellik spec'i: `docs/superpowers/specs/2026-06-19-artikulasyon-gorsel-uretim-design.md`.

## 1. Problem (canlı denetim, 2026-06-21)

Üç katmanlı, tekrarlayan sorun:

- **Kelime kalitesi (kök neden):** Claude uydurma kelime ("dop" — "top"u zorla /d/ yapmış), soyut edat ("kadar" — görselleştirilemez, boş kart) ve yanlış-ses kelime (geçmiş: /ç/'de "güneş", /k/'de "balon"/"çorap") üretiyor. SYSTEM_PROMPT zaten "uydurma kelime KULLANMA" diyor (satır 22-23) **ama model kuralı çiğniyor.** Hedef-harf filtresi yanlış-*sesi* yakalıyor; harfi-içeren-ama-uydurma ("dop") veya soyut ("kadar") kelimeyi yakalayamıyor.
- **Sayı:** 10 istendi, 7 geldi — filtre 3 geçersiz kelimeyi sessizce attı, yerine yenisini koymadı.
- **Görsel güvenilirliği:** Aralıklı görsel düşmesi (FLUX transient/bakiye flicker'ı). [[artikulasyon-gorsel-uretim]] İterasyon 7'de retry eklendi.

**Sonuç:** Prompt kuralları, klinik bir araç için kelime kalitesini garanti edemez. Çözüm deterministik olmalı.

## 2. Amaç

Kelime **kalitesini ve sayısını deterministik garanti et**: her hedef ses × pozisyon için uzman-onaylı, gerçek + somut + yaşa-uygun Türkçe kelime bankası. Görsel güvenilirliğini ayrıca sağlamlaştır.

## 3. Kararlar (özet)

| Karar | Sonuç |
|---|---|
| Kelime kaynağı | **Küratе banka** (AI değil) — banka-içi sesler için |
| İlk kapsam | **8 ses:** k, g, r, l, y, s, ş, z × 3 pozisyon (başta/ortada/sonda) |
| Hacim | Ses×pozisyon başına **hedef ≥30** kelime — *Türkçe ses-bilgisinin izin verdiği yerde* (sonda /g/, /z/ nadirdir → var olan kadarı, uzman onayıyla) |
| Tema | **TAMAMEN KALDIRILDI** (form + şema + prompt + UI) |
| Banka-dışı sesler | Mevcut AI yolu korunur (araç tüm seslerde çalışmaya devam eder; banka zamanla büyür) |
| Kelime düzeyi | **Tamamen bankadan** — Claude kelime üretmez |
| Cümle / bağlam | Kelime bankadan; Claude o kelime(ler) için cümle/paragraf yazar |
| İzole / hece | Değişmedi (kelime-kalitesi sorunu yok) |

## 4. Mimari

### 4.1 Banka verisi
`packages/ai/src/articulation/wordBank.ts`

```ts
export interface BankWord {
  word: string;          // gerçek Türkçe kelime: "dolap"
  syllableBreak: string; // "do-lap"
  visualPrompt: string;  // İngilizce, somut: "a wooden wardrobe cabinet"
}
type Position = "initial" | "medial" | "final";
export const WORD_BANK: Record<string /* ses, ör. "k" */, Record<Position, BankWord[]>>;
```

- Anahtar = sesin sade harfi ("k", "g", "ş", "z" …). Endpoint hedef sesi (`/k/`) sade harfe indirger.
- Tüm girdiler **uzman-onaylı** (Bölüm 6).
- `syllableCount` runtime'da `syllableBreak`'ten türetilir (tire sayısı + 1) — ayrı alan tutulmaz (tek doğruluk kaynağı).

### 4.2 Seçici (saf mantık, TDD)
`packages/ai/src/articulation/selectWords.ts`

```ts
export interface SelectedWord extends BankWord {
  position: Position;
  syllableCount: number;
}
export function selectWords(
  bank: typeof WORD_BANK,
  sound: string,
  positions: Position[],
  count: number,
  rng?: () => number, // test için enjekte edilebilir; vars. Math.random
): SelectedWord[];
```

- Seçilen pozisyonların **birleşiminden** rastgele, **tekrarsız** en fazla `count` kelime.
- Mevcut < count ise mevcut olanların hepsi döner (çağıran kaç döndüğünü bilir).
- `Math.random` çağrı bağımlılığı `rng` ile enjekte edilir → deterministik test.

### 4.3 Entegrasyon (endpoint: `apps/hub/.../tools/articulation/route.ts`)
- **Banka-içi ses + kelime düzeyi:** `selectWords` ile item'lar kurulur (word, syllableBreak, syllableCount, position, targetSound, visualPrompt). Claude **yalnız sarmalı** yazar (title, expertNotes, cueTypes, homeGuidance — öğrenci adı/yaş/tanıya göre); item'lar bankadan enjekte edilir, Claude'un ürettiği item'lar yok sayılır.
- **Banka-içi ses + cümle/bağlam:** `selectWords` ile kelimeler seçilir; bu kelimeler Claude prompt'una **verilir** ("şu kelimeler için cümle/paragraf yaz, başka kelime ekleme"); visualPrompt bankadan gelir.
- **Banka-dışı ses (her seviye):** mevcut AI akışı (hedef-harf filtresi güvence olarak kalır).
- **İzole / hece (her ses):** mevcut akış.

> Not: Mekanik detay (createToolHandler kancası: item enjeksiyonu / seçili-kelime prompt'u) implementasyon planında çözülür.

### 4.4 Görsel güvenilirliği (kelime kaynağından bağımsız)
- FluxProvider retry — **yapıldı** ([[artikulasyon-gorsel-uretim]] İter.7).
- **Net hata mesajı:** Görsel servisi geçici başarısızsa, boş kart + sessiz "+görsel" yerine kullanıcıya "görsel servisi geçici dolu, biraz sonra 'görsel ekle' ile tamamla" benzeri açık bilgi (page.tsx görsel akışı).
- Bakiye: operasyonel (fal.ai auto-recharge önerisi — kod değil).

## 5. Banka boyutu & ses-bilgisi gerçeği

- Hedef ses×pozisyon başına **≥30**; ancak Türkçe sözcük-sonu sertleşmesi nedeniyle bazı **sonda** pozisyonları doğal olarak azdır: **sonda /g/ ≈ yok** (g→k), **sonda /z/ sınırlı**. Bu listeler "var olan kaliteli kelime kadar" olur ve uzman onayında açıkça işaretlenir. Bol pozisyonlar (tüm başta; sonda /k/ /s/ /ş/ /l/ /r/) 30+ rahat karşılar.
- Bir alıştırma seçilen pozisyon(lar)dan toplam yeterli kelime bulamazsa (ör. yalnız "sonda /z/" + 30 öğe), araç var olan kadarını döndürür ve eksikse kullanıcıya bilgi verir (sessiz kısaltma yok).

## 6. Banka kurma & onay iş akışı

1. **Üretim (ben, tek seferlik, offline):** Her banka-içi ses × pozisyon için aday liste — kelime + hece bölünmesi + İngilizce visualPrompt. Dikkatli, ses-bilgisi-duyarlı (sertleşme, yaş-uygunluk, somutluk).
2. **Onay (uzman = kullanıcı):** Listeler **ses-ses** (yönetilebilir parça) sunulur; kullanıcı onaylar / düzeltir / çıkarır. Türkçe ses-bilgisi ve klinik uygunluk kullanıcının alanı.
3. **Commit:** Onaylı liste `wordBank.ts`'e işlenir.

> Bu iş akışı implementasyon planında ses-başına görev olarak parçalanır (üret → kullanıcı onayı → commit).

## 7. Etkilenen dosyalar

| Dosya | Değişiklik |
|---|---|
| `packages/ai/src/articulation/wordBank.ts` | YENİ — banka verisi (onaylı) |
| `packages/ai/src/articulation/selectWords.ts` (+ `.test.ts`) | YENİ — seçici (TDD) |
| `packages/ai/src/index.ts` (barrel) | `selectWords`, `WORD_BANK`, tipleri export |
| `apps/hub/.../api/tools/articulation/route.ts` | Tema kaldır (schema/buildUserPrompt/enrichContent); banka entegrasyonu (kelime/cümle/bağlam); banka-dışı AI yolu korunur |
| `apps/hub/.../tools/articulation/page.tsx` | Tema UI + state kaldır; görsel hata mesajı |

## 8. Kapsam dışı (sonra)

- Tema'nın kategori-etiketli geri dönüşü.
- Banka-dışı seslerin (ç, d, t, b, p, m, n, f, v, j, h, c) bankaya eklenmesi (zamanla; v1 sadece 8 ses).
- Hece bankası (izole/hece şimdilik AI'da).

## 9. Doğrulama disiplini

- **Saf mantık** (`selectWords`: tekrarsızlık, sayı sınırı, pozisyon birleşimi, az-kelime durumu) → vitest TDD.
- **Banka verisi** → uzman onayı (insan); ek otomatik kontrol: her kelime kendi sesinin harfini içeriyor + visualPrompt boş değil (basit test).
- **Entegrasyon/UI** (tema kaldırma, banka enjeksiyonu, hata mesajı) → manuel typecheck + Preview.
- **Uçtan uca** (banka-içi sesle gerçek alıştırma) → canlı gözlem.
