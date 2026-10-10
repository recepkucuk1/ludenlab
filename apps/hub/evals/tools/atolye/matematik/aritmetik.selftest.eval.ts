// apps/hub/evals/tools/atolye/matematik/aritmetik.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { aritmetik, aritmetikAyrinti } from "./aritmetik";

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
    "Örnek 1 – 12 + 7 = 19", "Örnek 1 - 12 + 7 = 19", "Soru 3: 45 + 38 = 83", "Soru 3 - 45 + 38 = 83", "1 – 12 + 7 = 19", "1 — 12 + 7 = 19", "2 – 45 + 38 = 83",
    "5 + **3** = 8", "5 + *3* = 8",
    // ondalık (0 ile başlayan nokta binlik değildir), bölme iki nokta, sonuçtan sonra yorum parantezi
    "Örnek : 12 + 7 = 19", "Not : 5 + 3 = 8",
    "0.125 × 2 = 0.25", "0.5 + 0.25 = 0.75", "15 : 3 = 5", "10 : 2 = 5", "38 + 46 = 84 (1 elde)", "38 + 46 = 84 (birler 14, 1 elde)", "27 + 15 = 42 (eldeli)", "6 × 7 = 42 (altı yedi kırk iki)",
    // kesme işaretli Türkçe ekler sonucun parçası değil
    "7 + 5 = 12'yi bulun", "27 + 15 = 42’yi", "38 + 47 = 85'tir", "8 + 6 = 14'ü",
  ];
  it.each(dogru)("doğru: %s", (m) => expect(sayim(m)).toEqual({ toplam: 1, dogru: 1 }));

  const yanlis = [
    "12 + 7 = 18", "20 − 5 = 14", "3 × 4 = 13", "12 ÷ 4 = 4", "2 + 3 + 4 = 10", "2 + 3 × 4 = 20", "(2 + 3) × 4 = 14", "1,5 + 2,5 = 3", "1.000 + 500 = 1.400", "1/2 + 1/4 = 2/6",
    "47 = 40 + 8", "3 × 4 = 6 + 7", "10 ÷ 3 = 3,34", "10 ÷ 3 = 3", "5 ÷ 0 = 0", "-5 + 3 = 2", "**12 + 7 = 18**", "- 12 + 7 = 18", "Çözüm: 12 + 7 = 18",
    "45 + 38 = 73", "27 + 15 = 312", "1 – 12 + 7 = 18", "3 + 12 + 7 = 19", "45 – 12 + 7 = 19",
    // ayraç tire yalnız en/em tire ya da etiket sözcüğüyse: eksi işaretli (− ve -) ifade gerçek işlemdir
    "10 − 3 + 2 = 5", "10 - 3 + 2 = 5", "1 - 12 + 7 = 19", "1 − 12 + 7 = 19", "20 - 12 + 7 = 19",
    "Piyano 20 - 12 + 7 = 19", "Sensör 20 - 12 + 7 = 19",
    "38 + 46 = 85 (1 elde)", "0.125 × 2 = 0.5", "5 = 1 ÷ 0", "15 : 3 = 6",
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
    expect(aritmetikAyrinti("12 + 7 = 19; 3 x 4 = 13; 2 + 2 = 5")).toEqual({ toplam: 3, dogru: 1, yanlis: ["3 x 4 = 13", "2 + 2 = 5"] });
  });
});

describe("aritmetik: sayılmayan (doğrulanamayan) yazımlar — yanlış pozitif yok", () => {
  const sayilmaz = [
    // MEB kodu ve tarih: ne ifade ne eşitlik
    "MEB hedefi 5.1.14 (Doğal sayılarla toplama)", "5.1.14.12 = eldeli toplama", "Hedef kodu = 5.1.14", "5.1.14 + 3 = 8", "3.2.5 − 1.1.1 = 2",
    "Tarih: 12/05/2026", "12.05.2026 - 3.05.2026 = 9", "Saat 12:30 = öğle", "12:30 + 1 = 13:30", "12:30 = 12:30", "Ders 9:40 - 10:20 = 40 dk", "3 + 4 = 5.1.14", "3 + 4 = 12.05.2026", "2026-10-10 = bugün", "Kod=3.2.5.1",
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
    // sonuçtan sonra harfsiz parantez: sonuç sürüyor olabilir
    "5 + 3 = 8 (3 + 5)", "5 + 3 = 8 (8)", "5 + 3 = 8 (3 x 2)", "5 + 3 = 8 (x)",
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


describe("öğrenci hatası olarak sunulan örnekler hangi bölümde olursa olsun sayılmaz", () => {
  it.each([
    "Öğrenci 3 + 4 = 8 der.", "Eldeyi unutursa 38 + 47 = 75 bulur.", "Ali'nin çözümünü kontrol et: 38 + 47 = 75", "Basamakları karıştırırsa 27 + 15 = 312 yazabilir.",
    "Yanılgı: 3 + 4 = 8", "Öğrenci 38 + 47 = 715 yazar.",
    // her işaret tek başına (aynı satırda başka işaret yok)
    "Basamakları karıştırırsa 27 + 15 = 312.", "Öğrenci 27 + 15 = 312 yazabilir.", "Öğrenci 38 + 47 = 75 bulur.", "Eldeyi unutursa 38 + 47 = 75.", "Çözümü kontrol et: 38 + 47 = 75", "Öğrenci 38 + 47 = 75 bulabilir.", "Yanlış anlama: 5 + 3 = 9", "Çocuk eldeyi unutmuş: 38 + 47 = 75",
  ])("sayılmaz: %s", (m) => expect(aritmetik(m)).toEqual({ toplam: 0, dogru: 0 }));
  it("işaretsiz satır sayılır: 'yaz' / 'bul' (emir, öğrenci atfı değil) ve 'derslik', 'derece' gibi sözcükler işaret değildir", () => {
    expect(aritmetik("Sonucu yaz: 38 + 47 = 85")).toEqual({ toplam: 1, dogru: 1 });
    expect(aritmetik("Derslikte 38 + 47 = 85")).toEqual({ toplam: 1, dogru: 1 });
    expect(aritmetik("Dereceyi bul: 38 + 47 = 86")).toEqual({ toplam: 1, dogru: 0 });
  });
  it("kalın başlıklı hata bölümü: kalın alt etiketler ve maddeleri atlanır; şablonun sonraki kalın başlığında biter", () => {
    const t = "**Yaygın hata desenleri**\n**1. Basamak kaydırma**\n- 27 + 15 = 312\n**2. Eldeyi unutma**\n- 38 + 47 = 75\n**Kademeli alıştırma seti**\n- 2 + 2 = 5\n- 3 + 3 = 6";
    expect(aritmetik(t)).toEqual({ toplam: 2, dogru: 1 });
  });
  it("## başlıklı hata bölümü: kardeş ## başlıklar (hata adını taşımasa da) şablonun sonraki bölümüne kadar hata bölümünün parçasıdır", () => {
    const t = "## Yaygın hata desenleri\n## Basamak kaydırma\n- 27 + 15 = 312\n## Eldeyi unutma\n- 38 + 47 = 75\n## Kademeli alıştırma seti\n- 2 + 2 = 5";
    expect(aritmetik(t)).toEqual({ toplam: 1, dogru: 0 });
  });
  it.each(["Yanılgılar", "Yanılgı örnekleri", "Yanlış yanıtlar", "Yaygın hata ve yanılgılar"])("'%s' başlığı hata bölümüdür", (b) => {
    expect(aritmetik(`## ${b}\n- 27 + 15 = 312\n## Kademeli alıştırma seti\n- 2 + 2 = 5`)).toEqual({ toplam: 1, dogru: 0 });
  });
  it.each(["Kazanım ve ön-koşul beceri kontrolü", "CRA dizisi", "Manipülatif ve materyal yönergesi", "Materyal", "Kademeli alıştırma seti", "Alıştırma"])("şablonun sonraki bölümü ('## %s') hata bölümünü bitirir", (b) => {
    expect(aritmetik(`## Yaygın hata desenleri\n- 27 + 15 = 312\n## ${b}\n- 2 + 2 = 5`)).toEqual({ toplam: 1, dogru: 0 });
  });
  it("hata başlığından önceki ve sonraki alt başlıklar: alt başlık hata bölümünün parçası, üst düzey başlıkta biter (### kök, ## sonraki)", () => {
    expect(aritmetik("### Yaygın hata desenleri\n#### Örnek\n- 27 + 15 = 312\n## Başka bölüm\n- 2 + 2 = 5")).toEqual({ toplam: 1, dogru: 0 });
  });
  it("'Alıştırma hataları' başlığı hem şablon başlığı hem hata başlığı: hata bölümü olarak atlanır", () => {
    expect(aritmetik("## Alıştırma hataları\n- 27 + 15 = 312")).toEqual({ toplam: 0, dogru: 0 });
  });
});
