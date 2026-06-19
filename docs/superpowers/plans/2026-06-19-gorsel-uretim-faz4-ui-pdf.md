# Görsel Üretim — Faz 4: UI + PDF + Çalışma Sayfası — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faz 3 endpoint'ini (`POST /studio/api/tools/articulation/images`) kullanıcı arayüzüne bağlamak: artikülasyon formunda "görselli üret" kutusu, sonuç görünümünde ve kütüphane kart detayında görsellerin gösterimi + kelime başına "görsel ekle" düğmesi, ve görselleri içeren bir PDF/çalışma sayfası çıktısı.

**Architecture:** Tamamı frontend (mevcut `apps/hub` Studio bileşenleri). Faz 4 yeni saf mantık üretmez (UI + PDF entegrasyonu) → doğrulama manuel: `typecheck` + Claude Preview (`preview_*`) ile görsel doğrulama. Gerçek görsel üretimi `OPENAI_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` gerektirir (kullanıcı .env); key yoksa UI iskeleti (kutu, düğme, boş durumlar) yine de preview'la doğrulanır.

**Tech Stack:** React 19 (client components), Next.js, `@react-pdf/renderer` (dynamic import + `pdf().toBlob()` deseni), `var(--poster-*)` + Tailwind stil.

**Spec:** `docs/superpowers/specs/2026-06-19-artikulasyon-gorsel-uretim-design.md` (Bölüm 9). Faz 3 planı: `docs/superpowers/plans/2026-06-19-gorsel-uretim-faz3-endpoint-kredi.md`.

**Doğrulama disiplini:** UI/PDF (saf mantık yok) → manuel: `cd apps/hub && node_modules/.bin/tsc --noEmit` (yalnız pre-existing CardGeneratorForm hatası beklenir) + Claude Preview ekran görüntüsü. Endpoint sözleşmesi: body `{ cardId, itemIndexes? }` → `{ results:[{index,word,imageUrl?,cacheHit?,error?}], creditsSpent, credits, skipped }`.

---

## Dosya yapısı

| Dosya | Değişiklik |
|---|---|
| `apps/hub/src/app/studio/(main)/tools/articulation/page.tsx` | `DrillItem.imageUrl`; "görselli üret" checkbox; submit sonrası `/images` çağrısı; sonuç görünümünde görsel + "görsel ekle" düğmesi |
| `apps/hub/src/modules/studio/components/cards/ArticulationView.tsx` | `DrillItem.imageUrl` zaten var; WordView/SyllableView/IsolatedView/Sentence'da görsel render |
| `apps/hub/src/app/studio/(main)/cards/[id]/page.tsx` | `downloadArticulationPDF`'e `@react-pdf` `<Image>` ile görsel; (opsiyonel) "görselli çalışma sayfası" indir |

Not: Faz 4'te yeni saf-mantık modülü yok; `packages/ai` değişmez. Mevcut büyük dosyalar düzenleneceği için her task'ta önce dosyayı OKU, sonra hedefli değişiklik yap.

---

## Task 1: Tipler + "görselli üret" akışı (tool page)

**Files:**
- Modify: `apps/hub/src/app/studio/(main)/tools/articulation/page.tsx`

- [ ] **Step 1: `DrillItem` tipine `imageUrl` ekle**

page.tsx'teki `interface DrillItem` (satır ~20) içine ekle:
```ts
  imageUrl?: string;
```

- [ ] **Step 2: "görselli üret" state + checkbox**

`ArticulationPage` bileşeninde diğer `useState`'lerin yanına ekle:
```ts
  const [withImages, setWithImages] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
```

Form'da, submit düğmesinden (satır ~706) ÖNCE bir onay kutusu ekle (mevcut `var(--poster-*)` stiline uyumlu):
```tsx
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--poster-ink-2)" }}>
        <input
          type="checkbox"
          checked={withImages}
          onChange={(e) => setWithImages(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "var(--poster-accent)" }}
        />
        Her kelime için görsel de üret (kelime başına +1 kredi)
      </label>
```

- [ ] **Step 3: submit sonrası `/images` çağrısı (toplu)**

`handleSubmit`'te, drill başarıyla set edildikten sonra (`setSavedCardId(data.cardId)` civarı), `withImages` işaretliyse görsel üret. `data.cardId` üzerinden:
```ts
      setDrill(data.drill as DrillResult);
      setSavedCardId(data.cardId ?? null);
      toast.success("Alıştırma materyali üretildi!");

      if (withImages && data.cardId) {
        await generateImagesFor(data.cardId);
      }
```

Bileşene yeni bir yardımcı ekle (handleSubmit dışında, bileşen gövdesinde). Endpoint sonuçlarını mevcut `drill` state'ine merge eder:
```ts
  async function generateImagesFor(cardId: string, itemIndexes?: number[]) {
    setImagesLoading(true);
    try {
      const res = await fetch("/studio/api/tools/articulation/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, itemIndexes }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Görsel üretilemedi"); return; }
      // Sonuçları drill.items[].imageUrl'e işle
      setDrill((prev) => {
        if (!prev) return prev;
        const items = prev.items.slice();
        for (const r of data.results as Array<{ index: number; imageUrl?: string }>) {
          if (r.imageUrl) items[r.index] = { ...items[r.index], imageUrl: r.imageUrl };
        }
        return { ...prev, items };
      });
      const okCount = (data.results as Array<{ imageUrl?: string }>).filter((r) => r.imageUrl).length;
      if (okCount > 0) toast.success(`${okCount} görsel eklendi (${data.creditsSpent} kredi)`);
    } catch {
      toast.error("Görsel üretiminde bağlantı hatası");
    } finally {
      setImagesLoading(false);
    }
  }
```

- [ ] **Step 4: `handleReset`'e `setWithImages(false)` ekle** (form sıfırlama tutarlılığı).

- [ ] **Step 5: typecheck**

Run:
```bash
cd /Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66/apps/hub && node_modules/.bin/tsc --noEmit
```
Expected: yalnız pre-existing `CardGeneratorForm.tsx` hatası.

- [ ] **Step 6: Commit**

```bash
git add apps/hub/src/app/studio/(main)/tools/articulation/page.tsx
git commit -m "feat(studio/artikulasyon): 'görselli üret' kutusu + /images entegrasyonu (tool page)"
```

### Task 1 bağlamı
- page.tsx "use client". Mevcut `handleSubmit` `/studio/api/tools/articulation`'a POST atıp `data.drill` + `data.cardId` alıyor. `data.cardId` görsel endpoint'i için gerekli kimlik.
- Stil: inline `style` + `var(--poster-*)`. Checkbox'ı mevcut form öğeleriyle görsel uyumlu yap.
- `apps/hub` typecheck'te 1 pre-existing hata (CardGeneratorForm) — senin işin değil.

---

## Task 2: Sonuç görünümünde görsel + "görsel ekle" (tool page)

**Files:**
- Modify: `apps/hub/src/app/studio/(main)/tools/articulation/page.tsx`

- [ ] **Step 1: Küçük bir görsel/aksiyon yardımcı bileşeni**

page.tsx içinde (DrillResultView yakınında) bir hücre-görseli bileşeni ekle. `imageUrl` varsa görsel; yoksa (savedCardId varsa) "görsel ekle" düğmesi:
```tsx
function ItemImageCell({
  item, index, cardId, onAdd, busy,
}: {
  item: DrillItem; index: number; cardId: string | null;
  onAdd: (i: number) => void; busy: boolean;
}) {
  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt={item.word}
        style={{ width: 56, height: 56, objectFit: "contain", border: "2px solid var(--poster-ink)", borderRadius: 8, background: "#fff" }}
      />
    );
  }
  if (!cardId) return null;
  return (
    <button
      type="button"
      onClick={() => onAdd(index)}
      disabled={busy}
      style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", border: "2px solid var(--poster-ink)", borderRadius: 8, background: "var(--poster-panel)", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "var(--font-display)" }}
    >
      + görsel
    </button>
  );
}
```

- [ ] **Step 2: `WordView`/`SentenceView`/`IsolatedView`'a görsel sütunu/öğesi ekle**

Bu view'lar şu an `item`'ları `cardId`/`onAdd` bilmeden render ediyor. `DrillResultView`'ı, görsel-yetkili view'lara `cardId` + `onAdd` + `busy` geçecek şekilde güncelle (props ekle). Örn. `WordView`'a bir "Görsel" sütunu ekle:
```tsx
// WordView thead'ine:
<th style={{ /* aynı th stili */ }}>Görsel</th>
// WordView tbody satırına (son td):
<td style={{ padding: "10px 12px" }}>
  <ItemImageCell item={item} index={i} cardId={cardId} onAdd={onAdd} busy={busy} />
</td>
```
`IsolatedView`/`SentenceView` için satır/öğenin sonuna `ItemImageCell`'i flex ile yerleştir. (Syllable/contextual seviyelerinde görsel atlanabilir — kelime düzeyi birincil hedef; istenirse eklenir.)

`DrillResultView` imzasına ekle:
```tsx
function DrillResultView({ drill, cardId, onAddImage, imagesBusy }: {
  drill: DrillResult; cardId: string | null;
  onAddImage: (i: number) => void; imagesBusy: boolean;
}) { ... }
```
ve `result` JSX'inde (satır ~722) `<DrillResultView drill={drill} cardId={savedCardId} onAddImage={(i) => generateImagesFor(savedCardId!, [i])} imagesBusy={imagesLoading} />` olarak çağır.

- [ ] **Step 3: typecheck + Preview doğrulama**

Run typecheck (yalnız pre-existing hata). Sonra Claude Preview ile: dev sunucu, artikülasyon sayfası, "görselli üret" kutusu görünür + bir drill üretilince (key varsa görsel, yoksa "+ görsel" düğmesi) görünür. `preview_screenshot` ile kanıt.

- [ ] **Step 4: Commit**

```bash
git add apps/hub/src/app/studio/(main)/tools/articulation/page.tsx
git commit -m "feat(studio/artikulasyon): sonuç görünümünde görsel + kelime başına 'görsel ekle'"
```

---

## Task 3: Kütüphane kart detayında görsel (ArticulationView)

**Files:**
- Modify: `apps/hub/src/modules/studio/components/cards/ArticulationView.tsx`

- [ ] **Step 1: `imageUrl`'i view'larda göster**

`ArticulationView`'daki `DrillItem` zaten `imageUrl?` içeriyor (satır 14). WordView (tablo) ve IsolatedView/SentenceView'da, item'ın yanında küçük görsel render et (varsa). Örn. WordView satırına bir hücre:
```tsx
{item.imageUrl && (
  <td className="py-2">
    <img src={item.imageUrl} alt={item.word ?? ""} className="h-12 w-12 object-contain rounded-md border-2 border-[var(--poster-ink)] bg-white" />
  </td>
)}
```
(Tabloda her satırda tutarlılık için, görselsiz satırlarda boş bir `<td/>` bırak veya başlık + hücreyi koşulsuz ekleyip içeride `item.imageUrl ? <img/> : null` koy — kolon hizası bozulmasın.)

Kütüphane görünümü salt-okunur (üretim yok) — burada "görsel ekle" düğmesi YOK; yalnız mevcut görselleri gösterir.

- [ ] **Step 2: typecheck**

Run typecheck (yalnız pre-existing hata).

- [ ] **Step 3: Commit**

```bash
git add apps/hub/src/modules/studio/components/cards/ArticulationView.tsx
git commit -m "feat(studio/artikulasyon): kütüphane kart detayında görsel gösterimi"
```

---

## Task 4: Görselli PDF / çalışma sayfası

**Files:**
- Modify: `apps/hub/src/app/studio/(main)/cards/[id]/page.tsx`

- [ ] **Step 1: Mevcut `downloadArticulationPDF`'i OKU**

Bu dosyada `downloadArticulationPDF` (~satır 133-210) `@react-pdf/renderer` ile artikülasyon kartını tablo olarak PDF'e döküyor (görselsiz). Önce tam fonksiyonu oku.

- [ ] **Step 2: PDF'e görsel ekle**

`@react-pdf/renderer`'ın `Image` bileşeni zaten import edilebilir (aynı dinamik import). Tablo satırına / kelime bloğuna `item.imageUrl` varsa görsel embed et:
```tsx
// dinamik import'a Image'i dahil et:
const { pdf, Document, Page, Text, View, Image, StyleSheet, Font } = await import("@react-pdf/renderer");
// her item için (tablo hücresi veya blok):
{item.imageUrl ? <Image src={item.imageUrl} style={{ width: 48, height: 48, objectFit: "contain" }} /> : null}
```
`item.imageUrl` public Supabase URL'i (CORS açık, react-pdf fetch edebilir). Görselsiz item'lar olduğu gibi kalır.

- [ ] **Step 3: (Opsiyonel) "Çalışma sayfası" grid çıktısı**

İstenirse ayrı bir "Görselli Çalışma Sayfası" indir düğmesi: yalnız `imageUrl`'i olan item'ları N'li grid'e (örn. 3 sütun) dizen ayrı bir PDF Doc. Aynı `pdf().toBlob()` deseni. Bu, spec'teki "çalışma sayfası kolajı" — MVP'de tablo-içi görsel yeterliyse atlanabilir, ayrı düğme olarak eklenebilir.

- [ ] **Step 4: typecheck + Preview**

Run typecheck (yalnız pre-existing hata). Mümkünse bir artikülasyon kartı detayında PDF indir akışını Preview ile dene (gerçek görsel için key gerekir; yoksa görselsiz PDF'in bozulmadığını doğrula).

- [ ] **Step 5: Commit**

```bash
git add apps/hub/src/app/studio/(main)/cards/[id]/page.tsx
git commit -m "feat(studio/artikulasyon): PDF'e görsel + (ops.) çalışma sayfası"
```

---

## Task 5: Bütünsel doğrulama

- [ ] **Step 1: Tipler + lint + build-tipi kontrol**

Run:
```bash
cd /Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66/apps/hub && node_modules/.bin/tsc --noEmit
```
Expected: YALNIZ pre-existing `CardGeneratorForm.tsx(149,27)` hatası; Faz 4 dosyalarından sıfır yeni hata.

- [ ] **Step 2: Claude Preview ile uçtan uca görsel doğrulama**

`preview_start` → artikülasyon sayfası → "görselli üret" kutusunu işaretle → (key varsa) drill + görseller; `preview_screenshot`. Kütüphane kart detayında görsel + PDF indir. Key yoksa: kutu/düğme/boş-durum iskeletini doğrula.

- [ ] **Step 3: (commit gerekmez — doğrulama)**

---

## Faz 4 tamamlanma kriteri

- Artikülasyon formunda "görselli üret" kutusu; işaretliyse üretim sonrası görseller otomatik gelir (kelime başına 1 kredi).
- İşaretli değilse sonuç görünümünde kelime başına "+ görsel" ile tek tek eklenebilir.
- Kütüphane kart detayında görseller görünür (salt-okunur).
- PDF/çalışma sayfası görselleri içerir.
- typecheck temiz (yalnız pre-existing), Preview ile görsel doğrulandı.

## Açık notlar (Faz 5)

- Gerçek uçtan-uca üretim + GPT vs Flux kalite/maliyet teyidi = Faz 5 POC (OPENAI_API_KEY + FAL_KEY + SUPABASE_SERVICE_ROLE_KEY).
- Concurrent tetikleme: "görselli üret" çalışırken tekil "+ görsel" düğmelerini disable et (`imagesLoading`) — Faz 3 endpoint'i içerik kaybını tx-içi merge ile zaten önlüyor, ama UI'da çift tetiklemeyi engellemek iyi UX.
- "Yeniden üret" / elle yükleme hâlâ MVP dışı.
