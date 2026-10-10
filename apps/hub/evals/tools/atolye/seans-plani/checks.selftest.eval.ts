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
    ["5 dak.", 5], ["5 dak", 5], ["5-10 dak.", 7.5], ["5'", 5], ["5′", 5], ["(5')", 5], ["10' ısınma + 20' ana", 30], ["5'.", 5], ["5',", 5], ["(5')", 5],
    // asal/kesme: rakama BİTİŞİK ve ardından harf/rakam/tırnak yok; tırnak içindeki sayı süre değil
    ["5 '", 0], ["5'lik kart", 0], ["5'e kadar say", 0], ["'5' kelime", 0], ["\"5' kelime", 0], ["‘5’ kelime", 0], ["5'' ", 0], ["kart '5' ve 10'", 10],
    ["30 sn", 0.5], ["90 saniyelik tur", 1.5], ["1 saat", 60], ["1,5 saat", 90], ["2.5 dk", 2.5],
    // Aralıklar (tire, en tire, em tire; ortalama)
    ["5-10 dk", 7.5], ["5–10 dk", 7.5], ["5—10 dk", 7.5], ["5 - 10 dk", 7.5], ["5 dk - 10 dk", 7.5], ["2-3 dakika", 2.5],
    // Birden çok süre toplanır
    ["Isınma 5 dk + oyun 10 dk", 15], ["30 sn ısınma + 1 saat", 60.5],
  ];
  it.each(cases)("%j → %d", (metin, beklenen) => expect(birimliSureDk(metin)).toBeCloseTo(beklenen));
});

describe("birimliSureDk: kod/ek ve bilinen sınırlar (belgeli)", () => {
  it("MEB kodu + ek ve ardışık kod ('3.2.5'e', '3.2.5'): süre değildir", () => {
    expect(birimliSureDk("MEB 3.2.5'e hizalı")).toBe(0);
    expect(birimliSureDk("MEB 3.2.5’e hizalı 3.2.5'")).toBe(0);
    expect(birimliSureDk("5'e kadar say; 5'lik kart")).toBe(0); // ek gelen asal süre değil ("5'lik" beş parçalı, "5'e" kod+ek)
  });
  it("BİLİNEN SINIRLAR: yazıyla sayı, sıralı dakika ('1.–5. dakika') ve saat-dakika ('10.00–10.05') okunmaz (0 döner; kontrol blok süresiz sayar)", () => {
    expect(birimliSureDk("beş dakika")).toBe(0);
    expect(birimliSureDk("Isınma: bir dakika, ana etkinlik: yirmi dakika")).toBe(0);
    expect(birimliSureDk("1.–5. dakika ısınma")).toBe(0);
    expect(birimliSureDk("10.00–10.05 ısınma")).toBe(0);
    // Böyle bir akış süre toplamında 0 görünür → sure_toplami 0 (sessizce geçmez)
    const t = "## Etkinlik Akışı\n- Isınma: beş dakika\n- Ana: yirmi dakika\n## Materyaller\n- kart";
    expect(seansChecks({ body: { alan: "okuma", seansHedefi: "h", sureDk: 40 }, text: t }).scores.sure_toplami).toBe(0);
  });
});

describe("blok süresi sırası: tek süre → başlıktaki süre → (≥3 süre ve ilk ≈ kalan) ilk → toplam", () => {
  const blok = (satir: string) => sure(`## Etkinlik Akışı\n- ${satir}`).details.sure;
  it.each([
    // koordinatör probeleri
    ["Isınma: 5 dk nefes, 5 dk hece kartı", 10],
    ["Ana Etkinlik: 10 dk kart okuma ve 10 dk saha oyunu", 20],
    ["Ana Etkinlik — 25 dk: 10 dk kart, 10 dk oyun", 25],
    // (1) tek süre
    ["Isınma (5 dk): hece kartı", 5], ["Isınma hece kartı 5 dk", 5],
    // (2) başlıkta süre (":" öncesi), ayrıntı toplamı tutmasa da
    ["Ana Etkinlik (15 dk): 10 dk kart okuma, 5 dk saha oyunu", 15], ["Ana etkinlik (25 dk): 5 dk hece, 10 dk oyun", 25],
    ["Ana (20 dk): 8 dk kart, 10 dk oyun", 20],
    // ":" yoksa " — " öncesi
    ["Ana Etkinlik (25 dk) — 10 dk kart, 10 dk oyun", 25], ["Ana etkinlik — 10 dk kart, 5 dk oyun, 8 dk okuma", 23],
    // (3) ≥3 süre ve ilk ≈ kalan (±1): başlıksız iç içe döküm
    ["Ana (30 dk) 10 dk kart 20 dk oyun", 30], ["Ana: 20 dk blok; 9 dk kart, 10 dk oyun", 20], ["Ana: 20 dk blok; 8 dk kart, 10 dk oyun", 38],
    // (4) toplam: iki süre (ilk = ikinci olsa bile), ilk ≉ kalan
    ["Ana: 10 dk kart ve 20 dk oyun", 30], ["Ana: 5 dk ve 5 dk", 10], ["Ana: 5 dk, 5 dk, 5 dk", 15],
  ])("%s → %d", (satir, beklenen) => expect(blok(satir)).toBe(beklenen));
  it("parantez içindeki ':' başlığı bitirmez: 'Ana Etkinlik (MEB: 3.2.5) — 25 dk: 10 dk kart, 10 dk oyun' → 25", () => {
    expect(blok("Ana Etkinlik (MEB: 3.2.5) — 25 dk: 10 dk kart, 10 dk oyun")).toBe(25);
    expect(blok("Ana Etkinlik [Hedef: 3.2.5] (25 dk): 10 dk kart, 10 dk oyun")).toBe(25);
    expect(blok("Ana Etkinlik (not: kart) : 10 dk kart ve 10 dk oyun")).toBe(20); // dışarıdaki ':' başlığı bitirir; başlıkta süre yok → toplam
    expect(blok("Ana Etkinlik (MEB: 3.2.5): 10 dk kart ve 10 dk oyun")).toBe(20); // parantez kapanır; ':' dışarıda, başlıkta süre yok
    expect(blok("Ana Etkinlik (MEB: 3.2.5 — 10 dk kart, 10 dk oyun)")).toBe(20); // kapanmayan/içte ':' → başlık yok; toplam
  });
  it("tablo satırı: ':' yoksa ilk iki hücre başlıktır (süre sütunu); açıklamadaki ayrıntı çift sayılmaz", () => {
    const r = sure("## Etkinlik Akışı\n| Aşama | Süre (dk) | Etkinlik |\n|---|---|---|\n| Isınma | 5 | 2 dk nefes, 3 dk hece |\n| Ana | 35 | 10 dk kart, 5 dk oyun |");
    expect(r.details.sure).toBe(40);
  });
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
  // tolerans = min(5, max(2, %15 · istenen)): 15 → 2,25; 30 → 4,5; 40 → 5; 60/120 → 5
  it.each([
    [45, 40, 1], [35, 40, 1], [46, 40, 0], [34, 40, 0], [40, 40, 1], [80, 40, 0], [10, 40, 0],
    [34, 30, 1], [26, 30, 1], [35, 30, 0], [25, 30, 0],
    [17, 15, 1], [13, 15, 1], [18, 15, 0], [12, 15, 0],
    [65, 60, 1], [66, 60, 0], [125, 120, 1], [126, 120, 0],
  ])("toplam %d dk, istenen %d → %d", (toplam, istenen, beklenen) => {
    expect(sure(akis(toplam), istenen).scores.sure_toplami).toBe(beklenen);
  });
  it("tolerans tabanı 2 dk (şema dışı küçük süre savunması): istenen 10 → tolerans 2", () => {
    expect(sure(akis(10), 10).details.tolerans).toBe(2);
    expect(sure(akis(12), 10).scores.sure_toplami).toBe(1);
    expect(sure(akis(13), 10).scores.sure_toplami).toBe(0);
  });
  it("tolerans ayrıntıda: min(5, max(2, %15))", () => {
    expect(sure(akis(30), 30).details.tolerans).toBeCloseTo(4.5);
    expect(sure(akis(15), 15).details.tolerans).toBeCloseTo(2.25);
    expect(sure(akis(40), 40).details.tolerans).toBe(5);
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

describe("GFM tablo: birim sütun başlığında", () => {
  const tablo = (baslik: string, ...satirlar: string[]) => `## Etkinlik Akışı\n${baslik}\n|---|---|---|\n${satirlar.join("\n")}`;
  it("`| Aşama | Süre (dk) | Etkinlik |` + gövdede sade sayılar → dakika (spec probe)", () => {
    const r = sure(tablo("| Aşama | Süre (dk) | Etkinlik |", "| Isınma | 5 | hece |", "| Ana etkinlik | 25 | okuma |", "| Tekrar/Oyun | 5 | oyun |", "| Kapanış | 5 | özet |"));
    expect(r.details.sure).toBe(40);
    expect(r.scores.sure_toplami).toBe(1);
  });
  it("başlık biçimleri: Süre / Dakika / Dk / kalın / büyük harf; süre sütunu başta ya da sonda", () => {
    for (const b of ["| Aşama | Süre | Etkinlik |", "| Aşama | Dakika | Etkinlik |", "| Aşama | Dk | Etkinlik |", "| Aşama | **Süre (dk)** | Etkinlik |", "| Aşama | SÜRE (DK) | Etkinlik |"]) {
      expect(sure(tablo(b, "| Isınma | 10 | a |", "| Ana | 30 | b |")).details.sure, b).toBe(40);
    }
    expect(sure(tablo("| Süre (dk) | Aşama | Etkinlik |", "| 10 | Isınma | a |", "| 30 | Ana | b |")).details.sure).toBe(40);
    expect(sure(tablo("| Aşama | Etkinlik | Süre (dk) |", "| Isınma | a | 10 |", "| Ana | b | 30 |")).details.sure).toBe(40);
  });
  it("hücre değeri kalın ya da boşluklu ('**5**', ' 5 '), ondalık ('2,5')", () => {
    expect(sure(tablo("| Aşama | Süre (dk) | Etkinlik |", "| Isınma | **10** | a |", "| Ana | 27,5 | b |", "| Kapanış |  2.5  | c |")).details.sure).toBe(40);
  });
  it("sütun başlığındaki birim: (sn) saniye, (saat) saat", () => {
    expect(sure(tablo("| Aşama | Süre (sn) | Etkinlik |", "| Isınma | 30 | a |", "| Ana | 90 | b |")).details.sure).toBeCloseTo(2);
    expect(sure(tablo("| Aşama | Süre (saat) | Etkinlik |", "| Seans | 1 | a |"), 60).details.sure).toBe(60);
  });
  it("tablo ayracı pipe'sız yatay çizgi ('---') ise tablo sayılmaz: sade sayı süre olmaz", () => {
    expect(sure("## Etkinlik Akışı\n| Aşama | Süre (dk) |\n---\n| Isınma | 5 |").details.sure).toBe(0);
  });
  it("hücrede birim zaten varsa dokunulmaz; sütun başlıksız tabloda sade sayı SÜRE SAYILMAZ", () => {
    expect(sure(tablo("| Aşama | Süre | Etkinlik |", "| Isınma | 10 dk | a |", "| Ana | 30 dk | b |")).details.sure).toBe(40);
    const basliksiz = sure(tablo("| Aşama | Tur | Etkinlik |", "| Isınma | 10 | a |", "| Ana | 30 | b |"));
    expect(basliksiz.details.sure).toBe(0);
    expect(basliksiz.scores.sure_toplami).toBe(0);
  });
  it("aralıklı ofset sütunu ('0-10', '10-30', '30-40') başlıkla dakika olur ve zaman çizelgesi sayılır", () => {
    const r = sure(tablo("| Süre (dk) | Etkinlik |", "| 0-10 | Isınma |", "| 10-30 | Ana |", "| 30-40 | Kapanış |").replace("|---|---|---|", "|---|---|"));
    expect(r.details.sure).toBe(40);
    expect(r.details.sure_c).toBe(40);
  });
  it("süre sütunu varken açıklamadaki ayrıntı süreleri çift sayılmaz (blok başlığı = ilk iki hücre)", () => {
    const r = sure(tablo("| Aşama | Süre (dk) | Etkinlik |", "| Isınma | 10 | 3 dk hece, 7 dk ses |", "| Ana | 30 | 10 dk kart, 5 dk oyun |"));
    expect(r.details.sure).toBe(40); // Isınma: ilk 10 ≈ 3+7; Ana: 30 ≠ 15 ama başlıkta (ilk iki hücre) süre var
  });
  it("Toplam satırı (süre başlıklı ve başlıksız, boş ilk hücreli) sayılmaz", () => {
    const r = sure(tablo("| Aşama | Süre (dk) | Etkinlik |", "| Isınma | 10 | a |", "| Ana | 30 | b |", "| **Toplam** | **40** | |"));
    expect(r.details.sure).toBe(40);
    expect(sure(tablo("| Aşama | Süre (dk) | Etkinlik |", "| Isınma | 10 | a |", "| Ana | 30 | b |", "| — | Toplam | 40 dk |")).details.sure).toBe(40);
    expect(sure(tablo("| Aşama | Süre | Etkinlik |", "| Isınma | 10 dk | a |", "| Ana | 30 dk | b |", "| | Toplam süre | 40 dk |")).details.sure).toBe(40);
  });
  it("'Toplam' sözcüğü bir açıklama hücresinde geçerse satır atılmaz", () => {
    const r = sure(tablo("| Aşama | Süre (dk) | Etkinlik |", "| Isınma | 10 | toplam beceri tekrarı |", "| Ana | 30 | b |"));
    expect(r.details.sure).toBe(40);
  });
});

describe("blok süresi: belirleyici okuma (sure_a / sure_b / sure_c ayrıntıda, seçilen `sure`)", () => {
  it("probe: 'Ana Etkinlik (15 dk): 10 dk kart okuma, 5 dk saha oyunu' 15 sayılır; 30 dk'lık plan 40 dk istenene karşı tutmaz", () => {
    const akis = "## Etkinlik Akışı\n- Isınma (5 dk)\n- Ana Etkinlik (15 dk): 10 dk kart okuma, 5 dk saha oyunu\n- Tekrar (5 dk)\n- Kapanış (5 dk)";
    const r = sure(akis, 40);
    expect(r.details.sure).toBe(30);
    expect(r.scores.sure_toplami).toBe(0);
    expect(r.details).toMatchObject({ sure_a: 45, sure_b: 30, sure_c: "—" }); // ham toplam 45 (40 ± 5) olurdu: tesadüfen geçiren okuma seçilmez
    expect(sure(akis, 30).scores.sure_toplami).toBe(1);
  });
  it("ilk süre ≈ kalanların toplamı (±1) → ilk", () => {
    expect(sure("## Etkinlik Akışı\n- Ana (20 dk): 9 dk kart, 10 dk oyun").details.sure).toBe(20);
    expect(sure("## Etkinlik Akışı\n- Ana (20 dk): 8 dk kart, 10 dk oyun").details.sure).toBe(20); // ≈ değil, ama başlıkta süre var
  });
  it("ilk süre ile kalanlar tam 1 dk farklıysa hâlâ 'ilk' (başlıksız blokta bile); 2 dk farklıysa toplam", () => {
    expect(sure("## Etkinlik Akışı\n- Ana: 20 dk blok; 9 dk kart, 10 dk oyun").details.sure).toBe(20);
    expect(sure("## Etkinlik Akışı\n- Ana: 20 dk blok; 8 dk kart, 10 dk oyun").details.sure).toBe(38);
  });
  it("başlıkta süre varsa o (ayrıntı toplamı tutmasa da); başlıkta yoksa toplam", () => {
    expect(sure("## Etkinlik Akışı\n- Ana etkinlik (25 dk): 5 dk hece, 10 dk oyun").details.sure).toBe(25);
    expect(sure("## Etkinlik Akışı\n- Ana: 10 dk kart ve 20 dk oyun").details.sure).toBe(30);
    expect(sure("## Etkinlik Akışı\n- Ana etkinlik — 10 dk kart, 5 dk oyun, 8 dk okuma").details.sure).toBe(23); // ayraç ' — ' öncesi süresiz
  });
  it("tek süre → o; süresiz blok → 0", () => {
    expect(sure("## Etkinlik Akışı\n- Isınma (5 dk)\n- Açıklama satırı").details.sure).toBe(5);
  });
  it("üç ham okuma ayrıntıda: a = tüm süreler, b = blok başına ilk süre, c = zaman çizelgesi", () => {
    const r = sure("## Etkinlik Akışı\n- Isınma (10 dk): 3 dk hece, 7 dk ses\n- Ana (30 dk)\n  - 10 dk kart\n  - 20 dk oyun");
    expect(r.details).toMatchObject({ sure: 40, sure_a: 80, sure_b: 40, sure_c: "—" });
    const z = sure("## Etkinlik Akışı\n- 0–5 dk: Isınma\n- 5–40 dk: Ana");
    expect(z.details).toMatchObject({ sure: 40, sure_c: 40 });
  });
  it("seçim istenen süreye bakmaz: aynı akış için `sure` istenenden bağımsızdır", () => {
    const akis = "## Etkinlik Akışı\n- Ana (15 dk): 10 dk kart, 5 dk oyun\n- Kapanış (15 dk)";
    expect(sure(akis, 40).details.sure).toBe(30);
    expect(sure(akis, 60).details.sure).toBe(30);
    expect(sure(akis, 30).details.sure).toBe(30);
  });
});

describe("bölüm regex'leri (tek kaynak): ev ödevi, sonraki seans", () => {
  it("SEANS_BOLUM_LISTESI altı bölümü kapsar; 'Ev Ödevi/Ev Çalışması' ve '(Bir) Sonraki Seans' kabul; akış 'akış' ile bulunur", async () => {
    const { SEANS_BOLUM_LISTESI } = await import("./checks");
    expect(SEANS_BOLUM_LISTESI).toHaveLength(6);
    const bulunan = (h: string) => SEANS_BOLUM_LISTESI.filter((re) => re.test(h)).length;
    for (const h of ["seans künyesi", "etkinlik akışı", "materyaller", "ölçme", "ev görevi", "ev ödevi", "ev çalışması", "sonraki adım", "sonraki seans", "bir sonraki seans için öneri"]) expect(bulunan(h), h).toBe(1);
    for (const h of ["giriş", "özet", "ev"]) expect(bulunan(h), h).toBe(0);
  });
  it("akış bölümü ev ödevi / sonraki seans bölümünün süreleri toplama girmez (kalın başlıklarda da)", () => {
    const t = "**Etkinlik Akışı**\n**Isınma (10 dk)**\n- a\n**Ana (30 dk)**\n- b\n**Ev Ödevi**\n- 10 dk okuma\n**Bir Sonraki Seans**\n- 5 dk ısınma";
    expect(seansChecks({ body: govde(40), text: t }).details.sure).toBe(40);
  });
});

describe("özet tablo + ayrıntı başlıkları TEK akıştır: ≥2 süreli tablo satırı varsa tablo çizelgedir, tablo dışı başlık/maddeler ayrıntıdır", () => {
  // Sonnet 5.5 taban çıktıları (2026-10-10): kök tablo ya da `### Süre Dağılımı` tablosu + her blok için süreli `###` başlık → eski kural ikisini de blok sayıp süreyi iki kez topluyordu (40 → 80).
  const tablo40 =
    '| Adım | Süre | Etkinlik |\n| --- | --- | --- |\n| Isınma | 7 dk | Hece ısınması: "Soyunma odası" |\n| Ana Etkinlik 1 | 10 dk | Lego hece kulesi |\n| Ana Etkinlik 2 | 11 dk | Oku ve sahaya diz |\n| Tekrar/Oyun | 8 dk | Penaltı atışı |\n| Kapanış | 4 dk | Maç sonu |\n| **Toplam** | **40 dk** | |';
  const basliklar40 =
    '### Isınma · "Soyunma odası" (7 dk)\n- **Fonolojik farkındalık (2 dk):** a\n- **Hece okuma (5 dk):** b\n  - c\n### Ana Etkinlik 1 · Lego hece kulesi (10 dk) — hedef: 3.2.5.1 ve 3.2.5.2\n- a\n### Ana Etkinlik 2 · Oku ve sahaya diz (11 dk) — hedef: 3.2.5.3\n- b\n### Tekrar/Oyun · Penaltı atışı (8 dk)\n- c\n### Kapanış · Maç sonu değerlendirmesi (4 dk)\n- d';
  it("kök tablo + süreli alt başlıklar (seans-01 biçimi): yalnız tablo satırları blok → 40, 5 blok, puan 1; Toplam satırı ayrıntıda", () => {
    const r = sure(`## Etkinlik Akışı\n\n${tablo40}\n\n${basliklar40}`);
    expect(r.details).toMatchObject({ sure: 40, blok_sayisi: 5, toplam_satiri: 40 });
    expect(r.scores.sure_toplami).toBe(1);
  });
  it("`| Bölüm | Süre | Dakika |` (süre + ofset sütunu) + süreli başlıklar, başlık altında kalın alt başlık ve `| Dk | Görev |` ayrıntı tablosu (seans-02 biçimi) → 30", () => {
    const tablo =
      "| Bölüm | Süre | Dakika |\n| --- | --- | --- |\n| Isınma: Dinozor yürüyüşü ve davul | 5 dk | 0–5 |\n| Ana Etkinlik 1: Dinozor izleri (masada) | 7 dk | 5–12 |\n| Tekrar/Oyun 1: Koşmaca | 5 dk | 12–17 |\n| Ana Etkinlik 2: Davulun çizgileri (masada) | 7 dk | 17–24 |\n| Tekrar/Oyun 2: Dur–başla davulu | 3 dk | 24–27 |\n| Kapanış | 3 dk | 27–30 |\n| **Toplam** | **30 dk** | |";
    const basliklar =
      "### Isınma: Dinozor yürüyüşü ve davul (5 dk)\n- a\n### Ana Etkinlik 1: Dinozor izleri (7 dk)\n**Geçiş (yaklaşık 2 dk):**\n- b\n**Masada kalma penceresi (5 dk):**\n| Dk | Görev | Destek |\n| --- | --- | --- |\n| 1 | yol çiz | ses |\n| 2 | boya | dokunsal |\n### Tekrar/Oyun 1: Koşmaca (5 dk)\n- c\n### Ana Etkinlik 2: Davulun çizgileri (7 dk)\n- d\n### Tekrar/Oyun 2: Dur–başla davulu (3 dk)\n- e\n### Kapanış (3 dk)\n- f";
    const r = sure(`## 2. Etkinlik Akışı\n\n${tablo}\n\n${basliklar}`, 30);
    expect(r.details).toMatchObject({ sure: 30, blok_sayisi: 6, toplam_satiri: 30 });
    expect(r.scores.sure_toplami).toBe(1);
    // Yalnız ofset sütunu varsa zaman çizelgesi tablo kipinde de okunur (son uç − ilk uç).
    const ofset = "| Bölüm | Dakika |\n| --- | --- |\n| Isınma | 0–5 |\n| Ana Etkinlik | 5–27 |\n| Kapanış | 27–30 |\n\n### Isınma (5 dk)\n- a\n### Ana Etkinlik (22 dk)\n- b\n### Kapanış (3 dk)\n- c";
    expect(sure(`## Etkinlik Akışı\n\n${ofset}`, 30).details).toMatchObject({ sure: 30, sure_c: 30, blok_sayisi: 3 });
  });
  it("`### Süre Dağılımı` alt başlığı altındaki tablo + süreli başlıklar (seans-03 biçimi): başlık altındaki ayrıntı tablosu ve kalın alt süreler sayılmaz → 60", () => {
    const akis =
      '## 2. Etkinlik Akışı\n\n### Süre Dağılımı\n\n| Bölüm | Süre | Odak |\n| --- | --- | --- |\n| Isınma | 8 dk | Yüzde = "100\'de kaç" anlamını canlandırma |\n| Ana Etkinlik 1 | 15 dk | Modelleme |\n| Ana Etkinlik 2 | 17 dk | Uygulama |\n| Tekrar/Oyun | 12 dk | İndirim oyunu |\n| Kapanış | 8 dk | Özet |\n| **Toplam** | **60 dk** | |\n\n### Isınma (8 dk)\n- a\n### Ana Etkinlik 1: Adım Kutuları (15 dk)\n| Kutu | Soru | Örnek |\n| --- | --- | --- |\n| 1. Bilgiler | Bütün ne? | 800 TL |\n- b\n### Ana Etkinlik 2 (17 dk)\n- **Rehberli aşama (8 dk):** 3 problem\n- **Bağımsız aşama (9 dk):** 3 problem\n### Tekrar/Oyun (12 dk)\n- c\n### Kapanış (8 dk)\n- **Özet (3 dk):** a\n- **Kısa ölçme (3 dk):** b';
    const r = sure(akis, 60);
    expect(r.details).toMatchObject({ sure: 60, blok_sayisi: 5, toplam_satiri: 60 });
    expect(r.scores.sure_toplami).toBe(1);
  });
  it("tablo ile başlıklar farklı sayı söylüyorsa TABLO kazanır; istenene yakın okuma seçilmez (aynı akış 30 istenince 1, 40 istenince 0)", () => {
    // tablo 10 + 20 = 30; başlıklar 10 + 30 = 40
    const akis = "## Etkinlik Akışı\n| Aşama | Süre |\n|---|---|\n| Isınma | 10 dk |\n| Ana | 20 dk |\n### Isınma (10 dk)\n- a\n### Ana (30 dk)\n- b";
    expect(sure(akis, 40).details).toMatchObject({ sure: 30, blok_sayisi: 2 });
    expect(sure(akis, 40).scores.sure_toplami).toBe(0);
    expect(sure(akis, 30).scores.sure_toplami).toBe(1);
    // tersi: tablo istenene eşit, bir başlık farklı → yine tablo
    const akis2 = "## Etkinlik Akışı\n| Aşama | Süre |\n|---|---|\n| Isınma | 10 dk |\n| Ana | 30 dk |\n### Isınma (10 dk)\n- a\n### Ana (25 dk)\n- b";
    expect(sure(akis2, 40).details.sure).toBe(40);
  });
  it("tablo satırları yanlış toplanıyor, Toplam satırı istenene eşit → Toplam satırı KURTARMAZ: sure = satır toplamı, puan 0; toplam_satiri ayrıntıda", () => {
    const akis = "## Etkinlik Akışı\n| Aşama | Süre |\n|---|---|\n| Isınma | 10 dk |\n| Ana | 20 dk |\n| **Toplam** | **40 dk** |\n### Isınma (10 dk)\n- a\n### Ana (20 dk)\n- b";
    const r = sure(akis, 40);
    expect(r.details).toMatchObject({ sure: 30, blok_sayisi: 2, toplam_satiri: 40 });
    expect(r.scores.sure_toplami).toBe(0);
    // başlıksız (yalnız tablo) biçimde de aynı
    const yalnizTablo = "## Etkinlik Akışı\n| Aşama | Süre (dk) |\n|---|---|\n| Isınma | 10 |\n| Ana | 20 |\n| **Toplam** | **40** |";
    expect(sure(yalnizTablo, 40).details).toMatchObject({ sure: 30, toplam_satiri: 40 });
    expect(sure(yalnizTablo, 40).scores.sure_toplami).toBe(0);
  });
  it("tablo yokken davranış değişmez: süreli başlıklar/maddeler blok; toplam_satiri yoksa '—'", () => {
    const r = sure("## Etkinlik Akışı\n### Isınma (10 dk)\n- a\n### Ana (30 dk)\n- b");
    expect(r.details).toMatchObject({ sure: 40, blok_sayisi: 2, toplam_satiri: "—" });
    expect(sure("## Etkinlik Akışı\n- Isınma (10 dk)\n- Ana (30 dk)").details).toMatchObject({ sure: 40, blok_sayisi: 2, toplam_satiri: "—" });
  });
  it("toplam_satiri madde biçiminde de okunur ('**Toplam:** 40 dk', 'Seans süresi: 40 dk'); süresiz Toplam satırı '—'", () => {
    expect(sure("## Etkinlik Akışı\n- Isınma (10 dk)\n- Ana (30 dk)\n- **Toplam:** 40 dk").details.toplam_satiri).toBe(40);
    expect(sure("## Etkinlik Akışı\n- Seans süresi: 40 dk\n- Isınma (10 dk)\n- Ana (30 dk)").details.toplam_satiri).toBe(40);
    expect(sure("## Etkinlik Akışı\n- Isınma (10 dk)\n- Ana (30 dk)\n- Toplam: dört blok").details.toplam_satiri).toBe("—");
  });
  it("tek süreli tablo satırı çizelge sayılmaz (eşik 2): başlıklar da blok kalır", () => {
    const r = sure("## Etkinlik Akışı\n| Aşama | Süre |\n|---|---|\n| Isınma | 10 dk |\n### Ana (30 dk)\n- a");
    expect(r.details).toMatchObject({ sure: 40, blok_sayisi: 2 });
  });
  it("süresiz tablo (sütun başlığında birim yok, hücrede de yok) çizelge değildir: başlıklar sayılır", () => {
    const r = sure("## Etkinlik Akışı\n| Aşama | Tur |\n|---|---|\n| Isınma | 2 |\n| Ana | 3 |\n### Isınma (10 dk)\n- a\n### Ana (30 dk)\n- b");
    expect(r.details.sure).toBe(40);
  });
  it("seans-04 biçimi: akış kökü `###` ve blok başlıkları da `###` → aynı düzey, akış yalnız tabloyu kapsar → 15 (değişmedi)", () => {
    const t =
      "## Bireysel Seans Planı\n\n### 1. Seans Künyesi\n| Süre | 15 dakika |\n\n### 2. Etkinlik Akışı\n\n| Bölüm | Süre | Amaç |\n| --- | --- | --- |\n| Isınma | 2 dk | a |\n| Ana Etkinlik 1 | 5 dk | b |\n| Ana Etkinlik 2 | 4 dk | c |\n| Tekrar/Oyun | 2 dk | d |\n| Kapanış | 2 dk | e |\n| **Toplam** | **15 dk** | |\n\n### Isınma (2 dk)\n- a\n### Ana Etkinlik 1 (5 dk)\n- **Modelleme (1 dk):** a\n- **Uygulama (3 dk):** b\n### Kapanış (2 dk)\n- c\n\n### 3. Materyaller\n- kart";
    const r = seansChecks({ body: govde(15), text: t });
    expect(r.details).toMatchObject({ sure: 15, blok_sayisi: 5, toplam_satiri: 15 });
    expect(r.scores.sure_toplami).toBe(1);
  });
  it("BİLİNEN SINIR (belgeli): süresiz alt başlık altındaki ≥2 satırlı süre tablosu da çizelge sayılır; dışındaki süreli başlık ayrıntı olur (2+3 = 5, 35 dk'lık Ana sayılmaz)", () => {
    const r = sure("## Etkinlik Akışı\n### Isınma\n| Adım | Süre |\n|---|---|\n| Nefes | 2 dk |\n| Hece | 3 dk |\n### Ana Etkinlik (35 dk)\n- a");
    expect(r.details).toMatchObject({ sure: 5, blok_sayisi: 2 });
    expect(r.scores.sure_toplami).toBe(0);
  });
});
