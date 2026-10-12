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


/* ── Ek kapsam: CRA sırası, çıktı sözleşmesi (aritmetik doğrulayıcının tabloları aritmetik.selftest.eval.ts'te) ── */

const govde = { alanProfili: "islem_akiciligi" as const, kazanimKonu: "k", somutlukDuzeyi: "somut" as const };
const kontrol = (text: string, body: Parameters<typeof matematikChecks>[0]["body"] = govde) => matematikChecks({ body, text });

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
    ["parantezli numara madde içinde ((1) Somut:)", tam("- ", ["(1) Somut:", "(2) Yarı-somut:", "(3) Soyut:"])],
    ["'Etkinlik N: Etiket' öneki", tam("- ", ["Etkinlik 1: Somut", "Etkinlik 2: Yarı-somut", "Etkinlik 3: Soyut"])],
    ["numara önce, sonra aşama sözcüğü (1. Aşama: Somut)", tam("", ["1. Aşama: Somut", "2. Aşama: Yarı-somut", "3. Aşama: Soyut"])],
    ["numara önce, sonra adım ve parantezli etiket (2) Adım (Yarı-somut))", tam("", ["1) Adım (Somut)", "2) Adım (Yarı-somut)", "3) Adım (Soyut)"])],
    ["madde + numara + etiket (- 1. Somut)", tam("- ", ["1. Somut:", "2. Yarı-somut:", "3. Soyut:"])],
    ["'Aşama N' etiketi ve kalın", tam("- **", ["Aşama 1 – Somut:** a", "Aşama 2 – Yarı-somut:** b", "Aşama 3 – Soyut:** c"])],
    ["kısa ad + parantezli etiket (Görsel temsil (yarı-somut):)", tam("- ", ["Onluk blokları (somut):", "Görsel temsil (yarı-somut):", "Sayılarla (soyut):"])],
    ["'Etkinlik N (Etiket):'", tam("- **", ["Etkinlik 1 (Somut):** a", "Etkinlik 2 (Yarı-somut):** b", "Etkinlik 3 (Soyut):** c"])],
    ["emoji ile başlayan etiketler", tam("- ", ["🟢 Somut:", "🟡 Yarı-somut:", "🔴 Soyut:"])],
    ["tablo: her hücre ayrı taranır (| Aşama 1 | Somut | …)", "## CRA dizisi\n| Sıra | Aşama | Etkinlik |\n|---|---|---|\n| 1 | Somut | bloklar |\n| 2 | Yarı-somut | çizim |\n| 3 | Soyut | sayılar |"],
    ["tablo: sütun başlıkları aşamalar", "## CRA dizisi\n| Somut | Yarı-somut | Soyut |\n|---|---|---|\n| bloklar | çizim | sayılar |"],
    ["tablo: 'Aşama 1: Somut' hücresi", "## CRA dizisi\n| Aşama | Açıklama |\n|---|---|\n| Aşama 1: Somut | bloklar |\n| Aşama 2: Yarı-somut | çizim |\n| Aşama 3: Soyut | sayılar |"],
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
    ["tablo: etiketler hücre başında değil, cümle içinde", "## CRA dizisi\n| Aşama | Etkinlik |\n|---|---|\n| 1 | önce somut materyal |\n| 2 | sonra yarı-somut çizim |\n| 3 | en son soyut işlem |"],
    ["parantezli etiket ama ayraçsız cümle ortasında", "## CRA dizisi\n- Önce blokları kullanır (somut) ve sonra devam eder\n- Çizim yapar (yarı-somut) sonra\n- Sayılarla çalışır (soyut) ve biter"],
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
