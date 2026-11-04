# Faz 0 — Ödül Dili Kararı ve Atölye'nin Ortak Kapanış Bloğuna Bağlanması — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atölye'nin bütün araçları Studio ile aynı ortak kapanış bloğunu (etik sınır, dil kuralı, rumuz notu, yasak kalıplar) alsın; tek istisna olan davranış destek planı pekiştirmeyi sönümlenme şartıyla yazsın; Studio panosundaki "Günlük Seri" kartı "Çalışılan Hedef" olsun; duruş iki landing'in SSS'inde ve eval'de kilitlensin.

**Architecture:** Prompt düzeyinde değişiklik: `ATOLYE_SYSTEM` üç sabit parça + `ORTAK_SON_BLOK` olarak kurulur; davranış ve ev ödevi kullanıcı prompt'ları saf fonksiyon olarak dışa açılır ki vitest ile kilitlenebilsinler. Studio haftalık istatistik rotası `streak` yerine `goalsWorked` döner; pano kartı buna bağlanır. Eval tarafında davranış aracına deterministik `sonumlenme` kontrolü ve bir hakem ölçütü eklenir; davranış + ev ödevi vakaları `faz0` kolunda `baseline`'a karşı koşulur.

**Tech Stack:** Next.js 16 / React 19 / TypeScript strict · vitest (`apps/hub`, alias `@/`, `@studio/`, `@atolye/`) · Prisma (şema değişmez) · eval düzeneği (`apps/hub/evals`, `vitest.eval.config.ts`, çevrimdışı `eval-model` alt-ajanı).

**Spec:** `docs/superpowers/specs/2026-11-03-faz0-odul-dili-ortak-blok-design.md`

**Çalışma dizini:** `/Users/recepkucuk/ludenlab/.claude/worktrees/ludenlabi-egitim-degerlendirmesi-1c8bb2` (worktree, dal `claude/ludenlabi-egitim-degerlendirmesi-1c8bb2`). Bütün komutlar bu dizinden; `cd` ile ana çalışma kopyasına geçilmez. Test komutları `apps/hub` içinden `node_modules/.bin/vitest` ile koşar.

---

## Dosya haritası

| Dosya | Sorumluluk | İşlem |
|---|---|---|
| `apps/hub/src/lib/prompts/yasakSozcuk.ts` | Yasak sözcük taraması (iki modülün ortak denetimi) | Yeni (`iskelet.ts`'ten taşındı) |
| `apps/hub/src/lib/prompts/yasakSozcuk.test.ts` | Yasak sözcük taramasının birim testi | Yeni |
| `apps/hub/src/modules/studio/lib/prompts/iskelet.ts` | Studio prompt iskeleti | `yasakSozcukDenetimi`'ni ortak lib'den alır |
| `apps/hub/src/modules/atolye/lib/atolye-system.ts` | Atölye ortak sistem prompt'u | Satır içi etik sınır çıkar, `ORTAK_SON_BLOK` kapanış olur |
| `apps/hub/src/modules/atolye/lib/atolye-system.test.ts` | Sistem prompt'u sözleşmesi | Yeni |
| `apps/hub/src/lib/prompts/ortakBloklar.ts` | İki modülün ortak blokları | Üst yorum güncellenir |
| `apps/hub/src/modules/atolye/lib/davranis.ts` | Davranış planı form şeması | `PEKISTIRME_NOTU` sabiti |
| `apps/hub/src/modules/atolye/lib/davranis-prompts.ts` | Davranış planı prompt'u | Pekiştirme istisnası; `davranisKullaniciPromptu` dışa açılır |
| `apps/hub/src/modules/atolye/lib/davranis-prompts.test.ts` | Davranış prompt sözleşmesi | Yeni |
| `apps/hub/src/modules/atolye/lib/ev-odevi-prompts.ts` | Ev ödevi prompt'u | Ödül satırı; `evOdeviKullaniciPromptu` dışa açılır |
| `apps/hub/src/modules/atolye/lib/ev-odevi-prompts.test.ts` | Ev ödevi prompt sözleşmesi | Yeni |
| `apps/hub/src/app/studio/api/stats/weekly/route.ts` | Haftalık pano istatistiği | `streak` → `goalsWorked` |
| `apps/hub/src/app/studio/(main)/dashboard/page.tsx` | Studio panosu | Seri kartı → Çalışılan Hedef |
| `apps/hub/src/modules/studio/components/landing/StudioLanding.tsx` | Studio landing SSS | Yeni madde |
| `apps/hub/src/modules/atolye/components/Landing.tsx` | Atölye landing SSS | Yeni madde |
| `apps/hub/evals/tools/atolye/davranis/checks.ts` | Davranış eval deterministik kontrolleri | `sonumlenme` |
| `apps/hub/evals/tools/atolye/davranis/checks.selftest.eval.ts` | Kontrol öz-testi | Anahtar listesi + yeni vakalar |
| `apps/hub/evals/tools/atolye/davranis/adapter.ts` | Davranış eval adaptörü | Hakem ölçütü `sonumlenme` |
| `apps/hub/evals/tools/atolye/davranis/adapter.selftest.eval.ts` | Adaptör öz-testi | Örnek plan + `iyiPuanlar` + `olcutler` |

---

### Task 1: `yasakSozcukDenetimi` dışa açılır (Studio iskeleti)

> **Uygulama notu (2026-11-04, kod incelemesi sonrası):** denetim Studio modülünde kalsaydı Atölye testi
> `@studio/` içe aktaracaktı (modüller arası ilk bağımlılık). Bu yüzden `YASAK_SOZCUKLER` ve
> `yasakSozcukDenetimi` ortak lib'e taşındı: `apps/hub/src/lib/prompts/yasakSozcuk.ts` (+ testi
> `yasakSozcuk.test.ts` yanında); `iskelet.ts` oradan içe aktarır. Sonraki görevler
> `@/lib/prompts/yasakSozcuk` yolunu kullanır. Aşağıdaki adımlar ilk hâlidir.

**Files:**
- Modify: `apps/hub/src/modules/studio/lib/prompts/iskelet.ts` (`promptIddialari` gövdesi, dosyanın sonu)
- Create: `apps/hub/src/modules/studio/lib/prompts/yasakSozcuk.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`apps/hub/src/modules/studio/lib/prompts/yasakSozcuk.test.ts`:

```ts
// apps/hub/src/modules/studio/lib/prompts/yasakSozcuk.test.ts
import { describe, expect, it } from "vitest";
import { yasakSozcukDenetimi } from "./iskelet";

/* `promptIddialari`'ndan ayrıştırılan yasak sözcük taraması (Faz 0): Atölye sistem prompt'u da aynı
   denetimden geçer (`atolye-system.test.ts`). Pencere ve şema denetimi burada yok. */
describe("yasakSozcukDenetimi", () => {
  it("temiz metinde hata atmaz (hastane, fizyoterapist, öğrenci/uzman serbest)", () => {
    expect(() => yasakSozcukDenetimi("Öğrenci ve uzman; hastane randevusu; fizyoterapist görüşü.")).not.toThrow();
  });
  it("'hasta' ve 'terapist' çekimli biçimleriyle yakalanır; hata iletisi sözcüğü ve bağlamı söyler", () => {
    expect(() => yasakSozcukDenetimi("Hastanın adı yazılır.")).toThrow(/'hasta'/);
    expect(() => yasakSozcukDenetimi("Konuşma terapisti okur.")).toThrow(/'terapist'/);
  });
  it("tırnaklı anış serbesttir", () => {
    expect(() => yasakSozcukDenetimi('"hasta/terapist" yerine "öğrenci/uzman" de.')).not.toThrow();
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/prompts/yasakSozcuk.test.ts`
Expected: FAIL — `yasakSozcukDenetimi` export edilmiyor (`is not a function` ya da `undefined`).

- [ ] **Step 3: Fonksiyonu ayrıştır**

`apps/hub/src/modules/studio/lib/prompts/iskelet.ts` dosyasının sonundaki `promptIddialari` fonksiyonunu şununla değiştir (dosyanın geri kalanı aynen kalır):

```ts
/** Yasak sözcük taraması (DİL KURALI'nın "öğrenci/uzman" karşılığı): `YASAK_SOZCUKLER` ile, tr-TR küçük harfte.
    Hata iletisi sözcüğü ve ±30 karakter bağlamı verir. `promptIddialari` bunu çağırır; Atölye sistem prompt'u
    (`atolye-system.test.ts`) pencereden bağımsız olarak yalnız bunu kullanır. */
export function yasakSozcukDenetimi(system: string): void {
  const kucuk = system.toLocaleLowerCase("tr-TR");
  for (const { sozcuk, re } of YASAK_SOZCUKLER) {
    const m = re.exec(kucuk);
    if (!m) continue;
    const baglam = kucuk.slice(Math.max(0, m.index - 30), m.index + sozcuk.length + 30).replace(/\s+/g, " ").trim();
    throw new Error(`prompt '${sozcuk}' sözcüğünü kullanıyor: "…${baglam}…"`);
  }
}

/** Araç prompt testlerinin ortak iddiası: pencere + şema alan adları + yasak sözcükler.
    Hata iletileri konumlandırmaya yetecek kadar somuttur (token sayısı / eksik alan adı / sözcük + bağlam).
    `pencere` araç başına geçilebilir (bkz. `PROMPT_PENCERESI_GENIS`); alan/sözcük denetimleri pencereden bağımsızdır. */
export function promptIddialari(system: string, beklenenAlanlar: string[], pencere: PromptPenceresi = PROMPT_PENCERESI): void {
  const { token, uygun } = promptPenceresi(system, pencere);
  if (!uygun) throw new Error(`sistem prompt'u ${token} token; pencere ${pencere.min}–${pencere.max}`);
  for (const a of beklenenAlanlar) {
    if (!system.includes(`"${a}"`)) throw new Error(`şemada alan yok: ${a}`);
  }
  yasakSozcukDenetimi(system);
}
```

- [ ] **Step 4: Yeni test ve mevcut Studio prompt testleri geçsin**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/prompts`
Expected: PASS (yasakSozcuk, iskelet, card.prompt, index testleri).

- [ ] **Step 5: Commit**

```bash
git add apps/hub/src/modules/studio/lib/prompts/iskelet.ts apps/hub/src/modules/studio/lib/prompts/yasakSozcuk.test.ts
git commit -m "refactor(studio): yasak sözcük taraması promptIddialari'ndan ayrıştırıldı (yasakSozcukDenetimi)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: `ATOLYE_SYSTEM` ortak kapanış bloğuna bağlanır

**Files:**
- Modify: `apps/hub/src/modules/atolye/lib/atolye-system.ts` (tamamı)
- Modify: `apps/hub/src/lib/prompts/ortakBloklar.ts:1-11` (üst yorum)
- Create: `apps/hub/src/modules/atolye/lib/atolye-system.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`apps/hub/src/modules/atolye/lib/atolye-system.test.ts`:

```ts
// apps/hub/src/modules/atolye/lib/atolye-system.test.ts
import { describe, expect, it } from "vitest";
import { ETIK_SINIR, ORTAK_SON_BLOK } from "@/lib/prompts/ortakBloklar";
import { yasakSozcukDenetimi } from "@/lib/prompts/yasakSozcuk";
import { TASLAK_NOTU } from "./bep";
import { ATOLYE_SYSTEM } from "./atolye-system";

/* Faz 0 (spec 2026-11-03 §4): Atölye'nin bütün araçları Studio ile aynı kapanış bloğunu alır.
   Model çıktısı birim testte ölçülmez; kilitlenen şey MODELE GİDEN METİNDİR. */
describe("ATOLYE_SYSTEM — ortak kapanış bloğu", () => {
  it("ORTAK_SON_BLOK ile biter", () => {
    expect(ATOLYE_SYSTEM.endsWith(ORTAK_SON_BLOK)).toBe(true);
  });
  it("ETİK SINIR tam bir kez geçer ve ortak sabitle aynıdır (satır içi kopya yok)", () => {
    expect(ATOLYE_SYSTEM.match(/ETİK SINIR/g)).toHaveLength(1);
    expect(ATOLYE_SYSTEM).toContain(ETIK_SINIR);
  });
  it("çerçeve, ilgi alanı cümlesi ve taslak notu korunur; bölüm sırası rol → çerçeve → biçim → ortak blok", () => {
    expect(ATOLYE_SYSTEM).toContain("çocuğun ilgi alanlarını etkinliklere taşı");
    expect(ATOLYE_SYSTEM).toContain(`⚠️ ${TASLAK_NOTU}`);
    expect(ATOLYE_SYSTEM).toMatch(
      /Sen LudenLab Atölye'nin[\s\S]*ÇERÇEVE VE İLKELER[\s\S]*BİÇİM \(Markdown[\s\S]*ETİK SINIR[\s\S]*DİL KURALI[\s\S]*RUMUZ NOTU[\s\S]*JENERİK KALIPLAR/,
    );
  });
  it("dil kuralı artık Atölye'de de geçerli: dışsal ödül maddesi ve 'öğrenci/uzman' bloğu var", () => {
    expect(ATOLYE_SYSTEM).toContain("dışsal ödül sistemi ÖNERME");
    expect(ATOLYE_SYSTEM).toContain('"terapist" yerine "uzman"');
  });
  it("yasak sözcük (hasta/terapist) içermez", () => {
    expect(() => yasakSozcukDenetimi(ATOLYE_SYSTEM)).not.toThrow();
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/atolye/lib/atolye-system.test.ts`
Expected: FAIL — "ORTAK_SON_BLOK ile biter" ve "ETİK SINIR tam bir kez" (bugün satır içi etik sınır var, ortak blok yok; `DİL KURALI` geçmiyor).

- [ ] **Step 3: Sistem prompt'unu yeniden kur**

`apps/hub/src/modules/atolye/lib/atolye-system.ts` tamamı:

```ts
import { ORTAK_SON_BLOK } from "@/lib/prompts/ortakBloklar";
import { TASLAK_NOTU } from "./bep";

/* Atölye araçlarının PAYLAŞILAN sistem promptu (BEP, Seans Planı, …).
   SERVER-ONLY. Çerçeve ve biçim burada; etik sınır, dil kuralı, rumuz notu ve yasak kalıplar iki modülün
   ortak kapanış bloğundan (`ORTAK_SON_BLOK`, Faz 0 / 2026-11) gelir ve burada YİNELENMEZ.
   DİL KURALI'nın "dışsal ödül önerme" maddesinin tek istisnası davranış destek planıdır; istisna ve
   sınırları yalnız o aracın kullanıcı prompt'unda yazılıdır (`davranis-prompts.ts`).
   Sözleşme: `atolye-system.test.ts`. */

const ROL = `Sen LudenLab Atölye'nin uzman asistanısın. Özgül Öğrenme Bozukluğu (ÖÖB: disleksi/disgrafi/diskalkuli) ve DEHB temelli öğrenme güçlükleri alanında, özel eğitim uzmanlarına TASLAK metinler hazırlarsın.`;

const CERCEVE = `ÇERÇEVE VE İLKELER
- MEB ÖRGM "Öğrenme Güçlüğü Olan Bireyler İçin Destek Eğitim Programı" (Mart 2025) çerçevesine ve ölçme-değerlendirme aşamalarına (kaba değerlendirme, öğretim öncesi değerlendirme, öğretim sürecini değerlendirme, son ve dönem sonu değerlendirme) hizalı yaz.
- Hedefler BİREYSELLEŞTİRİLMİŞ ve ÖLÇÜLEBİLİR olsun: gözlenebilir davranış + ölçüt (%/sıklık) + koşul.
- Yöntem ilkeleri: çok duyulu (görsel-işitsel-dokunsal), somuttan soyuta, küçük adımlar, sık tekrar, anında ve olumlu geri bildirim, hata analizine dayalı uyarlama.
- Güçlü yöne dayalı, saygılı ve damgalamayan bir dil kullan; çocuğun ilgi alanlarını etkinliklere taşı.
- Okuma güçlüğünde fonolojik farkındalık ve işitsel işlemleme boyutunu çekirdek bileşen olarak dikkate al (dil-konuşma/odyoloji katkısı).`;

const BICIM = `BİÇİM (Markdown — tutarlı, okunur, yazdırılabilir)
- Türkçe yaz; uygulanabilir, net ve öz ol.
- Bölümler için "## ", alt bölümler için "### " başlık kullan; başlıklardan önce boş satır bırak.
- Maddelerde "- " kullan; kısa ve eylem-odaklı yaz. Anahtar terimleri **kalın** yap (abartma).
- Yapılandırılmış/karşılaştırmalı bilgiyi (künye, ölçme ölçütleri, etkinlik–süre dağılımı, haftalık plan, hedef–davranış eşlemesi vb.) GFM tablosuyla ver:
  | Alan | Açıklama |
  | --- | --- |
  | ... | ... |
  Tabloları dar tut (2–4 sütun), başlık satırı ekle, hücreleri kısa yaz; uzun düz metni tabloya sıkıştırma.
- Uzun paragraf yığını yerine başlık + madde + tablo karışımı kullan; her bölümü boş satırla ayır.
- Çıktının EN SONUNA şu satırı aynen ekle: "⚠️ ${TASLAK_NOTU}"`;

/** Rol → çerçeve → biçim → ortak kapanış bloğu (Studio iskeletiyle aynı sıra). Sabit metin: önbellek davranışı değişmez. */
export const ATOLYE_SYSTEM = [ROL, CERCEVE, BICIM, ORTAK_SON_BLOK].join("\n\n");
```

- [ ] **Step 4: `ortakBloklar.ts` üst yorumunu güncelle**

`apps/hub/src/lib/prompts/ortakBloklar.ts` dosyasının başındaki yorum bloğunda şu iki parçayı değiştir:

Eski:
```ts
   sistem prompt iskeleti (`modules/studio/lib/prompts/iskelet.ts`) `ORTAK_SON_BLOK`'u kapanış
   bloğu olarak ekler (spec A1 madde 7). Atölye bağlantısı Faz 3.
   ETIK_SINIR: `ATOLYE_SYSTEM`'in (atolye-system.ts) "ETİK SINIR" bloğundan AYNEN.
```
Yeni:
```ts
   sistem prompt iskeleti (`modules/studio/lib/prompts/iskelet.ts`) `ORTAK_SON_BLOK`'u kapanış
   bloğu olarak ekler (spec A1 madde 7). Atölye bağlantısı Faz 0 (2026-11): `ATOLYE_SYSTEM`
   (atolye-system.ts) aynı bloğu kapanış olarak alır; satır içi kopyası yoktur.
   ETIK_SINIR: eski `ATOLYE_SYSTEM` "ETİK SINIR" bloğunun tek kaynağa taşınmış hâli.
```

Eski:
```ts
   kısaltılmış hâli. Faz 2/3'te prompt'lar buradan beslenirken atolye-system.ts'teki
   "çocuğun ilgi alanlarını etkinliklere taşı" cümlesi KORUNMALI (burada yok). */
```
Yeni:
```ts
   kısaltılmış hâli. atolye-system.ts'teki "çocuğun ilgi alanlarını etkinliklere taşı" cümlesi
   ÇERÇEVE bölümünde korunur (burada yok; `atolye-system.test.ts` kilitler). Davranış destek planı
   DİL KURALI'nın ödül maddesinin tek istisnasıdır (`davranis-prompts.ts`). */
```

- [ ] **Step 5: Testler geçsin**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/atolye src/lib/prompts`
Expected: PASS (atolye-system, ortakBloklar, student, studentForm testleri).

- [ ] **Step 6: Commit**

```bash
git add apps/hub/src/modules/atolye/lib/atolye-system.ts apps/hub/src/modules/atolye/lib/atolye-system.test.ts apps/hub/src/lib/prompts/ortakBloklar.ts
git commit -m "feat(atolye): sistem prompt'u ortak kapanış bloğuna bağlandı (etik sınır + dil kuralı + rumuz + yasak kalıplar)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Davranış destek planı istisnası (pekiştirme + sönümlenme)

> **Uygulama notu (2026-11-04, kod incelemesi sonrası):** KURALLAR'daki istisna cümlesi sistem kuralını
> birebir alıntılar ve "sistem önerme" der: `Bu araç, DİL KURALI'ndaki "dışsal ödül sistemi ÖNERME" maddesinin
> tek istisnasıdır; istisna yalnız 6. bölüm için ve yukarıdaki sınırlarla geçerlidir, diğer bölümlerde
> ödül/puan/çıkartma sistemi önerme.` (7. bölümdeki öz-izleme puanlaması bastırılmasın diye "puan dili" yerine
> "sistem"). Test (a) 6. madde SATIRINA bağlandı; test (b) dizeleri bu cümleye göre. Aşağıdaki adımlar ilk hâlidir.

**Files:**
- Modify: `apps/hub/src/modules/atolye/lib/davranis.ts` (sonuna sabit)
- Modify: `apps/hub/src/modules/atolye/lib/davranis-prompts.ts` (tamamı)
- Create: `apps/hub/src/modules/atolye/lib/davranis-prompts.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`apps/hub/src/modules/atolye/lib/davranis-prompts.test.ts`:

```ts
// apps/hub/src/modules/atolye/lib/davranis-prompts.test.ts
import { describe, expect, it } from "vitest";
import { PEKISTIRME_NOTU, davranisInputSchema } from "./davranis";
import { davranisKullaniciPromptu } from "./davranis-prompts";

/* Faz 0 (spec 2026-11-03 §5): pekiştirme bölümü DİL KURALI'nın "dışsal ödül önerme" maddesinin tek
   istisnasıdır; istisna 6. bölümle sınırlı, her pekiştireç sönümlenme basamağı taşır, bölüm sabit notla biter. */
const girdi = davranisInputSchema.parse({
  rumuz: "Doruk",
  kademe: "ilkokul_1_4",
  taniProfili: ["dehb_kombine"],
  hedefDavranis: "Etkinlik geçişinde yere yatma",
  ortam: "sinif",
  siklikSure: "Günde 3–4 kez, 2 dk",
});

describe("davranisKullaniciPromptu — pekiştirme istisnası", () => {
  const p = davranisKullaniciPromptu(girdi);
  it("sabit not ve sönümlenme şartı 6. bölümde", () => {
    expect(PEKISTIRME_NOTU).toMatch(/sönümlenme basamakları/);
    expect(p).toContain(`6. **Pekiştirme planı**`);
    expect(p).toContain("her pekiştireç için sönümlenme basamağı");
    expect(p).toContain(`Bölümün sonuna aynen şu satırı ekle: "${PEKISTIRME_NOTU}"`);
  });
  it("istisna açıkça ve sınırlı: tek istisna, yalnız 6. bölüm", () => {
    expect(p).toContain('DİL KURALI\'ndaki "dışsal ödül önerme" maddesinin tek istisnasıdır');
    expect(p).toContain("istisna yalnız 6. bölüm için");
    expect(p).toContain("diğer bölümlerde ödül/puan dili kullanma");
  });
  it("doğal ve sosyal pekiştireç önce; eski 'pekiştireç örnekleri' kalıbı yok", () => {
    expect(p).toContain("önce doğal ve sosyal pekiştireç");
    expect(p).not.toContain("pekiştireç örnekleri");
  });
  it("profil, davranış satırları ve sekiz bölüm korunur", () => {
    expect(p).toContain("- Öğrenci: Doruk");
    expect(p).toContain("- Hedef davranış: Etkinlik geçişinde yere yatma");
    expect(p).toContain("- Ortam: sınıf");
    expect(p).toContain("- Sıklık/süre gözlemi: Günde 3–4 kez, 2 dk");
    for (const b of ["1. **Hedef davranışın", "2. **ABC analizi**", "3. **İşlev hipotezi**", "4. **Önleyici", "5. **Yerine koyma davranışı**", "7. **Öz-izleme", "8. **Aile–okul–seans tutarlılık notu**"]) {
      expect(p).toContain(b);
    }
    expect(p).not.toContain("MEB HEDEF HİZALAMASI");
  });
  it("MEB hedefi verilince hizalama bloğu ve kuyruk cümlesi gelir", () => {
    const m = davranisKullaniciPromptu({ ...girdi, mebHedefKod: "3.2.5", mebDavranisKodlari: ["3.2.5.1"] });
    expect(m).toContain("MEB HEDEF HİZALAMASI");
    expect(m).toContain("seçilen MEB hedef davranışlarıyla ilişkilendirilsin");
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/atolye/lib/davranis-prompts.test.ts`
Expected: FAIL — `PEKISTIRME_NOTU` ve `davranisKullaniciPromptu` export edilmiyor.

- [ ] **Step 3: Sabiti ekle**

`apps/hub/src/modules/atolye/lib/davranis.ts` dosyasının sonuna ekle:

```ts
/** Pekiştirme bölümünün sonuna aynen basılan not (Faz 0): bu araç DİL KURALI'nın ödül maddesinin tek
    istisnasıdır; istisnanın koşulu sönümlenmedir. Client + server güvenli (eval kontrolü de okur). */
export const PEKISTIRME_NOTU =
  "Not: Pekiştirme bu planda geçici bir köprüdür; sönümlenme basamakları uygulanmadan plan tamamlanmış sayılmaz.";
```

- [ ] **Step 4: Prompt'u yeniden yaz**

`apps/hub/src/modules/atolye/lib/davranis-prompts.ts` tamamı:

```ts
import { definePrompt, type RunPromptResult } from "@ludenlab/ai";
import { ATOLYE_SYSTEM } from "./atolye-system";
import { profilToPrompt } from "./ogrenci-profili";
import { mebToPrompt } from "./meb-program";
import { PEKISTIRME_NOTU, type DavranisInput } from "./davranis";

/* SERVER-ONLY. */

const ORTAM_LABEL: Record<DavranisInput["ortam"], string> = {
  sinif: "sınıf",
  ev: "ev",
  seans: "seans",
  genel: "genel",
};

/** Kullanıcı prompt'u — saf, test edilebilir (`davranis-prompts.test.ts`).
    Faz 0 (2026-11): 6. bölüm, sistemdeki DİL KURALI'nın "dışsal ödül önerme" maddesinin TEK istisnasıdır;
    istisna işlev-temelli, önce doğal/sosyal, somut ödül yalnız gerekçeyle ve geçici, her pekiştireç
    sönümlenme basamağıyla; bölüm `PEKISTIRME_NOTU` ile biter. Eval: `evals/tools/atolye/davranis`. */
export function davranisKullaniciPromptu(i: DavranisInput): string {
  const mebBlok = i.mebHedefKod
    ? mebToPrompt({ hedefKod: i.mebHedefKod, davranisKodlari: i.mebDavranisKodlari })
    : null;
  return `Aşağıdaki öğrenci için EĞİTSEL bir DAVRANIŞ DESTEK PLANI taslağı üret (DEHB odaklı, olumlu davranışsal destek yaklaşımı).

ÖĞRENCİ PROFİLİ
${profilToPrompt(i)}
${mebBlok ? `\nMEB HEDEF HİZALAMASI (resmî destek eğitim programına demirle)\n${mebBlok}\n` : ""}
DAVRANIŞ
- Hedef davranış: ${i.hedefDavranis}
- Ortam: ${ORTAM_LABEL[i.ortam]}
- Sıklık/süre gözlemi: ${i.siklikSure || "—"}

İSTENEN YAPI (Markdown, sırayla)
1. **Hedef davranışın gözlenebilir/ölçülebilir tanımı**
2. **ABC analizi** (Öncül → Davranış → Sonuç) — tablo
3. **İşlev hipotezi** (dikkat çekme / kaçınma-kaçış / duyusal / somut kazanç — hangisi/hangileri)
4. **Önleyici (antecedent) ve çevresel düzenlemeler**
5. **Yerine koyma davranışı** (aynı işlevi gören uygun davranış) + nasıl öğretileceği
6. **Pekiştirme planı** — işlev hipotezine bağlı; önce doğal ve sosyal pekiştireç (etkinlik seçimi, sorumluluk, somut övgü), somut/nesne ödül yalnız gerekçesiyle ve geçici; kademeli; **her pekiştireç için sönümlenme basamağı** (hangi ölçütte seyreltilir, neye devredilir). Bölümün sonuna aynen şu satırı ekle: "${PEKISTIRME_NOTU}"
7. **Öz-izleme / veri toplama önerisi** (basit çizelge fikri)
8. **Aile–okul–seans tutarlılık notu**

KURALLAR: Bu EĞİTSEL davranış desteğidir, TEDAVİ DEĞİLDİR; ilaç veya klinik öneri verme. Tanı koyma. Cezalandırıcı/utandırıcı strateji önerme; damgalamayan, güçlü-yön odaklı dil. Veri yetersizse varsayım üretme; gerekli gözlemi öner. Bu araç, DİL KURALI'ndaki "dışsal ödül önerme" maddesinin tek istisnasıdır; istisna yalnız 6. bölüm için ve yukarıdaki sınırlarla geçerlidir, diğer bölümlerde ödül/puan dili kullanma.${mebBlok ? " Yerine koyma davranışı ve hedefler, seçilen MEB hedef davranışlarıyla ilişkilendirilsin." : ""}`;
}

const davranis = definePrompt<DavranisInput>({
  name: "davranis_destek_plani",
  temperature: 0.4,
  maxTokens: 8000,
  system: ATOLYE_SYSTEM,
  user: davranisKullaniciPromptu,
});

export function generateDavranis(input: DavranisInput): Promise<RunPromptResult> {
  return davranis.run(input);
}
```

- [ ] **Step 5: Test geçsin**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/atolye/lib/davranis-prompts.test.ts`
Expected: PASS (5 test).

- [ ] **Step 6: Commit**

```bash
git add apps/hub/src/modules/atolye/lib/davranis.ts apps/hub/src/modules/atolye/lib/davranis-prompts.ts apps/hub/src/modules/atolye/lib/davranis-prompts.test.ts
git commit -m "feat(atolye): davranış planı pekiştirmesi dil kuralının tek istisnası — sönümlenme basamağı + sabit not

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Ev ödevi programında ödül satırı kalkar

**Files:**
- Modify: `apps/hub/src/modules/atolye/lib/ev-odevi-prompts.ts` (tamamı)
- Create: `apps/hub/src/modules/atolye/lib/ev-odevi-prompts.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`apps/hub/src/modules/atolye/lib/ev-odevi-prompts.test.ts`:

```ts
// apps/hub/src/modules/atolye/lib/ev-odevi-prompts.test.ts
import { describe, expect, it } from "vitest";
import { evOdeviInputSchema } from "./ev-odevi";
import { evOdeviKullaniciPromptu } from "./ev-odevi-prompts";

/* Faz 0 (spec 2026-11-03 §6): ev ödevi programı dışsal ödül istemez; günün kapanışı oyunludur. */
const girdi = evOdeviInputSchema.parse({
  rumuz: "Doruk",
  kademe: "ilkokul_1_4",
  taniProfili: ["disleksi"],
  hedefKonu: "İki heceli sözcükleri okuma",
  gunSayisi: 3,
});

describe("evOdeviKullaniciPromptu — ödül dili yok", () => {
  const p = evOdeviKullaniciPromptu(girdi);
  it("'ödül' sözcüğü hiçbir biçimde geçmez; oyunlu kapanış ister", () => {
    expect(p.toLocaleLowerCase("tr-TR")).not.toContain("ödül");
    expect(p).toContain("Oyunlu kapanış (oyun ya da birlikte yapılan keyifli bir bitiriş; puan, çıkartma, dışsal pekiştireç yok)");
  });
  it("dört bölüm ve gün sayısı korunur", () => {
    expect(p).toContain("- Program Süresi: 3 günlük");
    for (const b of ["1. **Genel Çerçeve ve Ebeveyn Bilgilendirmesi**", "2. **Günlük Çalışma Planı**", "3. **Alternatif Yollar**", "4. **Gözlem ve Uzmana Notlar (Aile için)**"]) {
      expect(p).toContain(b);
    }
  });
});
```

Satır metni "ödül" sözcüğünü hiç içermez (olumsuzlayarak bile); böylece tek bir `not.toContain("ödül")` iddiası
prompt'u kilitler. Spec §6 aynı metni kullanır.

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/atolye/lib/ev-odevi-prompts.test.ts`
Expected: FAIL — `evOdeviKullaniciPromptu` export edilmiyor.

- [ ] **Step 3: Prompt'u yeniden yaz**

`apps/hub/src/modules/atolye/lib/ev-odevi-prompts.ts` tamamı:

```ts
import { definePrompt, type RunPromptResult } from "@ludenlab/ai";
import { ATOLYE_SYSTEM } from "./atolye-system";
import { profilToPrompt } from "./ogrenci-profili";
import { mebToPrompt } from "./meb-program";
import { type EvOdeviInput } from "./ev-odevi";

/* SERVER-ONLY. */

/** Kullanıcı prompt'u — saf, test edilebilir (`ev-odevi-prompts.test.ts`).
    Faz 0 (2026-11): günün kapanışı oyunludur; dışsal ödül/puan istenmez (DİL KURALI ortak bloktan gelir). */
export function evOdeviKullaniciPromptu(i: EvOdeviInput): string {
  const mebBlok = i.mebHedefKod
    ? mebToPrompt({ hedefKod: i.mebHedefKod, davranisKodlari: i.mebDavranisKodlari })
    : null;
  return `Aşağıdaki Özel Öğrenme Güçlüğü (ÖÖG) tanılı veya riskli öğrenci için ev-okul-uzman işbirliğini destekleyecek bir EV ÇALIŞMA PROGRAMI taslağı üret.

ÖĞRENCİ PROFİLİ
${profilToPrompt(i)}
${mebBlok ? `\nMEB HEDEF HİZALAMASI (resmî destek eğitim programına demirle)\n${mebBlok}\n` : ""}
HEDEF & SÜRE
- Hedeflenen Konu/Beceri: ${i.hedefKonu}
- Program Süresi: ${i.gunSayisi} günlük
- Uzman Yönergeleri / Ek Not: ${i.ekstraNot || "Belirtilmedi"}

İSTENEN YAPI (Markdown, sırayla)
1. **Genel Çerçeve ve Ebeveyn Bilgilendirmesi** — Aileye yönelik kısa, destekleyici ve olumlu bir not. Evde çalışma yaparken dikkat etmeleri gereken (çocuğu yormadan, oyunlaştırarak vs.) temel prensipler.
2. **Günlük Çalışma Planı** — Belirtilen gün sayısı kadar. Her gün için:
   - Isınma/Hazırlık (2-3 dk)
   - Ana Etkinlik (Kısa ve net yönergelerle, hedeflenen beceriye yönelik)
   - Oyunlu kapanış (oyun ya da birlikte yapılan keyifli bir bitiriş; puan, çıkartma, dışsal pekiştireç yok)
3. **Alternatif Yollar** — Eğer çocuk o gün çok direnç gösterirse veya sıkılırsa yapılabilecek alternatif, daha esnek B planı etkinlikleri.
4. **Gözlem ve Uzmana Notlar (Aile için)** — Ailenin bu haftaki çalışmaları yaparken neye dikkat etmesi ve uzmana ne gibi geri bildirimler (rubrik veya form) getirmesi gerektiğine dair ufak bir bölüm.

KURALLAR: Tanı koyma; güçlü-yön odaklı, damgalamayan dil kullan. Öğrenme güçlüğü (disleksi, disgrafi, diskalkuli) profiline uygun çok duyulu (multisensory) yöntemler öner. Saatlerce süren sıkıcı masa başı ödevleri değil, 15-20 dakikalık etkili, oyun temelli çalışma dilimleri tasarla.${mebBlok ? " Günlük etkinlikler, seçilen MEB hedef davranışlarıyla doğrudan ilişkili olsun." : ""}`;
}

const evOdevi = definePrompt<EvOdeviInput>({
  name: "ev_odevi_programi",
  temperature: 0.5,
  maxTokens: 8000,
  system: ATOLYE_SYSTEM,
  user: evOdeviKullaniciPromptu,
});

export function generateEvOdevi(input: EvOdeviInput): Promise<RunPromptResult> {
  return evOdevi.run(input);
}
```

- [ ] **Step 4: Test geçsin; eval bölüm regex'leri etkilenmez**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/atolye/lib/ev-odevi-prompts.test.ts`
Expected: PASS (2 test).

Run: `cd apps/hub && node_modules/.bin/vitest run --config vitest.eval.config.ts evals/tools/atolye/ev-odevi`
Expected: PASS (adapter ve checks öz-testleri; prompt parçaları değişmedi).

- [ ] **Step 5: Commit**

```bash
git add apps/hub/src/modules/atolye/lib/ev-odevi-prompts.ts apps/hub/src/modules/atolye/lib/ev-odevi-prompts.test.ts
git commit -m "fix(atolye): ev ödevi programı oyunlu kapanış ister, ödül/puan istemez

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Studio panosu — "Günlük Seri" → "Çalışılan Hedef"

**Files:**
- Modify: `apps/hub/src/app/studio/api/stats/weekly/route.ts` (tamamı)
- Modify: `apps/hub/src/app/studio/(main)/dashboard/page.tsx:6-17` (import), `:56-61` (tip), `:138` (kart)

Bu görevde birim test yok (rota DB ve oturum ister; mevcut istatistik rotalarında da test yok). Doğrulama: tip denetimi + Task 9'daki `next build` ve tarayıcı kontrolü.

- [ ] **Step 1: Haftalık rotayı yeniden yaz**

`apps/hub/src/app/studio/api/stats/weekly/route.ts` tamamı:

```ts
import { NextResponse } from "next/server";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { logError } from "@studio/lib/utils";

/* Haftalık pano istatistikleri. Faz 0 (2026-11): "Günlük Seri" (`streak`) kalktı — uzmana dönük dışsal
   motivasyon öğesiydi (spec 2026-11-03 §7). Yerine `goalsWorked`: son 7 günde durumu güncellenen
   öğrenci×hedef satırı sayısı. Rozet rotası (`stats/badges`) kendi seri hesabını korur. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const therapistId = session.user.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [recentProgress, cardsCreated] = await Promise.all([
      // Son 7 günde progress güncellenen kayıtlar
      prisma.studentProgress.findMany({
        where: { therapistId, updatedAt: { gte: sevenDaysAgo } },
        select: { studentId: true, status: true },
      }),
      // Son 7 günde üretilen kart sayısı
      prisma.card.count({
        where: { therapistId, createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    const studentsWorked = new Set(recentProgress.map((p) => p.studentId)).size;
    const goalsCompleted = recentProgress.filter((p) => p.status === "completed").length;
    // `StudentProgress` öğrenci×hedef başına tek satırdır (@@unique([studentId, goalId])):
    // satır sayısı = bu hafta durumu güncellenen hedef sayısı.
    const goalsWorked = recentProgress.length;

    return NextResponse.json({ studentsWorked, goalsCompleted, cardsCreated, goalsWorked });
  } catch (error) {
    logError("GET /studio/api/stats/weekly", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Pano import'u, tipi ve kartı**

`apps/hub/src/app/studio/(main)/dashboard/page.tsx`:

Import bloğunda (satır 6–17) `Flame,` satırını sil, yerine `Target,` ekle:

```ts
import {
  Users,
  CheckCircle2,
  LayoutGrid,
  Target,
  User,
  Package,
  Sparkles,
  Plus,
  CalendarDays,
  Clock,
} from "lucide-react";
```

`WeeklyStats` tipi (satır 56–61):

```ts
interface WeeklyStats {
  studentsWorked: number;
  goalsCompleted: number;
  cardsCreated: number;
  goalsWorked: number;
}
```

`statCards` dizisindeki dördüncü satır (satır 138):

Eski:
```ts
    { Icon: Flame,        label: "Günlük Seri",        value: weekly?.streak ?? 0,         sub: "Çalışmaya devam et!",                                       tint: "var(--poster-pink)",  suffix: "gün" },
```
Yeni:
```ts
    { Icon: Target,       label: "Çalışılan Hedef",    value: weekly?.goalsWorked ?? 0,    sub: "Bu hafta durumu güncellenen hedef",                        tint: "var(--poster-pink)" },
```

- [ ] **Step 3: Tip denetimi ve lint**

Run: `cd apps/hub && node_modules/.bin/tsc --noEmit`
Expected: hata yok.

Run: `cd apps/hub && node_modules/.bin/eslint "src/app/studio/(main)/dashboard/page.tsx" src/app/studio/api/stats/weekly/route.ts`
Expected: hata yok (kullanılmayan import kalmadı).

- [ ] **Step 4: Commit**

```bash
git add "apps/hub/src/app/studio/(main)/dashboard/page.tsx" apps/hub/src/app/studio/api/stats/weekly/route.ts
git commit -m "feat(studio): pano 'Günlük Seri' kartı kalktı, yerine 'Çalışılan Hedef' (haftalık rota goalsWorked)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: SSS maddeleri (iki landing)

**Files:**
- Modify: `apps/hub/src/modules/studio/components/landing/StudioLanding.tsx:33-55` (`FAQ_ITEMS`)
- Modify: `apps/hub/src/modules/atolye/components/Landing.tsx:79-84` (`FAQ`)

- [ ] **Step 1: Studio SSS**

`FAQ_ITEMS` dizisinde "Kaç öğrenci ekleyebilirim?" maddesinin ardına, "Fatura ve ödeme nasıl işliyor?" maddesinin önüne ekle:

```ts
  {
    q: "Neden ödül, puan ya da yıldız tablosu önermiyorsunuz?",
    a: "Araçlar içsel motivasyona dayanır: oyun, merak ve öğrencinin kendi ilerlemesini fark etmesi. Dışsal ödül sistemleri kısa vadede işe yarasa da becerinin kalıcılığını ve öğrencinin özerkliğini zayıflatabilir; bu yüzden hiçbir çıktı çıkartma, puan ya da ödül önermez.",
  },
```

- [ ] **Step 2: Atölye SSS**

`FAQ` dizisinde "Araç tanı koyar mı?" satırının ardına ekle:

```ts
  ["Neden ödül, puan ya da yıldız tablosu önermiyorsunuz?", "Araçlar içsel motivasyona dayanır: oyun, merak ve öğrencinin kendi ilerlemesini fark etmesi; çıktılar çıkartma, puan ya da ödül önermez. Tek istisna Davranış Destek Planı'dır: olumlu davranışsal destek yaklaşımı işlev-temelli pekiştirme kullanır. Plan her pekiştireç için sönümlenme basamağı yazar ve bunun geçici bir köprü olduğunu açıkça belirtir."],
```

- [ ] **Step 3: Tip denetimi**

Run: `cd apps/hub && node_modules/.bin/tsc --noEmit`
Expected: hata yok.

- [ ] **Step 4: Commit**

```bash
git add apps/hub/src/modules/studio/components/landing/StudioLanding.tsx apps/hub/src/modules/atolye/components/Landing.tsx
git commit -m "docs(landing): SSS — neden ödül/puan önermiyoruz (Studio + Atölye, davranış planı istisnası)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Eval — davranış aracına `sonumlenme` kontrolü ve hakem ölçütü

**Files:**
- Modify: `apps/hub/evals/tools/atolye/davranis/checks.ts:82-93` (`davranisChecks`)
- Modify: `apps/hub/evals/tools/atolye/davranis/checks.selftest.eval.ts` (sözleşme testi + yeni describe)
- Modify: `apps/hub/evals/tools/atolye/davranis/adapter.ts:30-33` (`criteria`)
- Modify: `apps/hub/evals/tools/atolye/davranis/adapter.selftest.eval.ts:20-44` (`plan`, `olcutler`, `iyiPuanlar`), `:108` (`kotu`)

- [ ] **Step 1: Öz-testleri önce güncelle (kırmızı görmek için)**

`checks.selftest.eval.ts` sonundaki "çıktı sözleşmesi" bloğunu şununla değiştir ve ardına yeni describe ekle:

```ts
describe("çıktı sözleşmesi", () => {
  it("`talimat` döndürülmez; yalnız abc_tablo, ceza_yok ve sonumlenme; ayrıntılar puanları yansıtır", () => {
    const r = kontrol(md);
    expect(Object.keys(r.scores).sort()).toEqual(["abc_tablo", "ceza_yok", "sonumlenme"]);
    expect(r.details).toMatchObject({ abc_tablo: 1, ceza_yok: 1, sonumlenme: 0 });
    expect(r.hard).toEqual([]);
  });
});

describe("sonumlenme (Faz 0: 'her pekiştireç için sönümlenme basamağı' + bölüm sonunda PEKISTIRME_NOTU)", () => {
  const pek = (govde: string) => kontrol(`## ABC analizi\n${tablo}\n## 6. Pekiştirme planı\n${govde}`).scores.sonumlenme;
  it("sönümlenme satırı + not → 1", () => {
    expect(pek(`- Övgü; sönümlenme: 5 ardışık başarılı geçişte seyreltilir.\n${PEKISTIRME_NOTU}`)).toBe(1);
    expect(pek(`- Sönümlenme Basamağı: haftada bir azalt.\n\n${PEKISTIRME_NOTU}`)).toBe(1); // büyük harf (tr-TR)
  });
  it("not yok → 0; sönümlenme sözcüğü yalnız notun kendisinde → 0 (not kendi kendini doğrulamaz)", () => {
    expect(pek("- Övgü; sönümlenme: 5 ardışık başarılı geçişte seyreltilir.")).toBe(0);
    expect(pek(`- Övgü.\n${PEKISTIRME_NOTU}`)).toBe(0);
  });
  it("model notu kalın/noktalamalı yazsa da tanınır (notNormalize)", () => {
    expect(pek(`- Sönümlenme: haftada bir azalt.\n**Not:** Pekiştirme bu planda geçici bir köprüdür; sönümlenme basamakları uygulanmadan plan tamamlanmış sayılmaz.`)).toBe(1);
  });
  it("sönümlenme sözcüğü pekiştirme bölümünün DIŞINDAYSA sayılmaz", () => {
    expect(kontrol(`## 4. Önleyici düzenlemeler\n- Sönümlenme.\n## 6. Pekiştirme planı\n- Övgü.\n${PEKISTIRME_NOTU}`).scores.sonumlenme).toBe(0);
  });
  it("pekiştirme bölümü yoksa 0", () => {
    expect(kontrol(`## Plan\n- Sönümlenme.\n${PEKISTIRME_NOTU}`).scores.sonumlenme).toBe(0);
  });
});
```

Dosyanın import satırına ekle:

```ts
import { PEKISTIRME_NOTU } from "@atolye/lib/davranis";
```

`adapter.selftest.eval.ts`: import satırına `PEKISTIRME_NOTU` ekle (`davranisInputSchema` ile aynı modülden):

```ts
import { PEKISTIRME_NOTU, davranisInputSchema } from "@atolye/lib/davranis";
```

`plan` fikstüründe "## 6. Pekiştirme planı" satırını şu üç satır izlesin (eski tek satır "- Cezasız, olumlu ve kademeli pekiştirme." AYNEN kalır; `.replace(...)` kullanan testler ona bağlı):

```ts
    "## 6. Pekiştirme planı", "- Cezasız, olumlu ve kademeli pekiştirme.", SONUMLENME, PEKISTIRME_NOTU, "",
```

`plan` tanımının üstüne sabit:

```ts
/** Faz 0: pekiştirme bölümünün sönümlenme satırı (kötü örnekte `.replace(SONUMLENME, …)` ile düşürülür). */
const SONUMLENME = "- Sönümlenme basamağı: 5 ardışık başarılı geçişten sonra övgü seyreltilir, doğal sonuca (oyuna dönüş) devredilir.";
```

`atolyeAdapterSuite` seçeneklerinde:

```ts
  olcutler: ["islev_analizi", "onleyici_strateji", "sonumlenme"],
  ...
  iyiPuanlar: { talimat: 1, abc_tablo: 1, ceza_yok: 1, sonumlenme: 1 },
```

"koşullu ceza" testindeki `kotu` tanımı (satır 108) sonuna `.replace(SONUMLENME, "- Övgü.")` ekle ki talimat düşüşü eskisi gibi ölçülsün:

```ts
      const kotu = plan().replace("| Öncül | Davranış | Sonuç |\n|---|---|---|\n| Oyundan masaya geçiş | Yere yatma | Geçiş ertelenir |", "- Öncül: geçiş").replace("Cezasız, olumlu ve kademeli pekiştirme.", "Time-out uygulayın.").replace(SONUMLENME, "- Övgü.");
```

ve o testin `toMatchObject` iddiasını genişlet:

```ts
      expect(r.scores).toMatchObject({ abc_tablo: 0, ceza_yok: 0, sonumlenme: 0 });
```

- [ ] **Step 2: Öz-testlerin başarısız olduğunu gör**

Run: `cd apps/hub && node_modules/.bin/vitest run --config vitest.eval.config.ts evals/tools/atolye/davranis`
Expected: FAIL — `sonumlenme` anahtarı yok (sözleşme testi), `olcutler` eşleşmiyor (adaptör suite).

- [ ] **Step 3: Kontrolü ekle**

> **Düzeltme (2026-11-04, Task 3 kod incelemesi):** ilk taslak iki hata taşıyordu. (1) `PEKISTIRME_NOTU`'nun
> kendisi "sönümlenme basamakları" dediği için not satırı bölümdeyken kontrol boş bölümde de geçiyordu →
> sönümlenme sözcüğü NOT DIŞINDAKİ bölüm satırlarında aranır. (2) `text.includes(PEKISTIRME_NOTU)` modelin
> kalın yazdığı `**Not:** …` biçimini kaçırıyordu → not, `TASLAK_NOTU` gibi `notNormalize` ile karşılaştırılır.

`checks.ts` import satırlarını güncelle (`notNormalize` zaten `lib/markdown`'da; `lower` zaten içe aktarılı):

```ts
import { PEKISTIRME_NOTU } from "@atolye/lib/davranis";
import { AYRAC, TABLO, baslikMi, notNormalize } from "../../../lib/markdown";
```

Dosya düzeyinde sabit (fonksiyonların üstüne):

```ts
/** Faz 0: pekiştirme bölümünün sonundaki sabit not, biçimden bağımsız (kalın/noktalama/İ-ı) karşılaştırma için. */
const PEKISTIRME_NORM = notNormalize(PEKISTIRME_NOTU);
```

`davranisChecks` fonksiyonunu şununla değiştir:

```ts
export function davranisChecks(args: { body: DavranisBody; text: string }): ToolCheckOut {
  // Prompt: "ABC analizi (Öncül → Davranış → Sonuç) — tablo": tablo ABC bölümünde (alt başlıkları dahil) aranır.
  const abc = bolumSatirlari(args.text, DAVRANIS_BOLUMLERI.abc);
  const abcTablo = abc && tabloVar(abc) ? 1 : 0;
  // Prompt: "Cezalandırıcı/utandırıcı strateji önerme". Yalnız önerilen stratejiler taranır (gözlem bölümleri hariç) ve olumsuzlama
  // terimin YANINDA aranır ("Time-out kullanılmaz", "cezasız pekiştirme", "utandırmadan verin" ihlal değil; "uymazsa mola odasına
  // gönderin", "Time-out uygulamadan önce uyarı verin" ihlal).
  const ceza = olumluGecisler(oneriMetni(args.text), CEZA);
  // Prompt (Faz 0): "her pekiştireç için sönümlenme basamağı" + bölümün sonunda PEKISTIRME_NOTU aynen.
  // Notun kendisi "sönümlenme basamakları" der → sönümlenme sözcüğü pekiştirme bölümünün NOT DIŞINDAKİ satırlarında
  // (alt başlıkları dahil) aranır; not metnin herhangi bir yerinde, biçimden bağımsız (`notNormalize`) aranır.
  const pek = bolumSatirlari(args.text, DAVRANIS_BOLUMLERI.pekistirme);
  const notSatiri = (l: string) => notNormalize(l).includes(PEKISTIRME_NORM);
  const sonumlenmeSatiri = pek?.some((l) => !notSatiri(l) && lower(l).includes("sönümlen")) ?? false;
  const notVar = notNormalize(args.text).includes(PEKISTIRME_NORM);
  const sonumlenme = sonumlenmeSatiri && notVar ? 1 : 0;
  const scores = { abc_tablo: abcTablo, ceza_yok: ceza.length ? 0 : 1, sonumlenme };
  return { scores, details: { ...scores, ceza: ceza.join("|") }, hard: [] };
}
```

- [ ] **Step 4: Hakem ölçütünü ekle**

`adapter.ts` `criteria` dizisine üçüncü öğe:

```ts
  criteria: [
    { key: "islev_analizi", question: "ABC analizi ve işlev hipotezi verilen gözleme (sıklık, ortam) dayanıyor mu; hipotez tek ve savunulabilir mi; veri yetersizse varsayım üretmek yerine veri toplama öneriliyor mu?" },
    { key: "onleyici_strateji", question: "Önleyici düzenlemeler ve yerine koyma davranışı bu öğrencinin güçlü yönlerine/ilgi alanlarına bağlı, ortama uygun ve öğretilebilir mi; pekiştirme planı cezasız ve somut mu?" },
    { key: "sonumlenme", question: "Pekiştirme planı işlev hipotezine bağlı mı; doğal ve sosyal pekiştireç önce mi, somut ödül yalnız gerekçesiyle ve geçici mi; her pekiştireç için sönümlenme basamağı (hangi ölçütte seyreltilir, neye devredilir) yazılmış mı; bölüm 'pekiştirme geçici bir köprüdür' notuyla bitiyor mu?" },
  ],
```

- [ ] **Step 5: Öz-testler geçsin**

Run: `cd apps/hub && node_modules/.bin/vitest run --config vitest.eval.config.ts evals/tools/atolye/davranis evals/lib`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/hub/evals/tools/atolye/davranis
git commit -m "test(eval): davranış planına sonumlenme kontrolü + hakem ölçütü (Faz 0)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Eval koşusu — davranış + ev ödevi, `faz0` kolu `baseline`'a karşı

**Files:** kod değişmez. Akış dizini ana çalışma kopyasında: `/Users/recepkucuk/ludenlab/.claude/hillclimb/prompt-yukseltme`.

Çevrimdışı döngü (`apps/hub/evals/README.md`, "Çevrimdışı (subagent) döngüsü"): koşu `pending.json` yazar ve durur; orkestratör her satır için `Agent` aracını `subagent_type: "eval-model"`, `model: <satır.agentModel>` ile çağırır (prompt: `İstek: <requestMd>\nYanıt: <responseTxt>`); yeniden koşar. Üretim satırları `sonnet`, hakem satırları `opus`.

- [ ] **Step 1: Kabuk fonksiyonu ve davranış üretim isteklerini yaz**

```bash
cd apps/hub
ev() { node_modules/.bin/vitest run --config vitest.eval.config.ts "$@"; }
EVAL_FLOW=/Users/recepkucuk/ludenlab/.claude/hillclimb/prompt-yukseltme EVAL_TOOL=atolye/davranis EVAL_VARIANT=faz0 ev evals/run.eval.ts
```
Expected: koşu "bekleyen istek" ile durur; `.../atolye/davranis/faz0/pending.json` 4 `gen` satırı (dav-01..04, `agentModel: "sonnet"`).

- [ ] **Step 2: Üretim satırlarını dağıt**

`pending.json`'daki her satır için bir `Agent` çağrısı (hepsi aynı mesajda, paralel): `subagent_type: "eval-model"`, `model: "sonnet"`, prompt `İstek: <requestMd>\nYanıt: <responseTxt>`. Dalgayı `.../faz0/dispatch.jsonl`'e not et (vaka, model, bildirilen token).

- [ ] **Step 3: Yeniden koş → hakem istekleri**

Aynı komut (Step 1). Expected: üretimler tamamlanır, `pending.json` 4 `judge` satırı (`agentModel: "opus"`), her biri `faz0` çıktısını `baseline` `ref/` çıktısıyla karşılaştırır.

- [ ] **Step 4: Hakem satırlarını dağıt ve koşuyu bitir**

Her satır için `Agent` (`eval-model`, `model: "opus"`). Yeniden koş. Expected: `results.jsonl` 4 satır, `pending.json` boş. Boş/bozuk yanıt varsa README madde 5–6: bir kez yeniden dağıt.

- [ ] **Step 5: Ev ödevi için aynı döngü**

```bash
EVAL_FLOW=/Users/recepkucuk/ludenlab/.claude/hillclimb/prompt-yukseltme EVAL_TOOL=atolye/ev-odevi EVAL_VARIANT=faz0 ev evals/run.eval.ts
```
Step 2–4'ü `atolye/ev-odevi/faz0` için tekrarla (eo-01..04).

- [ ] **Step 6: Özet ve kabul**

```bash
EVAL_FLOW=/Users/recepkucuk/ludenlab/.claude/hillclimb/prompt-yukseltme ev evals/summary.eval.ts
```
`/Users/recepkucuk/ludenlab/.claude/hillclimb/prompt-yukseltme/ozet.md` içinde `atolye/davranis` ve `atolye/ev-odevi` satırlarını oku ve `results.jsonl`'den doğrula:
- `hard_fail` her vakada boş; `dil_kurali` ve `yasak_kalip` puanı 1.
- `sonumlenme` (davranış) 4/4 = 1.
- Hakem: `faz0` kolunun `baseline`'a karşı `win` ortalaması ≥ 0,5 (düşmez).

Düşerse: prompt metnini (`davranis-prompts.ts` 6. madde ya da `KURALLAR`) bir tur düzelt, Task 3 testini güncelle, `EVAL_VARIANT=faz0b` ile yeniden koş. İkinci turda da düşerse kullanıcıya sor.

- [ ] **Step 7: Sonucu kaydet**

Kabul tablosunu (vaka × `sonumlenme`, `win`, sert hata) `docs/superpowers/plans/2026-11-04-faz0-odul-dili-ortak-blok.md` dosyasının sonuna "Eval sonucu" başlığıyla ekle ve commit'le:

```bash
git add docs/superpowers/plans/2026-11-04-faz0-odul-dili-ortak-blok.md
git commit -m "docs(plan): Faz 0 eval sonucu (davranış + ev ödevi, faz0 vs baseline)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Bütün doğrulama (test, tip, lint, build, pano)

- [ ] **Step 1: Hub birim testleri**

Run: `cd apps/hub && node_modules/.bin/vitest run`
Expected: hepsi PASS (yeni 4 dosya dahil).

- [ ] **Step 2: Eval öz-testleri (kapı)**

Run: `cd apps/hub && node_modules/.bin/vitest run --config vitest.eval.config.ts evals/lib evals/tools evals/runner.selftest.eval.ts`
Expected: PASS.

- [ ] **Step 3: Tip ve lint**

Run: `pnpm typecheck`
Expected: 4/4 paket geçer.

Run: `cd apps/hub && node_modules/.bin/eslint src/modules/atolye/lib src/modules/studio/lib/prompts "src/app/studio/(main)/dashboard" src/app/studio/api/stats src/modules/studio/components/landing src/modules/atolye/components/Landing.tsx evals/tools/atolye/davranis`
Expected: hata yok.

- [ ] **Step 4: `next build` (arka planda, 2–5 dk)**

Run: `cd apps/hub && node_modules/.bin/next build`
Expected: derleme başarılı; `apps/hub/.next` sonrası ağaç temiz (`git status --short` boş). Deploy `next build`'dir; `tsc` yetmez (hafıza: deploy-verify-next-build).

- [ ] **Step 5: Pano kartı tarayıcıda**

`.claude/launch.json` yoksa oluştur:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "hub", "runtimeExecutable": "pnpm", "runtimeArgs": ["--filter", "@ludenlab/hub", "dev"], "port": 3001 }
  ]
}
```

`preview_start {name: "hub"}` → `/studio/dashboard`. Giriş gerekir; dev sunucusu PROD veritabanına bakar: yalnız oku, hiçbir form gönderme. Giriş için kullanıcıdan hesap istenir; verilmezse bu adım "build ile doğrulandı, görsel kontrol kullanıcıda" diye raporlanır. Görülecek şey: dördüncü kart "Çalışılan Hedef", hedef simgesi, alt yazı "Bu hafta durumu güncellenen hedef"; konsolda hata yok.

- [ ] **Step 6: Landing SSS'leri tarayıcıda (giriş gerekmez)**

`/studio` ve `/atolye` landing sayfalarında SSS bölümünde yeni madde açılıp okunur; `read_page` ile metin doğrulanır.

---

### Task 10: Hafıza notu ve kapanış

- [ ] **Step 1: Hafıza notunu güncelle**

`/Users/recepkucuk/.claude/projects/-Users-recepkucuk-ludenlab/memory/egitim-felsefesi-degerlendirmesi-2026-11.md` dosyasına "Faz 0 TAMAM (tarih, dal, commit aralığı; eval sonucu; rozet sistemi açık nokta)" satırı; `MEMORY.md` satırındaki kancaya "Faz 0 tamam" ekle.

- [ ] **Step 2: Dalın durumu**

`git log --oneline main..HEAD` ile commit listesini göster. Merge/PR kararı kullanıcınındır (superpowers:finishing-a-development-branch). Deploy: `main`'e merge → Hostinger otomatik; migration ve env yok.

---

## Eval sonucu

(Task 8 Step 7'de doldurulur.)
