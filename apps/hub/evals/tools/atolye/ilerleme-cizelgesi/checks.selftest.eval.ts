// apps/hub/evals/tools/atolye/ilerleme-cizelgesi/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { ilerlemeChecks, ILERLEME_BOLUM_LISTESI } from "./checks";
describe("ilerlemeChecks", () => {
  it("doğru sütunlar, boş sonuç hücreleri → 1/1/1", () => {
    const md = "## Çizelge\n| Tarih | Ölçüt/Gösterge | Sonuç (% veya sıklık) | Not |\n|---|---|---|---|\n| | Hece okuma | | |\n| | Sözcük okuma | | |";
    expect(ilerlemeChecks({ body: { hedefMetni: "h" }, text: md }).scores).toMatchObject({ tablo_var: 1, sutunlar: 1, sonuc_bos: 1 });
  });
  it("sonuç hücresi dolu → sonuc_bos düşer; tablo yoksa hepsi 0", () => {
    const md = "| Tarih | Ölçüt | Sonuç | Not |\n|---|---|---|---|\n| 1.10 | a | %80 | |\n| | b | | |";
    expect(ilerlemeChecks({ body: { hedefMetni: "h" }, text: md }).scores.sonuc_bos).toBe(0.5);
    expect(ilerlemeChecks({ body: { hedefMetni: "h" }, text: "- madde" }).scores).toMatchObject({ tablo_var: 0, sutunlar: 0, sonuc_bos: 0 });
  });
});

/* ── Ek kapsam ── */

const kontrol = (text: string) => ilerlemeChecks({ body: { hedefMetni: "h" }, text });
const BASLIK = "| Tarih | Ölçüt/Gösterge | Sonuç (% veya sıklık) | Not |";
const AYRAC = "|---|---|---|---|";
const tablo = (...satirlar: string[]) => [BASLIK, AYRAC, ...satirlar].join("\n");
const bos = (olcut: string) => `| | ${olcut} | | |`;
const sonuc = (...satirlar: string[]) => kontrol(tablo(...satirlar)).scores.sonuc_bos;

describe("bölüm listesi: tek kaynak (adapter `sections`)", () => {
  it("dört bölüm: bileşenler, veri toplama çizelgesi, ölçüm sıklığı/yöntem, yorumlama", () => {
    expect(ILERLEME_BOLUM_LISTESI).toHaveLength(4);
    const [bilesen, cizelge, olcum, yorum] = ILERLEME_BOLUM_LISTESI as [RegExp, RegExp, RegExp, RegExp];
    expect(bilesen.test("hedefin gözlenebilir bileşenleri")).toBe(true);
    for (const h of ["veri toplama çizelgesi", "çizelge", "veri toplama"]) expect(cizelge.test(h), h).toBe(true);
    for (const h of ["ölçüm sıklığı ve yöntemi", "yöntem"]) expect(olcum.test(h), h).toBe(true);
    expect(yorum.test("ilerleme yorumlama notu")).toBe(true);
  });
});

describe("tablo_var / tablo biçimi (prompt: 'boş bir Markdown tablo')", () => {
  it.each([
    ["ayraç |---|", tablo(bos("a"))],
    ["hizalı ayraç", `${BASLIK}\n| :--- | :---: | ---: | --- |\n${bos("a")}`],
    ["boşluklu ayraç", `${BASLIK}\n| --- | --- | --- | --- |\n${bos("a")}`],
    ["kısa ayraç", `${BASLIK}\n|-|-|-|-|\n${bos("a")}`],
    ["başında metin ve bölüm", `## 2. Veri toplama çizelgesi\nAşağıdaki tabloyu kullanın.\n\n${tablo(bos("a"))}\n\n## 3. Ölçüm`],
    ["girintili", `  ${BASLIK}\n  ${AYRAC}\n  ${bos("a")}`],
  ])("tablo var: %s", (_ad, md) => expect(kontrol(md).scores.tablo_var).toBe(1));
  it.each([
    ["maddeler", "- Tarih\n- Ölçüt\n- Sonuç"],
    ["ayraç satırı yok", `${BASLIK}\n${bos("a")}`],
    ["yatay çizgi tablo ayracı değil", `${BASLIK}\n---\n${bos("a")}`],
    ["başında boru işareti yok (bu araç tablo saymaz)", "Tarih | Ölçüt | Sonuç | Not\n--- | --- | --- | ---\n | a | | "],
    ["boş metin", ""],
  ])("tablo yok: %s → 0/0/0", (_ad, md) => expect(kontrol(md).scores).toMatchObject({ tablo_var: 0, sutunlar: 0, sonuc_bos: 0 }));
  it("gövde satırı olmayan tablo: tablo var, sütunlar tam, sonuç boşluğu ölçülecek satır yok → 0", () => {
    expect(kontrol(`${BASLIK}\n${AYRAC}`).scores).toMatchObject({ tablo_var: 1, sutunlar: 1, sonuc_bos: 0 });
  });
  it("tablo gövdesi ilk tablo-dışı satırda biter: sonraki metin ve ikinci tablonun satırları gövdeye katılmaz", () => {
    const md = `${tablo(bos("a"))}\nAçıklama paragrafı\n| 9.10 | b | %90 | |`;
    expect(kontrol(md).details.satir).toBe(1);
    expect(kontrol(md).scores.sonuc_bos).toBe(1);
  });
});

describe("sutunlar (prompt: 'sütunlar: Tarih · Ölçüt/Gösterge · Sonuç (% veya sıklık) · Not')", () => {
  const baslikla = (b: string) => `${b}\n|---|---|---|---|\n${bos("a")}`;
  it.each([
    ["| Tarih | Ölçüt/Gösterge | Sonuç (% veya sıklık) | Not |", 1],
    ["| Tarih | Ölçüt | Sonuç | Not |", 1],
    ["| Tarih | Gösterge | Sonuç | Notlar |", 1],
    ["| **Tarih** | **Ölçüt/Gösterge** | **Sonuç** | **Not** |", 1],
    ["| TARİH | ÖLÇÜT/GÖSTERGE | SONUÇ (%) | NOT |", 1],
    ["| Oturum tarihi | Hedef ölçüt | Sonuçlar | Gözlem notu |", 1],
    ["| Not | Sonuç | Ölçüt | Tarih |", 1],
    ["| Tarih | Ölçüt | Sonuç | Hedef davranış | Not |", 1],
    ["| Tarih | Ölçüt | Sonuç |", 0.75],
    ["| Tarih | Ölçüt | Sonuç | Yorum |", 0.75],
    ["| Ölçüt | Sonuç |", 0.5],
    ["| Tarih | Ölçüt | Değer | Not |", 0.75],
    ["| Hedef | Düzey |", 0],
  ])("başlık %s → %d", (b, beklenen) => expect(kontrol(baslikla(b)).scores.sutunlar).toBe(beklenen));
  it("'not' yalnız sözcük olarak aranır: 'pozisyon', 'notasyon' Not sütunu değildir", () => {
    expect(kontrol(baslikla("| Tarih | Ölçüt | Sonuç | Pozisyon |")).scores.sutunlar).toBe(0.75);
    expect(kontrol(baslikla("| Tarih | Ölçüt | Sonuç | Notasyon |")).scores.sutunlar).toBe(0.75);
  });
  it("birden çok tablo: en çok istenen sütunu taşıyan (veri toplama) tablo seçilir; bileşen tablosu ve yöntem tablosu seçilmez", () => {
    const md = [
      "## 1. Bileşenler", "| Bileşen | Ölçüt | Koşul |", "|---|---|---|", "| Hece okuma | 8/10 | resimli |", "",
      "## 2. Veri toplama çizelgesi", tablo(bos("Hece okuma"), bos("Sözcük okuma")), "",
      "## 3. Yöntem", "| Ne | Sıklık | Not |", "|---|---|---|", "| okuma | haftada 2 | liste |",
    ].join("\n");
    const r = kontrol(md);
    expect(r.scores).toMatchObject({ tablo_var: 1, sutunlar: 1, sonuc_bos: 1 });
    expect(r.details.satir).toBe(2);
  });
  it("eşit sütun sayısında İLK tablo seçilir", () => {
    const md = [tablo("| 1.10 | a | %80 | |"), "", tablo(bos("b"), bos("c"))].join("\n");
    const r = kontrol(md);
    expect(r.details.satir).toBe(1);
    expect(r.scores.sonuc_bos).toBe(0);
  });
  it("yalnız ayraç satırları tablo değildir (başlıksız ayraç çifti)", () => {
    expect(kontrol("|---|---|\n|---|---|").scores.tablo_var).toBe(0);
  });
  it("yalnız bileşen tablosu varsa: tablo var, sütunlar düşük, sonuç sütunu yok → sonuc_bos 0", () => {
    const r = kontrol("| Bileşen | Ölçüt | Koşul |\n|---|---|---|\n| Hece okuma | 8/10 | resimli |");
    expect(r.scores).toMatchObject({ tablo_var: 1, sutunlar: 0.25, sonuc_bos: 0 });
  });
});

describe("sonuc_bos (prompt: 'SONUÇ hücrelerini BOŞ bırak'; 'SONUÇ/veri ASLA uydurma')", () => {
  it.each([
    [""], [" "], ["—"], ["–"], ["-"], ["--"], ["…"], ["..."], ["…%"], ["% …"], ["%"], ["__"], ["_____"], ["( )"], ["(%)"], ["☐"], ["□"], ["…/10"], ["__/10"], ["___ / 10"],
    ["% / sıklık"], ["% veya sıklık"], ["% ve sıklık"], ["sıklık/kez"], ["(yüzde)"], ["___ kez"], ["`___`"], ["`—`"], ["☐ ☐ ☐"], ["○ ○ ○"], ["◯"], ["⬜⬜"], ["(boş)"], ["boş"], ["(kaydedilecek)"], ["buraya yazılacak"], ["doldurulacak"], ["girilecek"], ["—/10"], ["-/10"], ["–/10"], ["**"], ["*—*"], ["…… dk"], ["…/…"], ["%___"], ["[ ]"],
  ])("boş/yer tutucu sonuç hücresi %j → 1", (hucre) => expect(sonuc(`| | Hece okuma | ${hucre} | |`)).toBe(1));
  it.each([
    ["%80"], ["80"], ["8/10"], ["3 kez"], ["**%80**"], ["Evet"], ["%80 (8/10)"], ["10"], ["2,5"], ["0"], ["%0"], ["8/10 doğru"], ["…%80"], ["(ör. 8/10)"], ["yok"], ["+"], ["Doğru"], ["Yanlış"], ["Hata"],
  ])("dolu sonuç hücresi %j → 0", (hucre) => expect(sonuc(`| | Hece okuma | ${hucre} | |`)).toBe(0));
  it("oran: dolu satırların payı düşer", () => {
    expect(sonuc("| 1.10 | a | %80 | |", bos("b"), bos("c"), bos("d"))).toBe(0.75);
    expect(sonuc("| 1.10 | a | %80 | |", "| 2.10 | b | %90 | |")).toBe(0);
    expect(sonuc(bos("a"), bos("b"))).toBe(1);
  });
  it("sonuç sütunu başlıktan bulunur (sıra bağımsız); 'Sonuç' başlığı olmayan tabloda 0", () => {
    const md = "| Not | Sonuç | Tarih | Ölçüt |\n|---|---|---|---|\n| | | | Hece |\n| | %80 | | Sözcük |";
    expect(kontrol(md).scores.sonuc_bos).toBe(0.5);
    expect(kontrol("| Tarih | Ölçüt | Değer | Not |\n|---|---|---|---|\n| | a | | |").scores.sonuc_bos).toBe(0);
  });
  it("eksik hücreli satır: sonuç hücresine ulaşmayan satır boş sayılır; fazla hücre sorun değil", () => {
    expect(sonuc("| 1.10 | a |")).toBe(1);
    expect(sonuc("| 1.10 | a | | | ekstra |")).toBe(1);
    expect(sonuc("| 1.10 | a | %80 | | ekstra |")).toBe(0);
  });
  it("hücre içi kaçışlı boru ('\\|') sütunları kaydırmaz", () => {
    expect(sonuc("| | a \\| b | | |")).toBe(1);
    expect(sonuc("| | a \\| b | %80 | |")).toBe(0);
  });
  it("tamamen boş satır (şablon satırı) boş sonuçludur; ayrıntıda satır sayısı", () => {
    expect(sonuc("| | | | |", bos("a"))).toBe(1);
    expect(kontrol(tablo("| | | | |", bos("a"))).details.satir).toBe(2);
  });
  it("sonuç hücresindeki ölçüt metni / tarih sonuç sayılmaz: yalnız Sonuç sütununa bakılır", () => {
    expect(sonuc("| 12.10.2026 | 10 soruda %80 | | 3 hata |")).toBe(1);
  });
});

describe("satır sonu ve büyük harf koruması", () => {
  it("CRLF satır sonları sonucu değiştirmez; büyük harfli başlık ve yer tutucu aynı davranır", () => {
    const md = `## 2. Veri toplama çizelgesi\n${tablo(bos("a"), "| 1.10 | b | %80 | |")}`;
    expect(kontrol(md.replace(/\n/g, "\r\n")).scores).toEqual(kontrol(md).scores);
    expect(kontrol("| TARİH | ÖLÇÜT | SONUÇ | NOT |\n|---|---|---|---|\n| | a | … | |").scores).toMatchObject({ sutunlar: 1, sonuc_bos: 1 });
  });
});

describe("çıktı sözleşmesi", () => {
  it("`talimat` döndürülmez; tablo_var, sutunlar, sonuc_bos (tablo yokken de); sert hata yok; ayrıntılar puanları yansıtır", () => {
    const r = kontrol(tablo(bos("a")));
    expect(Object.keys(r.scores).sort()).toEqual(["sonuc_bos", "sutunlar", "tablo_var"]);
    expect(r.details).toMatchObject({ tablo_var: 1, sutunlar: 1, sonuc_bos: 1, satir: 1 });
    expect(r.hard).toEqual([]);
    expect(Object.keys(kontrol("x").scores).sort()).toEqual(["sonuc_bos", "sutunlar", "tablo_var"]);
  });
});
