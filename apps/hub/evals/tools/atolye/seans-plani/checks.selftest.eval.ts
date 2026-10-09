// apps/hub/evals/tools/atolye/seans-plani/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { birimliSureDk, seansChecks } from "./checks";
const md = "## Seans Künyesi\n| Alan | Süre |\n|---|---|\n| Okuma | 40 dk |\n## Etkinlik Akışı\n- Isınma (5 dk): hece blokları\n- Ana etkinlik (25 dk): MEB 3.2.5 — 10 kelimelik kart okuma\n- Tekrar/oyun (5 dk)\n- Kapanış (5 dk)\n## Materyaller\n- kart\n## Ölçme\n- %\n## Ev Görevi\n- okuma\n## Sonraki Adım\n- devam";
describe("seansChecks", () => {
  it("birimliSureDk: birimsiz sayılar (MEB kodu, adet) sayılmaz; aralık ortalaması; sn/saat", () => {
    expect(birimliSureDk("- MEB 3.2.5 ana etkinlik (25 dk)")).toBe(25);
    expect(birimliSureDk("- 2. tur oyun (10 dakika)")).toBe(10);
    expect(birimliSureDk("5-10 dk")).toBe(7.5);
    expect(birimliSureDk("30 sn ısınma + 1 saat")).toBeCloseTo(60.5);
    expect(birimliSureDk("10 kelimelik kart")).toBe(0);
  });
  it("süre toplamı sureDk'ya eşit → 1; MEB kodu geçiyor → 1", () => {
    const r = seansChecks({ body: { alan: "okuma", seansHedefi: "h", sureDk: 40, mebHedefKod: "3.2.5" }, text: md });
    expect(r.scores).toMatchObject({ sure_toplami: 1, meb_kod: 1 });
    expect(r.details.sure).toBe(40);
  });
  it("toplam 10 dk sapınca 0; kod verilmemişse meb_kod yok", () => {
    const r = seansChecks({ body: { alan: "okuma", seansHedefi: "h", sureDk: 30 }, text: md });
    expect(r.scores.sure_toplami).toBe(0);
    expect(r.scores).not.toHaveProperty("meb_kod");
  });
});

/* ── Ek kapsam: süre ayrıştırıcı, akış biçimleri, MEB kodu sınırları, aşamalar ── */

const govde = (sureDk: number, mebHedefKod?: string) => ({ alan: "okuma" as const, seansHedefi: "h", sureDk, ...(mebHedefKod ? { mebHedefKod } : {}) });
const sure = (akis: string, sureDk = 40) => seansChecks({ body: govde(sureDk), text: `## Seans Künyesi\n| Alan | Süre |\n|---|---|\n| Okuma | ${sureDk} dk |\n\n${akis}\n\n## Materyaller\n- kart` });

describe("birimliSureDk (tablo)", () => {
  const cases: Array<[string, number]> = [
    // Birim zorunlu; kod/adet/sıra sayıları süre değildir.
    ["- MEB 3.2.5 ana etkinlik (25 dk)", 25],
    ["kod 3.2.5 dk", 0], // numaranın ortasından başlamaz: 2.5 dk değil
    ["3.2.5.1 hedefi", 0],
    ["10 kelimelik kart, 3 tur, 2. adım", 0],
    ["saat 14.30", 0],
    ["dk", 0],
    ["", 0],
    // Birim biçimleri
    ["10 dakika", 10], ["10 dk.", 10], ["10dk", 10], ["10 DK", 10], ["10 DAKİKA", 10],
    ["10 dakikalık oyun", 10], ["5 dk'lık ısınma", 5], ["5 dk’lık ısınma", 5], ["2 saatlik", 120],
    ["30 sn", 0.5], ["90 saniyelik tur", 1.5], ["1 saat", 60], ["1,5 saat", 90], ["2.5 dk", 2.5],
    // Aralıklar (tire, en tire, em tire; ortalama)
    ["5-10 dk", 7.5], ["5–10 dk", 7.5], ["5—10 dk", 7.5], ["5 - 10 dk", 7.5], ["5 dk - 10 dk", 7.5], ["2-3 dakika", 2.5],
    // Birden çok süre toplanır
    ["Isınma 5 dk + oyun 10 dk", 15], ["30 sn ısınma + 1 saat", 60.5],
  ];
  it.each(cases)("%j → %d", (metin, beklenen) => expect(birimliSureDk(metin)).toBeCloseTo(beklenen));
});

describe("süre toplamı: akış biçimleri", () => {
  it("üst düzey maddeler (spec biçimi)", () => {
    expect(sure("## Etkinlik Akışı\n- Isınma (5 dk)\n- Ana (25 dk)\n- Tekrar (5 dk)\n- Kapanış (5 dk)").details.sure).toBe(40);
  });
  it("alt başlıklar: süre başlıkta, maddelerde süre yok", () => {
    const r = sure("## Etkinlik Akışı\n### 1. Isınma (5 dk)\n- hece kartı\n### 2. Ana Etkinlik (25 dk)\n- okuma\n### 3. Tekrar/Oyun (5 dk)\n- oyun\n### 4. Kapanış (5 dk)\n- özet");
    expect(r.details.sure).toBe(40);
    expect(r.scores.sure_toplami).toBe(1);
  });
  it("alt başlık süreli iken altındaki maddelerin ayrıntı süreleri ve daha derin kalın başlıklar ÇİFT sayılmaz", () => {
    const r = sure("## Etkinlik Akışı\n### Isınma (5 dk)\n- 2 dk hece, 3 dk ses\n### Ana Etkinlik (25 dk)\n**Adım 1 (10 dk)**\n- kart\n**Adım 2 (15 dk)**\n- oyun\n### Tekrar (5 dk)\n### Kapanış (5 dk)");
    expect(r.details.sure).toBe(40);
  });
  it("alt başlık süresiz: maddelerindeki süreler sayılır", () => {
    const r = sure("## Etkinlik Akışı\n### Isınma\n- 5 dk hece\n### Ana Etkinlik\n- 25 dk okuma\n### Kapanış\n- 10 dk özet");
    expect(r.details.sure).toBe(40);
  });
  it("kalın sözde başlıklar (sözde başlıklı akış)", () => {
    expect(sure("**Etkinlik Akışı**\n**Isınma (5 dk)**\n- a\n**Ana Etkinlik (35 dk)**\n- b").details.sure).toBe(40);
  });
  it("tüm bölümler kalın sözde başlık: akış bölümü şablonun sonraki bölümüne (**Materyaller**) kadar sürer", () => {
    const t = "**Seans Künyesi**\n| Süre | 40 dk |\n**Etkinlik Akışı**\n**Isınma (10 dk)**\n- a\n**Ana Etkinlik (30 dk)**\n- b\n**Materyaller**\n- kart (10 dk)\n**Ev Görevi**\n- 5 dk okuma";
    const r = seansChecks({ body: govde(40), text: t });
    expect(r.details.sure).toBe(40);
    expect(r.scores.sure_toplami).toBe(1);
  });
  it("numaralı kalın maddeler ve tablo", () => {
    expect(sure("## Etkinlik Akışı\n1. **Isınma (10 dk):** a\n2. **Ana (30 dk):** b").details.sure).toBe(40);
    const tablo = "## Etkinlik Akışı\n| Aşama | Süre | Etkinlik |\n|---|---|---|\n| Isınma | 10 dk | a |\n| Ana | 30 dk | b |";
    expect(sure(tablo).details.sure).toBe(40);
  });
  it("'Toplam' satırı (madde, tablo satırı, başlık) çift saymaz", () => {
    expect(sure("## Etkinlik Akışı\n- Isınma (10 dk)\n- Ana (30 dk)\n- **Toplam:** 40 dk").details.sure).toBe(40);
    expect(sure("## Etkinlik Akışı\n| Aşama | Süre |\n|---|---|\n| Isınma | 10 dk |\n| Ana | 30 dk |\n| **Toplam** | 40 dk |").details.sure).toBe(40);
    expect(sure("## Etkinlik Akışı\n### Isınma (10 dk)\n### Ana (30 dk)\n### Toplam (40 dk)").details.sure).toBe(40);
    expect(sure("## Etkinlik Akışı (40 dk)\n### Isınma (10 dk)\n### Ana (30 dk)").details.sure).toBe(40); // kök başlıktaki toplam sayılmaz
    expect(sure("## Etkinlik Akışı\n- Seans süresi: 40 dk\n- Isınma (10 dk)\n- Ana (30 dk)").details.sure).toBe(40);
    expect(sure("## Etkinlik Akışı\n- Toplamda 4 blok: Isınma (10 dk), Ana (30 dk)").details.sure).toBe(40); // kelime sınırı: "Toplamda" toplam satırı değildir, süreleri sayılır
  });
  it("blok içi ayrıntı süreleri (üst madde süresi + alt maddeler/açıklama) çift sayılmaz; blok başına ilk süre", () => {
    const r = sure("## Etkinlik Akışı\n- Isınma (10 dk): 3 dk hece, 7 dk ses\n- Ana (30 dk)\n  - 10 dk kart\n  - 20 dk oyun");
    expect(r.details.sure).toBe(40);
    expect(r.scores.sure_toplami).toBe(1);
  });
  it("bir blokta art arda süreler (blok süresi ayrıca yazılmamış): toplam sayılır", () => {
    expect(sure("## Etkinlik Akışı\n- Isınma: 5 dk hece\n- Ana: 10 dk kart ve 20 dk oyun\n- Kapanış: 5 dk").details.sure).toBe(40);
  });
  it("zaman çizelgesi (0–5 dk, 5–30 dk, 30–40 dk): ardışık ofset aralıkları toplam = son uç − ilk uç", () => {
    const r = sure("## Etkinlik Akışı\n- **0–5 dk:** Isınma\n- **5–30 dk:** Ana\n- **30–40 dk:** Kapanış");
    expect(r.details.sure).toBe(40);
    expect(r.scores.sure_toplami).toBe(1);
    const tablo = sure("## Etkinlik Akışı\n| Süre | Etkinlik |\n|---|---|\n| 0-10 dk | Isınma |\n| 10-30 dk | Ana |\n| 30-40 dk | Kapanış |");
    expect(tablo.scores.sure_toplami).toBe(1);
  });
  it("ardışık olmayan aralıklar ofset sayılmaz (5–10 dk belirsizlik aralığıdır): ortalama toplanır", () => {
    const r = sure("## Etkinlik Akışı\n- Isınma (5–10 dk)\n- Ana (20–30 dk)\n- Kapanış (5–10 dk)");
    expect(r.details.sure).toBe(40); // 7,5 + 25 + 7,5
  });
  it("aralıklar ardışık değilse son uç − ilk uç ofset toplamı sayılmaz (tesadüfen istenene eşit olsa bile)", () => {
    const r = sure("## Etkinlik Akışı\n- Isınma (5–10 dk)\n- Ana (15–20 dk)\n- Kapanış (40–45 dk)"); // ofset olsaydı 45 − 5 = 40
    expect(r.details.sure).toBe(67.5);
    expect(r.scores.sure_toplami).toBe(0);
  });
  it("saniye ve saat birimleri; 15 dk'lık kısa seans", () => {
    expect(sure("## Etkinlik Akışı\n- Isınma (30 sn)\n- Ana (14 dk)\n- Kapanış (30 sn)", 15).scores.sure_toplami).toBe(1);
    expect(sure("## Etkinlik Akışı\n- Seans (1 saat)", 60).scores.sure_toplami).toBe(1);
  });
  it("kod, adet ve sıra sayıları toplamı bozmaz (10 kelimelik kart, MEB 3.2.5, 2. tur)", () => {
    expect(sure("## Etkinlik Akışı\n- Isınma (10 dk): 2. tur, 10 kelimelik kart\n- Ana (30 dk): MEB 3.2.5").details.sure).toBe(40);
  });
});

describe("süre toplamı: sınırlar ve eksik çıktı", () => {
  const akis = (...d: number[]) => `## Etkinlik Akışı\n${d.map((x, i) => `- Blok ${i + 1} (${x} dk)`).join("\n")}`;
  it.each([[45, 1], [35, 1], [46, 0], [34, 0], [40, 1], [80, 0], [10, 0]])("toplam %d dk, istenen 40 → %d", (toplam, beklenen) => {
    expect(sure(akis(toplam)).scores.sure_toplami).toBe(beklenen);
  });
  it("akış bölümü yok / boş / süresiz → sure 0, puan 0 (çökmez)", () => {
    for (const t of ["", "Sadece düz metin 40 dk", "## Materyaller\n- kart (40 dk)", "## Etkinlik Akışı\n- Isınma\n- Ana"]) {
      const r = seansChecks({ body: govde(40), text: t });
      expect(r.details.sure, t).toBe(0);
      expect(r.scores.sure_toplami, t).toBe(0);
    }
  });
  it("istenen süre farklıysa farklı karar: aynı akış 30 dk istenince 0, 40 dk istenince 1", () => {
    const a = akis(10, 30);
    expect(sure(a, 40).scores.sure_toplami).toBe(1);
    expect(sure(a, 30).scores.sure_toplami).toBe(0);
  });
  it("künyedeki süre ve akış dışı bölümlerdeki süreler (ev görevi 10 dk) toplama girmez", () => {
    const t = "## Seans Künyesi\n| Süre | 40 dk |\n## Etkinlik Akışı\n- Isınma (10 dk)\n- Ana (30 dk)\n## Ev Görevi\n- Günde 10 dk okuma\n## Sonraki Adım\n- 5 dk ısınma";
    expect(seansChecks({ body: govde(40), text: t }).details.sure).toBe(40);
  });
});

describe("MEB kodu", () => {
  const kod = (text: string, k = "3.2.5") => seansChecks({ body: govde(40, k), text }).scores.meb_kod;
  it.each([
    ["MEB 3.2.5 hedefi", 1], ["(3.2.5)", 1], ["3.2.5.", 1], ["3.2.5'e hizalı", 1], ["3.2.5’e hizalı", 1], ["MEB:3.2.5", 1],
    ["3.2.5.1 davranışı (alt kod)", 1], ["hedef 3.2.5, 3.2.6", 1],
    ["13.2.5 başka kod", 0], ["3.2.50 başka kod", 0], ["3.2.6 başka kod", 0], ["hedef kodu yok", 0], ["", 0], ["v.3.2.5", 0],
  ])("%j → %d", (text, beklenen) => expect(kod(text)).toBe(beklenen));
  it("nokta içeren kod düzenli ifade olarak yorumlanmaz ('3x2x5' eşleşmez)", () => {
    expect(kod("3x2x5")).toBe(0);
    expect(kod("5.1.14 doğal sayılarla toplama", "5.1.14")).toBe(1);
  });
  it("kodun çevresindeki boşluk atılır (ürün şeması da kırpar); yalnız boşluk kod sayılmaz", () => {
    expect(seansChecks({ body: govde(40, " 3.2.5 "), text: "(3.2.5)" }).scores.meb_kod).toBe(1);
    expect(seansChecks({ body: { ...govde(40), mebHedefKod: "  " }, text: md }).scores).not.toHaveProperty("meb_kod");
  });
  it("boş/atlanmış kod: puan yazılmaz", () => {
    expect(seansChecks({ body: { ...govde(40), mebHedefKod: "" }, text: md }).scores).not.toHaveProperty("meb_kod");
    expect(seansChecks({ body: { ...govde(40), mebHedefKod: undefined }, text: md }).scores).not.toHaveProperty("meb_kod");
  });
});

describe("akış aşamaları (prompt: Isınma · Ana Etkinlik · Tekrar/Oyun · Kapanış)", () => {
  const as = (akis: string) => sure(akis).scores.akis_asamalari;
  it("dört aşama (başlık ya da madde, büyük harf dahil) → 1", () => {
    expect(as("## Etkinlik Akışı\n- Isınma (5 dk)\n- Ana Etkinlik (25 dk)\n- Tekrar/Oyun (5 dk)\n- Kapanış (5 dk)")).toBe(1);
    expect(as("## Etkinlik Akışı\n### ISINMA\n### ANA ETKİNLİK\n### TEKRAR\n### KAPANIŞ")).toBe(1);
    expect(as("## Etkinlik Akışı\n1. **Isınma** a\n2. **Ana Etkinlik(ler)** b\n3. **Oyun** c\n4. **Kapanış** d")).toBe(1);
  });
  it("eksik aşama oranı düşürür; hiçbiri yoksa / bölüm yoksa 0", () => {
    expect(as("## Etkinlik Akışı\n- Isınma (5 dk)\n- Ana Etkinlik (30 dk)\n- Kapanış (5 dk)")).toBe(0.75);
    expect(as("## Etkinlik Akışı\n- Ana Etkinlik (40 dk)")).toBe(0.25);
    expect(as("## Etkinlik Akışı\n- Blok (40 dk)")).toBe(0);
    expect(seansChecks({ body: govde(40), text: "" }).scores.akis_asamalari).toBe(0);
  });
  it("aşama adı akış DIŞINDA geçerse sayılmaz (ev görevi 'oyun', künyede 'ısınma')", () => {
    const t = "## Seans Künyesi\n- ısınma ve kapanış planı\n## Etkinlik Akışı\n- Blok (40 dk)\n## Ev Görevi\n- oyun";
    expect(seansChecks({ body: govde(40), text: t }).scores.akis_asamalari).toBe(0);
  });
});

describe("çıktı sözleşmesi", () => {
  it("`talimat` döndürülmez (Atölye'de fabrika hesaplar); ayrılmış anahtar yok; ayrıntı puanları yansıtır", () => {
    const r = seansChecks({ body: govde(40, "3.2.5"), text: md });
    expect(r.scores).not.toHaveProperty("talimat");
    expect(Object.keys(r.scores).sort()).toEqual(["akis_asamalari", "meb_kod", "sure_toplami"]);
    expect(r.details).toMatchObject({ sure_toplami: 1, meb_kod: 1, akis_asamalari: 1 });
    expect(r.hard).toEqual([]);
  });
  it("boş metin çökmez", () => {
    expect(() => seansChecks({ body: govde(40, "3.2.5"), text: "" })).not.toThrow();
  });
});
