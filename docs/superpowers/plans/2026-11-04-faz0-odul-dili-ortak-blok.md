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

> **Uygulama notu (2026-11-04):** plan bir eval öz-testini atlamıştı: `evals/tools/atolye/ev-odevi/adapter.selftest.eval.ts`
> (satır 75–77) eski "Ödül veya oyun tabanlı bitiriş" satırını ürün dosyasından okuyup sabitliyordu. Ek commit'le
> öz-test yeni satırı sabitler, eskisinin yokluğunu doğrular; başlığı "ürün istemi oyunlu kapanış ister ve ödül/puan
> istemez (Faz 0)…" olur. Hakem ölçütleri değişmez.

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

> **Uygulama notu (2026-11-04, kod incelemesi sonrası):** (1) `updatedAt` `@updatedAt` olduğundan sayı not
> düzenlemelerini de kapsar → alt yazı "Bu hafta kaydı güncellenen hedef"; üçüncü kart "Bu hafta tamamlanan
> hedef". (2) `goalsCompleted` eski bir hata taşıyordu: hedef takibi "mastered" yazar, pano yalnız
> "completed" sayıyordu → `studentContext.ts` `TAMAMLANAN_DURUMLAR` dışa açıldı ve rota ikisini sayar.
> (3) Kaynak-metin bekçi testi `stats/weekly/weeklyStats.test.ts` eklendi (seri/alev geri gelemez).
> (4) Kapsam dışı bulgu, AYRI İŞ: asistanın `goal_status` önerisi uygulanınca PUT `students/[id]/progress`
> `notes: u.notes ?? null` yazdığı için hedefin uzman notu siliniyor (`AssistantTab.tsx` notes göndermiyor).

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

> **Uygulama notu (2026-11-04, kod incelemesi sonrası):** metinler netleştirildi — Studio: "çıkartma, puan,
> yıldız tablosu ya da ödül sistemi önermez"; Atölye: "puana, çıkartmaya ya da ödüle dayalı bir sistem
> önermez … DEHB Davranış Destek Planı … her pekiştirecin zamanla nasıl azaltılıp doğal sonuçlara
> devredileceğini (sönümlenme basamağı) yazar". Kesin metin spec §8'de. Ayrıca `toolGate.test.ts`'e Studio
> iskelet bekçisi eklendi. Aşağıdaki adımlar ilk hâlidir.

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
  it("satıra bölünmüş not tek başına sönümlenme sayılmaz → 0; bölünmüş not + ayrı sönümlenme satırı → 1", () => {
    const bolunmus = "**Not:**\nPekiştirme bu planda geçici bir köprüdür; sönümlenme basamakları uygulanmadan plan tamamlanmış sayılmaz.";
    expect(pek(`- Övgü.\n${bolunmus}`)).toBe(0);
    expect(pek(`- Övgü; 5 ardışık başarıda seyreltilir (sönümlenme).\n${bolunmus}`)).toBe(1);
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

> **Uygulama notu:** aşağıdaki kod `540b74a` ile uygulandı ve `f91162d` ile şu noktalarda DEĞİŞTİ (kod esastır):
> not bölümün İÇİNDE aranır (`pekNorm.includes(PEKISTIRME_NORM)`), yapıştırıcı `join("|")`, hakem ölçütü notun
> tam başlangıcını alıntılar ve `dil_etik` istisnasını söyler; üç ek fikstür (alt başlık bloğu → 1, 8. bölümdeki
> not → 0, etiketsiz not → 0). Planı yeniden uygulayacak biri `f91162d`'yi esas alsın.
>
> **Düzeltme (2026-11-04, Task 3 kod incelemesi):** ilk taslak iki hata taşıyordu. (1) `PEKISTIRME_NOTU`'nun
> kendisi "sönümlenme basamakları" dediği için not satırı bölümdeyken kontrol boş bölümde de geçiyordu →
> sönümlenme sözcüğü NOT DIŞINDAKİ bölüm satırlarında aranır. (2) `text.includes(PEKISTIRME_NOTU)` modelin
> kalın yazdığı `**Not:** …` biçimini kaçırıyordu → not, `TASLAK_NOTU` gibi `notNormalize` ile karşılaştırılır.

`checks.ts` import satırlarını güncelle: mevcut `import { ORTAM_KEYS } from "@atolye/lib/davranis";` satırı
`PEKISTIRME_NOTU`'yu da alır (ikinci import satırı AÇMA; lint çift-import'u işaretler), `lib/markdown`
import'una `notNormalize` eklenir. `lower` bu dosyada içe aktarılı DEĞİLDİR ve gerekmez (arama normalize
metinde yapılır):

```ts
import { ORTAM_KEYS, PEKISTIRME_NOTU } from "@atolye/lib/davranis";
import { AYRAC, TABLO, baslikMi, notNormalize } from "../../../lib/markdown";
```

Dosya düzeyinde sabitler (fonksiyonların üstüne):

```ts
/** Faz 0: pekiştirme bölümünün sonundaki sabit not ve aranan sözcük, biçimden bağımsız (kalın/noktalama/İ-ı/satır
    bölünmesi) karşılaştırma için `notNormalize` ile ("sönümlen" → "sonumlen"). */
const PEKISTIRME_NORM = notNormalize(PEKISTIRME_NOTU);
const SONUMLEN_NORM = notNormalize("sönümlen");
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
  // Notun kendisi "sönümlenme basamakları" der → pekiştirme bölümünün (alt başlıkları dahil) metni normalize edilir,
  // not ÇIKARILIR, kalanında "sonumlen" aranır (satıra bölünmüş not da çıkar). Not, metnin herhangi bir yerinde
  // biçimden bağımsız aranır (`TASLAK_NOTU` ile aynı yöntem).
  const pek = bolumSatirlari(args.text, DAVRANIS_BOLUMLERI.pekistirme);
  const pekNotsuz = pek ? notNormalize(pek.join("\n")).split(PEKISTIRME_NORM).join("") : "";
  const sonumlenmeVar = pekNotsuz.includes(SONUMLEN_NORM);
  const notVar = notNormalize(args.text).includes(PEKISTIRME_NORM);
  const sonumlenme = sonumlenmeVar && notVar ? 1 : 0;
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

> **Uygulama notu (2026-11-04):** koşturucu yalnız `baseline | v1 | v2` varyantlarını tanır (`v1` = "yeni prompt ·
> Sonnet"); bu yüzden kol `EVAL_VARIANT=v1 EVAL_TAG=faz0` ile açılır, dizin adı `v1@faz0`, referans `baseline`.
> Aşağıdaki komutlarda `EVAL_VARIANT=faz0` yazan yerler `EVAL_VARIANT=v1 EVAL_TAG=faz0` okunur. Kapsam kararı
> (kullanıcı, 2026-11-04): 7 araç — davranış, ev ödevi, veli mektubu, materyal, seans planı, ilerleme çizelgesi,
> BEP (4'er vaka).

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
- Deterministik `sonumlenme` (davranış) 4/4 = 1. Bir vaka 0 verirse önce çıktıyı oku (bölüm algılama ilk
  eşleşmeyi alır: "### Öğretim ve pekiştirme" gibi erken bir alt başlık 6. bölümü yutabilir); prompt'a
  dokunmadan önce yanlış-sıfır olasılığını ele.
- Hakem İKİLİ karşılaştırır (A/B/berabere, evet/hayır değil): `criteria.sonumlenme` kazanımı 4/4 `faz0`.
  "Her pekiştireç için sönümlenme" şartını hakem doğrulayamaz (taban notu hiç içermediği için faz0 tek
  satırla da kazanır) → her faz0 çıktısının 6. bölümü ELLE okunur: her pekiştirecin ölçütü + neye
  devredildiği var mı; sonuç "Eval sonucu" tablosuna vaka vaka yazılır.
- Hakem: `faz0` kolunun `baseline`'a karşı `win` ortalaması ≥ 0,5 (düşmez).
- Not: davranış tabanının saklı `talimat`ı 5 bileşenden hesaplanmıştı; `sonumlenme` eklenince 6 bileşen
  olur ve yeniden puanlanan taban en çok 0,83 verir. Bu beklenen bir düşüştür (README "UI'den türeyen
  kurallar" ilkesi); "Eval sonucu"na bir satırla yazılır.
- Ödül taraması, `details.odul`'dan geniş: çıktı dosyalarında `puan|rozet|skor|yıldız|çıkartma|ödül` sayımı tabandan düşük; övgü/geri bildirim korunmuş (`övgü|takdir|geri bildirim` kaybolmamış).

**Kapsam kararı (Step 0, kullanıcıya sor):** taban çıktılarında veli-mektubu, materyal, seans-plani, ilerleme-cizelgesi ve bep de kendiliğinden ödül/çıkartma önermiş. SSS "çıktılar ödül önermez" diyeceği için bu beş aracın da `faz0` kolunda koşulması önerilir (4'er vaka → toplam 7 araç, 28 üretim + 28 hakem alt-ajan çağrısı). Kullanıcı reddederse yalnız davranış + ev ödevi koşulur ve Atölye SSS metni yumuşatılır.

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

`preview_start {name: "hub"}` → `/studio/dashboard`. Giriş gerekir; dev sunucusu PROD veritabanına bakar: yalnız oku, hiçbir form gönderme. Giriş için kullanıcıdan hesap istenir; verilmezse bu adım "build ile doğrulandı, görsel kontrol kullanıcıda" diye raporlanır. Görülecek şey: dördüncü kart "Çalışılan Hedef", hedef simgesi, alt yazı "Bu hafta kaydı güncellenen hedef"; üçüncü kart alt yazısı "Bu hafta tamamlanan hedef"; konsolda hata yok.

- [ ] **Step 6: Landing SSS'leri tarayıcıda (giriş gerekmez)**

`/studio` ve `/atolye` landing sayfalarında SSS bölümünde yeni madde açılıp okunur; `read_page` ile metin doğrulanır.

---

### Task 10: Hafıza notu ve kapanış

- [ ] **Step 1: Hafıza notunu güncelle**

`/Users/recepkucuk/.claude/projects/-Users-recepkucuk-ludenlab/memory/egitim-felsefesi-degerlendirmesi-2026-11.md` dosyasına "Faz 0 TAMAM (tarih, dal, commit aralığı; eval sonucu; rozet sistemi açık nokta)" satırı; `MEMORY.md` satırındaki kancaya "Faz 0 tamam" ekle.

- [ ] **Step 2: Dalın durumu**

`git log --oneline main..HEAD` ile commit listesini göster. Merge/PR kararı kullanıcınındır (superpowers:finishing-a-development-branch). Deploy: `main`'e merge → Hostinger otomatik; migration ve env yok.

---

## Eval sonucu (2026-11-04, kol `v1@faz0` ↔ `baseline`, 7 araç × 4 vaka)

Koşu: çevrimdışı `eval-model` alt-ajanlarıyla (üretim Sonnet, hakem Opus), akış dizini
`<worktree>/.claude/hillclimb/prompt-yukseltme` (bir PreToolUse kancası worktree oturumundan ana depodaki
paylaşımlı `.claude/` dizinine yazmayı engellediği için taban kolları worktree'ye kopyalandı; sonuçların ana
kopyaya taşınması worktree dışı bir oturumdan yapılmalı — kopyalama komutu burada da reddedildi).

| Araç | win (faz0 vs taban) | sert hata | dil_kurali / yasak_kalip | talimat (taban → faz0) | çıktı token | karar |
|---|---|---|---|---|---|---|
| atolye/davranis | 4/4 = 1,00 | 0/4 | 4/4 · 4/4 | 1,00 → 0,96 | +18 % | KABUL ADAYI |
| atolye/ev-odevi | 4/4 = 1,00 | 0/4 | 4/4 · 4/4 | 1,00 → 0,94 | +5 % | KABUL ADAYI |
| atolye/veli-mektubu | 4/4 = 1,00 | 0/4 | 4/4 · 4/4 | 1,00 → 1,00 | +5 % | KABUL ADAYI |
| atolye/materyal | 4/4 = 1,00 | 0/4 | 4/4 · 4/4 | 1,00 → 1,00 | −1 % | KABUL ADAYI |
| atolye/seans-plani | 4/4 = 1,00 | 0/4 | 4/4 · 4/4 | 1,00 → 1,00 | +15 % | KABUL ADAYI |
| atolye/ilerleme-cizelgesi | 4/4 = 1,00 | 0/4 | 4/4 · 4/4 | 1,00 → 1,00 | −18 % | KABUL ADAYI |
| atolye/bep | 4/4 = 1,00 | 0/4 | 4/4 · 4/4 | 0,96 → 0,95 | +21 % | win tamam; bütçe +21 % |

Davranış planı, vaka vaka (kabul: deterministik `sonumlenme` 4/4, hakem `criteria.sonumlenme` 4/4, elle okuma):

| Vaka | det. sonumlenme | hakem sonumlenme | hakem dil_etik | elle okuma: her pekiştireç için ölçüt + devir | not 6. bölümün son satırı | bölüm dışı ödül sistemi |
|---|---|---|---|---|---|---|
| dav-01 | 1 | 1 | 1 | EVET (6 pekiştireç; somut: dinozor figürü, gerekçeli, en çok 3 hafta) | evet | yok |
| dav-02 | 1 | 1 | 1 | EVET (5; ölçüt bölüm başındaki ortak kuraldan; "somut" nesne okunan kartın kopyası) | evet | yok |
| dav-03 | 1 | 1 | 1 | EVET (5; 6.2 ve 6.4'te ölçüt ortak aşama kuralından; somut: çizim defteri, en uzun 6 hafta) | evet | yok |
| dav-04 | 1 | 1 | 1 | EVET (6; sönümlenme tablosu; somut: kitap ayracı, "geçici köprü", toplam süre sınırı yazılmamış) | evet | yok |

Geniş ödül taraması (`puan|rozet|skor|yıldız|çıkartma|ödül`, faz0 / taban eşleşme sayısı): davranış 11/15,
ev ödevi 8/52, veli mektubu 0/6, materyal 5/9, seans planı 4/5, ilerleme çizelgesi 1/2, BEP 0/1. Davranış
dışındaki faz0 eşleşmelerinin TAMAMI olumsuzlama ("dışsal ödül kullanılmaz", "çıkartma, puan … verilmez",
"skor tutulmaz"); davranıştakiler 6. bölümün izinli pekiştirme planı. Övgü/geri bildirim korunmuş
(ör. ev ödevi eo-01 "Hecelere böldün, 'kale' ortaya çıktı"). Hakem gerekçeleri tabanın ödül kurgularını
("çizelge dolunca ödül", "yıldız ya da çıkartma ekleyin") açıkça kaybetme nedeni olarak yazıyor.

Notlar: (1) davranış tabanının saklı `talimat`ı 5 bileşenle hesaplanmıştı, faz0 6 bileşenle (sonumlenme);
dav-04 0,83 bunun yansıması değil, faz0'ın kendi yapı puanı — hakem yine faz0'ı seçti. (2) BEP ve davranış
çıktıları yaklaşık beşte bir uzadı (sönümlenme tabloları, gerekçeler); kesilme yok. (3) Hakem ölçütü
`dil_etik` veli mektubu/materyal/BEP'te bazı vakalarda 0,5 (berabere): iki kol da ödül önermiyor.

**Kabul: GEÇTİ.** Yedi araçta da faz0 tabanı geçiyor, sert hata yok, davranış istisnası her vakada
sönümlenme şartını karşılıyor, SSS'nin "çıktılar ödül sistemi önermez" vaadi ölçümle destekleniyor.
