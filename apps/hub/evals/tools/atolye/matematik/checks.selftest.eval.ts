// apps/hub/evals/tools/atolye/matematik/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { aritmetik, matematikChecks } from "./checks";
describe("matematikChecks", () => {
  it("aritmetik ifadeler doğrulanır: 2 doğru 1 yanlış → 2/3", () => {
    expect(aritmetik("12 + 7 = 19, 20 − 5 = 15 ve 3 × 4 = 13")).toEqual({ toplam: 3, dogru: 2 });
    const r = matematikChecks({ body: { alanProfili: "islem_akiciligi", kazanimKonu: "k", somutlukDuzeyi: "somut" }, text: "12 + 7 = 19; 3 x 4 = 13" });
    expect(r.scores.aritmetik_dogru).toBe(0.5);
  });
  it("ifade yoksa 1; CRA sırası (somut→yarı-somut→soyut) başlıkta geçerse cra 1", () => {
    const r = matematikChecks({ body: { alanProfili: "sayi_hissi", kazanimKonu: "k", somutlukDuzeyi: "somut" }, text: "## CRA dizisi\n### Somut\n- a\n### Yarı-somut\n- b\n### Soyut\n- c" });
    expect(r.scores).toMatchObject({ aritmetik_dogru: 1, cra: 1 });
  });
});

/* ── Ek kapsam: aritmetik ayrıştırıcı (yanlış pozitif korumaları), hata bölümü, CRA sırası ── */

const govde = { alanProfili: "islem_akiciligi" as const, kazanimKonu: "k", somutlukDuzeyi: "somut" as const };
const kontrol = (text: string, body: Parameters<typeof matematikChecks>[0]["body"] = govde) => matematikChecks({ body, text });
const sayim = (metin: string) => aritmetik(metin);

describe("aritmetik: doğrulanan eşitlikler", () => {
  const dogru = [
    "12 + 7 = 19", "20 − 5 = 15", "20 – 5 = 15", "20 — 5 = 15", "20 - 5 = 15", "3 × 4 = 12", "3 x 4 = 12", "3 X 4 = 12", "3x4=12", "3 · 4 = 12", "3 * 4 = 12", "12 ÷ 4 = 3", "12 / 4 = 3", "12:4=3",
    // zincir, öncelik, parantez
    "2 + 3 + 4 = 9", "10 − 3 − 2 = 5", "2 + 3 × 4 = 14", "(2 + 3) × 4 = 20", "250 × 20 ÷ 100 = 50", "250 − (250 × 20 ÷ 100) = 200", "100 ÷ 5 × 2 = 40",
    // ondalık (virgül ve nokta), binlik
    "1,5 + 2,5 = 4", "1,5 + 2 = 3,5", "0,1 + 0,2 = 0,3", "1.5 + 2 = 3.5", "1.000 + 500 = 1.500", "2.500 − 500 = 2.000", "12.500,75 + 0,25 = 12.501",
    // kesir (bölme olarak)
    "1/2 + 1/4 = 3/4", "1/3 + 1/3 = 2/3",
    // iki tarafta ifade; sağ taraf ifade
    "3 × 4 = 6 + 6", "47 = 40 + 7", "40 + 7 = 47",
    // tekli eksi
    "-5 + 3 = -2", "−5 + 3 = −2", "3 − 5 = -2", "3 × -2 = -6",
    // ondalık sonuçta yuvarlama/kırpma
    "10 ÷ 3 = 3,33", "10 ÷ 3 = 3,3", "11 ÷ 3 = 3,67", "11 ÷ 3 = 3,66",
    // sarmalayıcılar
    "**12 + 7 = 19**", "*12 + 7 = 19*", "`12 + 7 = 19`", "- 12 + 7 = 19", "* 12 + 7 = 19", "+ 12 + 7 = 19", "• 12 + 7 = 19", "1. 12 + 7 = 19", "1) 12 + 7 = 19", "a) 12 + 7 = 19",
    "| 12 + 7 = 19 | tamam |", "Çözüm: 12 + 7 = 19", "Örnek 2: 45 + 38 = 83", "Alıştırma 3: 45 + 38 = 83", "(12 + 7 = 19 elma)", "Max 5 + 3 = 8", "12 + 7 = 19 elma", "3 × 4 = 12cm",
    // etiket + eksi
    "Örnek 1 – 12 + 7 = 19", "1 - 12 + 7 = 19", "2 – 45 + 38 = 83",
    "5 + **3** = 8", "5 + *3* = 8",
    // kesme işaretli Türkçe ekler sonucun parçası değil
    "7 + 5 = 12'yi yan yana yazar", "27 + 15 = 42’yi", "38 + 47 = 85'tir", "8 + 6 = 14'ü",
  ];
  it.each(dogru)("doğru: %s", (m) => expect(sayim(m)).toEqual({ toplam: 1, dogru: 1 }));

  const yanlis = [
    "12 + 7 = 18", "20 − 5 = 14", "3 × 4 = 13", "12 ÷ 4 = 4", "2 + 3 + 4 = 10", "2 + 3 × 4 = 20", "(2 + 3) × 4 = 14", "1,5 + 2,5 = 3", "1.000 + 500 = 1.400", "1/2 + 1/4 = 2/6",
    "47 = 40 + 8", "3 × 4 = 6 + 7", "10 ÷ 3 = 3,34", "10 ÷ 3 = 3", "5 ÷ 0 = 0", "-5 + 3 = 2", "**12 + 7 = 18**", "- 12 + 7 = 18", "Çözüm: 12 + 7 = 18",
    "45 + 38 = 73", "27 + 15 = 312", "1 – 12 + 7 = 18", "3 + 12 + 7 = 19", "45 – 12 + 7 = 19",
  ];
  it.each(yanlis)("yanlış: %s", (m) => expect(sayim(m)).toEqual({ toplam: 1, dogru: 0 }));

  it("satır başına birden çok eşitlik; satırlar bağımsız (satır sonu jetonları birleştirmez)", () => {
    expect(sayim("12 + 7 = 19, 20 − 5 = 15 ve 3 × 4 = 13")).toEqual({ toplam: 3, dogru: 2 });
    expect(sayim("- 1\n- 2 + 3 = 5")).toEqual({ toplam: 1, dogru: 1 });
    expect(sayim("2 + 3 =\n5")).toEqual({ toplam: 0, dogru: 0 });
  });
  it("zincirli eşitlik: her '=' ayrı sınanır", () => {
    expect(sayim("12 + 7 = 19 = 20 − 1")).toEqual({ toplam: 2, dogru: 2 });
    expect(sayim("12 + 7 = 19 = 20 − 2")).toEqual({ toplam: 2, dogru: 1 });
  });
  it("ayrıntı: yanlış ifadeler metniyle raporlanır", () => {
    expect(kontrol("12 + 7 = 19; 3 x 4 = 13; 2 + 2 = 5").details).toMatchObject({ ifade: 3, dogru: 1, yanlis_ifade: "3 x 4 = 13 | 2 + 2 = 5" });
  });
});

describe("aritmetik: sayılmayan (doğrulanamayan) yazımlar — yanlış pozitif yok", () => {
  const sayilmaz = [
    // MEB kodu ve tarih: ne ifade ne eşitlik
    "MEB hedefi 5.1.14 (Doğal sayılarla toplama)", "5.1.14.12 = eldeli toplama", "Hedef kodu = 5.1.14", "5.1.14 + 3 = 8", "3.2.5 − 1.1.1 = 2",
    "Tarih: 12/05/2026", "12.05.2026 - 3.05.2026 = 9", "3 + 4 = 5.1.14", "3 + 4 = 12.05.2026", "2026-10-10 = bugün", "Kod=3.2.5.1",
    // yüzde
    "250 × 20% = 50", "250 × %20 = 50", "%20 × 5 = 100", "20 + 30 = 50%",
    // birimli / sözcüklü
    "1 saat = 60 dk", "5 elma + 3 elma = 8 elma", "5 + 3 elma = 8", "1 m = 100 cm", "3 hafta = 3 × 7 gün", "Alan = 3 × 4",
    // boşluk / bilinmeyen / soru
    "5 + ___ = 8", "5 + _ = 8", "5 + ? = 8", "5 + □ = 8", "5 + 3 = ___", "5 + 3 = ?", "5 + 3 =", "= 8",
    // değişken / cebir
    "Örnek - 5 + 3 = 8", "2x + 3 = 11", "x = 5", "3x = 12", "5 + 3x = 14", "x + y = 10", "a = b + c",
    // kalanlı bölme
    "17 ÷ 5 = 3 kalan 2", "17 ÷ 5 = 3 (kalan 2)", "17 / 5 = 3, kalan 2",
    // karma sayı ve bileşik yazımlar
    "1 1/2 + 2 = 3 1/2", "2 1/2 + 1 1/2 = 4",
    // sonuç sürüyor
    "3 + 4 = 7x", "3 + 4 = 7 x",
    // tek sayılar: ifade yok
    "1 = 1", "60 = 60", "10 / 20 / 30", "1, 2, 3, 4, 5", "Saat 10:30", "3 : 4",
    // yaklaşık eşitlik doğrulanmaz
    "10 ÷ 3 ≈ 3,3", "10 ÷ 3 ≈ 3", "10 ÷ 3 ~ 3",
    // karşılaştırma işaretleri
    "3 + 4 >= 7", "3 + 4 <= 8", "3 + 4 != 8", "3 + 4 => 8", "3 + 4 == 8",
    "", "   ", "Eşitlik yok burada.",
  ];
  it.each(sayilmaz)("sayılmaz: %s", (m) => expect(sayim(m)).toEqual({ toplam: 0, dogru: 0 }));

  it("sağ taraf ifadeyse tam ifade sınanır: '2 + 3 = 5 x 2' yanlış (10), '2 + 3 = 5 x 1' doğru", () => {
    expect(sayim("2 + 3 = 5 x 2")).toEqual({ toplam: 1, dogru: 0 });
    expect(sayim("2 + 3 = 5 x 1")).toEqual({ toplam: 1, dogru: 1 });
  });
  it("oran eşitliği: 3:4 = 6:8 iki yanı da bölme olarak değerlendirilir ve doğrudur", () => {
    expect(sayim("3:4 = 6:8")).toEqual({ toplam: 1, dogru: 1 });
  });
  it("sağ/sol 'x' harfli sözcüğe bitişikse çarpma değildir ('Alex 3 = ...' benzeri)", () => {
    expect(sayim("Alex 3 + 4 = 7")).toEqual({ toplam: 1, dogru: 1 }); // 'x' harfler içinde: ifade yalnızca 3 + 4
    expect(sayim("box2 + 3 = 5")).toEqual({ toplam: 0, dogru: 0 }); // 'box2': değişkene bitişik
  });
});

describe("aritmetik: hata bölümü ve hata/yanlış işaretli satırlar öğrenci hatası örneğidir, ürün hatası değil", () => {
  const hata = "## Yaygın hata desenleri + müdahale ipucu\n- Basamak kaydırma: öğrenci 38 + 47 = 715 yazar.\n  - Müdahale: 38 + 47 = 85'i onluk bloklarla göster.\n";
  it("hata bölümündeki yanlış eşitlikler (alt başlıklar ve iç içe maddeler dahil) sayılmaz; bölümden sonraki yanlış sayılır", () => {
    expect(sayim(hata)).toEqual({ toplam: 0, dogru: 0 });
    expect(sayim(`${hata}### Örnek\n- 27 + 15 = 312\n## Alıştırma\n- 2 + 2 = 5`)).toEqual({ toplam: 1, dogru: 0 });
    expect(sayim(`## Alıştırma\n- 2 + 2 = 4\n${hata}## Alıştırma 2\n- 3 + 3 = 7`)).toEqual({ toplam: 2, dogru: 1 });
  });
  it("kalın sözde başlık kökü: aynı düzeydeki sonraki başlıkta bölüm biter", () => {
    expect(sayim("**Yaygın hata desenleri**\n- 38 + 47 = 715\n**Alıştırma seti**\n- 2 + 2 = 5")).toEqual({ toplam: 1, dogru: 0 });
  });
  it("'hatasız' başlığı hata bölümü değildir", () => {
    expect(sayim("## Hatasız toplama\n- 2 + 2 = 5")).toEqual({ toplam: 1, dogru: 0 });
  });
  it.each([
    "Öğrenci 38 + 47 = 715 yazar (yanlış).", "Hatalı: 38 + 47 = 715", "Tipik hata: 38 + 47 = 715", "38 + 47 = 715 ✗", "38 + 47 = 715 ❌", "Bu doğru değil: 38 + 47 = 715", "Basamak kaydırma hatası → 38 + 47 = 715",
  ])("hata işaretli satır sayılmaz: %s", (m) => expect(sayim(m)).toEqual({ toplam: 0, dogru: 0 }));
  it("'hatasız' satırı hata işareti değildir", () => {
    expect(sayim("Hatasız hesap: 2 + 2 = 5")).toEqual({ toplam: 1, dogru: 0 });
  });
});

describe("cra: aşama sırası (prompt: 'Somut etkinlik → Yarı-somut → Soyut, kademeli')", () => {
  const cra = (text: string, somutlukDuzeyi: "somut" | "yari_somut" | "soyut" = "somut") => kontrol(text, { ...govde, somutlukDuzeyi }).scores.cra;
  const tam = (bas: string, a: string[]) => `## 2. CRA dizisi\n${a.map((x) => `${bas}${x}`).join("\n- açıklama\n")}\n- açıklama\n## 3. Manipülatif yönergesi\n- x`;
  const ucu = ["Somut etkinlik", "Yarı-somut (görsel temsil)", "Soyut"];
  it.each([
    ["### başlıklar", tam("### ", ucu)],
    ["#### başlıklar", tam("#### ", ucu)],
    ["numaralı başlıklar", tam("### ", ["1. Somut", "2. Yarı-somut", "3. Soyut"])],
    ["'Aşama N: ' başlıkları", tam("### ", ["Aşama 1: Somut", "Aşama 2: Görsel temsil (Yarı-Somut)", "Aşama 3: Soyut"])],
    ["kalın etiket maddeleri", tam("- **", ["Somut:** onluk bloklar", "Yarı-somut:** çizim", "Soyut:** sayılarla"])],
    ["düz madde etiketleri", tam("- ", ["Somut: bloklar", "Yarı-somut: çizim", "Soyut: sayılar"])],
    ["numaralı maddeler", tam("", ["1. Somut aşama", "2. Yarı somut aşama", "3. Soyut aşama"])],
    ["tablo satırları", "## CRA dizisi\n| Aşama | Etkinlik |\n|---|---|\n| Somut | bloklar |\n| Yarı-somut | çizim |\n| Soyut | sayılar |"],
    ["büyük harfli (tr-TR)", tam("### ", ["SOMUT", "YARI-SOMUT", "SOYUT"])],
    ["ASCII 'yari'", tam("### ", ["Somut", "Yari-somut", "Soyut"])],
    ["tire türleri: en tire, em tire, kırılmaz tire", tam("### ", ["Somut", "Yarı–somut", "Soyut"])],
    ["em tire", tam("- ", ["Somut: a", "Yarı—somut: b", "Soyut: c"])],
    ["kırılmaz tire (U+2011)", tam("- ", ["Somut: a", "Yarı\u2011somut: b", "Soyut: c"])],
    ["tire yerine boşluk / en tire / eksiz", tam("### ", ["Somut", "Yarı somut", "Soyut"])],
    ["parantezli etiket", tam("### ", ["(1) Somut", "(2) Yarı-somut", "(3) Soyut"])],
    ["madde içinde 'Adım N (Etiket)'", tam("- ", ["Adım 1 (Somut): bloklar", "Adım 2 (Yarı-somut): çizim", "Adım 3 (Soyut): sayılar"])],
    ["'ücra' başlığı CRA bölümü sayılmaz: gerçek CRA bölümü bulunur", `## Ücra köşe\n- Somut: x\n${tam("### ", ucu)}`],
    ["kalın sözde başlıklar (CRA kökü kalın)", "**CRA dizisi**\n**Somut**\n- a\n**Yarı-somut**\n- b\n**Soyut**\n- c\n**Manipülatif yönergesi**\n- x"],
    ["CRA başlığı yok: metnin tamamında", "## Basamaklar\n### Somut\n- a\n### Yarı-somut\n- b\n### Soyut\n- c"],
  ])("sıralı → 1: %s", (_ad, t) => expect(cra(t)).toBe(1));

  it.each([
    ["ters sıra", tam("### ", ["Soyut", "Yarı-somut", "Somut"])],
    ["yarı-somut eksik", tam("### ", ["Somut", "Soyut"])],
    ["soyut eksik", tam("### ", ["Somut", "Yarı-somut"])],
    ["somut eksik", tam("### ", ["Yarı-somut", "Soyut"])],
    ["yalnız kök başlık (prompt başlığı kopyalanmış, aşama yok)", "## 2. CRA dizisi: Somut → Yarı-somut → Soyut\n- Kademeli ilerleyin.\n## 3. Manipülatif\n- x"],
    ["kök başlıkta yalnız 'somut' geçer (aşama değil), altında yalnız yarı-somut ve soyut var", "## CRA dizisi (somut başlangıç)\n### Yarı-somut\n- b\n### Soyut\n- c"],
    ["aşama sözcükleri satır başında değil, ayrı satırlarda", "## CRA dizisi\n- Öğrenci önce somut materyalle çalışır.\n- Ardından yarı-somut çizimlerle çalışır.\n- Son olarak soyut işlemlerle çalışır."],
    ["özet cümlesi aşama sayılmaz (satır somutla başlıyor ama tek aşama)", "## CRA dizisi\n- Somut → yarı-somut → soyut sırası izlenir.\n## Materyal\n- x"],
    ["aşama sözcükleri cümle ortasında", "## CRA dizisi\n- Önce somut materyal, sonra yarı-somut çizim, en son soyut işlem.\n## Materyal\n- x"],
    ["somutlaştırma / soyutlama sözcükleri aşama etiketi değildir", tam("### ", ["Somutlaştırma", "Yarı-somutlaştırma", "Soyutlama"])],
    ["CRA bölümü dışındaki etiketler sayılmaz", "## CRA dizisi\n- hiçbir aşama\n## Manipülatif\n### Somut\n### Yarı-somut\n### Soyut"],
    ["boş metin", ""],
  ])("0: %s", (_ad, t) => expect(cra(t)).toBe(0));

  it("başlangıç düzeyi: yarı-somut başlangıçta [yarı, soyut] yeter; soyut başlangıçta [soyut] yeter; somut başlangıçta üçü gerekir", () => {
    const yarıSoyut = tam("### ", ["Yarı-somut", "Soyut"]);
    expect(cra(yarıSoyut, "yari_somut")).toBe(1);
    expect(cra(yarıSoyut, "somut")).toBe(0);
    expect(cra(tam("### ", ["Soyut"]), "soyut")).toBe(1);
    expect(cra(tam("### ", ["Soyut"]), "yari_somut")).toBe(0);
    expect(cra(tam("### ", ucu), "yari_somut")).toBe(1); // tam dizi her başlangıçta geçerli
    expect(cra(tam("### ", ucu), "soyut")).toBe(1);
    expect(cra(tam("### ", ["Soyut", "Yarı-somut", "Somut"]), "soyut")).toBe(1); // soyutta başlayıp geri basamak (destek)
    expect(cra(tam("### ", ["Yarı-somut"]), "yari_somut")).toBe(0); // soyut yok
    expect(cra(tam("### ", ["Soyut", "Yarı-somut"]), "yari_somut")).toBe(0); // yarı sonrasında soyut yok
  });
  it("bilinmeyen/eksik başlangıç düzeyi somut gibi (çökmez)", () => {
    expect(cra(tam("### ", ucu), undefined as never)).toBe(1);
    expect(cra(tam("### ", ["Soyut"]), undefined as never)).toBe(0);
  });
  it("ayrıntı: bulunan aşama sırası", () => {
    expect(kontrol(tam("### ", ucu)).details.cra_asamalar).toBe("somut>yari>soyut");
    expect(kontrol("").details.cra_asamalar).toBe("");
  });
});

describe("çıktı sözleşmesi", () => {
  it("`talimat` döndürülmez; aritmetik_dogru ve cra; ayrıntılar puanları yansıtır; sert hata yok; boş metinde çökmez", () => {
    const r = kontrol("## CRA dizisi\n### Somut\n- 2 + 3 = 5\n### Yarı-somut\n- a\n### Soyut\n- 2 + 3 = 6");
    expect(Object.keys(r.scores).sort()).toEqual(["aritmetik_dogru", "cra"]);
    expect(r.scores).toEqual({ aritmetik_dogru: 0.5, cra: 1 });
    expect(r.details).toMatchObject({ ifade: 2, dogru: 1, aritmetik_dogru: 0.5, cra: 1 });
    expect(r.hard).toEqual([]);
    expect(kontrol("").scores).toEqual({ aritmetik_dogru: 1, cra: 0 });
  });
});
