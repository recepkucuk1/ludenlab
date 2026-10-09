// apps/hub/evals/tools/atolye/ortak.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { bolumAgaci, bolumSatirlari, maddeler, mebSatirlari, olumluGecisler, olumsuzMu } from "./ortak";

const CEZA = /(?<!\p{L})ceza(?!sız)\p{L}*|t[iı]me-?out/u;

describe("bölüm ağacı", () => {
  const t = "## Giriş\n- g\n## Etkinlik Akışı\n- a1\n### Isınma (5 dk)\n- i1\n**Ana (10 dk)**\n- n1\n### Kapanış\n- k1\n## Materyaller\n- m1";
  it("ilk eşleşen bölüm + daha derin bölümler; aynı düzeyde durur", () => {
    const [kok, ...alt] = bolumAgaci(t, /akış/);
    expect(kok!.heading).toBe("etkinlik akışı");
    expect(alt.map((s) => s.heading)).toEqual(["ısınma (5 dk)", "ana (10 dk)", "kapanış"]);
  });
  it("kalın sözde başlığın altı da kapsama girer; üst düzey başlıkta (## Materyaller) durur", () => {
    expect(bolumSatirlari(t, /akış/)).toEqual(["- a1", "ısınma (5 dk)", "- i1", "ana (10 dk)", "- n1", "kapanış", "- k1"]);
  });
  it("bölüm yoksa boş / null; g bayraklı kalıp durum taşımaz", () => {
    expect(bolumAgaci(t, /yok yok/)).toEqual([]);
    expect(bolumSatirlari(t, /yok yok/)).toBeNull();
    const g = /materyal/g;
    expect(bolumSatirlari(t, g)).toEqual(["- m1"]);
    expect(bolumSatirlari(t, g)).toEqual(["- m1"]);
  });
  it("kök kalın sözde başlıksa: kalın kardeşler `durak`a kadar alt bölüm sayılır; durak yoksa kök tek başınadır", () => {
    const b = "**Etkinlik Akışı**\n- a1\n**Isınma (5 dk)**\n- i1\n**Ana (10 dk)**\n- n1\n**Materyaller**\n- m1";
    expect(bolumAgaci(b, /akış/, /materyal/).map((s) => s.heading)).toEqual(["etkinlik akışı", "ısınma (5 dk)", "ana (10 dk)"]);
    expect(bolumSatirlari(b, /akış/, /materyal/)).toEqual(["- a1", "ısınma (5 dk)", "- i1", "ana (10 dk)", "- n1"]);
    expect(bolumAgaci(b, /akış/).map((s) => s.heading)).toEqual(["etkinlik akışı"]);
    // ## kökte durak etkisizdir: düzey kuralı geçerli
    expect(bolumAgaci("## Akış\n### alt\n## Materyal", /akış/, /materyal/).map((s) => s.heading)).toEqual(["akış", "alt"]);
  });
  it("kök başlıktan önceki satırlar atılır; boş metin güvenli", () => {
    expect(bolumSatirlari("giriş cümlesi\n## A\n- x", /a/)).toEqual(["- x"]);
    expect(bolumSatirlari("", /a/)).toBeNull();
  });
});

describe("maddeler", () => {
  it("girintili alt madde üst maddeye katılır; tablo gövdesi hücre hücre; başlık ve ayraç atılır", () => {
    expect(maddeler(["- Isınma (5 dk)", "  - alt madde", "- Ana (10 dk)"])).toEqual(["Isınma (5 dk) alt madde", "Ana (10 dk)"]);
    expect(maddeler(["| Aşama | Süre |", "|---|---|", "| Isınma | 5 dk |"])).toEqual(["Isınma · 5 dk"]);
    expect(maddeler(["1. **Isınma (5 dk):** hece kartı", "düz paragraf"])).toEqual(["Isınma (5 dk): hece kartı"]);
    expect(maddeler([])).toEqual([]);
  });
});

describe("olumsuzMu", () => {
  const evet = [
    "Cezalandırıcı yöntemler kullanılmaz.", "Ceza vermeyin.", "Time-out yerine sakin köşe.", "Ceza yok.", "Hiçbir ceza önerilmez.",
    "Utandırıcı strateji önerilmemelidir.", "Cezadan kaçının.", "Cezalandırmak yasaktır.", "Uygulamayınız.", "Kullanılmayacak yaklaşımlar:",
    "Time-out asla uygulanmaz", "Bu yöntem uygun değil.", "Cezalandırma olmadan öğretin.", "Kullanmadı.", "Önerilmemiş.", "Uzak durulur.",
  ];
  const hayir = [
    "Time-out uygulayın.", "Çocuğu cezalandırın.", "Ceza verilir.", "Mola odasına gönderin.", "Yoksun bırakın.",
    "Mezun olunca okuyun.", "Hece kartlarını kullanın.", "Tekrar edin.",
    "Yerine koyma davranışı (aynı işlevi gören)", "Yerine koyma davranışını öğretin.",
  ];
  it.each(evet)("olumsuz: %s", (s) => expect(olumsuzMu(s)).toBe(true));
  it.each(hayir)("olumlu: %s", (s) => expect(olumsuzMu(s)).toBe(false));
  it("büyük harf (tr-TR) ve noktalama: 'KULLANILMAZ', 'Kaçının!'", () => {
    expect(olumsuzMu("TIME-OUT KULLANILMAZ")).toBe(true);
    expect(olumsuzMu("Kaçının!")).toBe(true);
  });
});

describe("olumluGecisler", () => {
  const bul = (t: string) => olumluGecisler(t, CEZA);
  it("olumlu öneri bulunur (tr-TR büyük harf ve tire biçimleri dahil)", () => {
    expect(bul("Time-out uygulayın.")).toEqual(["time-out"]);
    expect(bul("TIME-OUT uygulayın.")).toEqual(["tıme-out"]);
    expect(bul("Davranışı cezalandırın.")).toEqual(["cezalandırın"]);
    expect(bul("Önce uyarı, sonra time-out ve ceza.")).toEqual(["time-out", "ceza"]);
  });
  it("olumsuzlama korumalı: aynı cümlede kaçınma izi varsa geçiş sayılmaz", () => {
    expect(bul("Cezalandırıcı yöntemler kullanılmaz.")).toEqual([]);
    expect(bul("Time-out yerine sakin köşe kullanın.")).toEqual([]);
    expect(bul("Ceza vermeyin.")).toEqual([]);
  });
  it("'cezasız' ceza sayılmaz; ama aynı satırdaki başka bir cümle olumluysa o sayılır", () => {
    expect(bul("Cezasız, olumlu pekiştirme.")).toEqual([]);
    expect(bul("Ceza yok. Time-out uygulayın.")).toEqual(["time-out"]);
  });
  it("etiket satırı: kaçınılacak listesi altındaki maddeler sayılmaz; yeni başlık bağlamı sıfırlar", () => {
    const t = "**Kaçınılacak stratejiler:**\n- Time-out\n- Ceza\n\n## Pekiştirme\n- Time-out uygulayın";
    expect(bul(t)).toEqual(["time-out"]);
    expect(bul("## Kullanılmayacak yöntemler\n| Yöntem | Neden |\n|---|---|\n| Ceza | ters etki |")).toEqual([]);
  });
  it("paragraf cümlesinin olumsuzlaması sonraki paragrafa sızmaz (yalnız madde satırları etiketi devralır)", () => {
    expect(bul("Ceza kullanmayın.\nTime-out uygulayın.")).toEqual(["time-out"]);
  });
  it("boş metin güvenli; g bayraksız kalıp tekrar çağrıda durum taşımaz", () => {
    expect(bul("")).toEqual([]);
    expect(bul("ceza")).toEqual(["ceza"]);
    expect(bul("ceza")).toEqual(["ceza"]);
  });
});

describe("mebSatirlari", () => {
  it("kod verilmediyse boş; verildiyse kod satırı + modele giden hedef bloğu", () => {
    expect(mebSatirlari(undefined)).toEqual([]);
    const s = mebSatirlari("3.2.5");
    expect(s[0]).toBe("- MEB hedef kodu: 3.2.5");
    expect(s.join("\n")).toContain("- MEB hedef alanı:");
    expect(s.join("\n")).toContain("(3.2.5)");
    expect(s.join("\n")).toContain("• 3.2.5.1");
  });
  it("hedef davranış kodları verilirse yalnız onlar; bilinmeyen kodda yalnız kod satırı", () => {
    const hepsi = mebSatirlari("3.2.5").filter((l) => l.includes("•")).length;
    const bir = mebSatirlari("3.2.5", ["3.2.5.1"]).filter((l) => l.includes("•")).length;
    expect(hepsi).toBeGreaterThan(bir);
    expect(bir).toBe(1);
    expect(mebSatirlari("9.9.9")).toEqual(["- MEB hedef kodu: 9.9.9"]);
  });
});
