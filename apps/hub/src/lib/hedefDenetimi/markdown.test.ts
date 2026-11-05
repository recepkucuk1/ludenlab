import { describe, expect, it } from "vitest";
import { DENETIM_NOTU, denetimToMarkdown } from "./markdown";
import { denetimSonucuSchema } from "./schema";

const s = denetimSonucuSchema.parse({
  bilesenler: {
    davranis: { durum: "var", alinti: "doğru | okur", not: "x" },
    olcut: { durum: "eksik" },
    kosul: { durum: "belirsiz", not: "a\nb" },
    zaman: { durum: "eksik" },
    taban: { durum: "eksik" },
  },
  mebUyum: { durum: "kismen", not: "aynı bölüm" },
  sorular: [{ bilesen: "olcut", soru: "Kaç denemede?", ornek: "10 denemenin 8'inde" }],
  ozet: "Ölçüt yok.",
});

describe("denetimToMarkdown", () => {
  it("başlık, 5 satırlı tablo (| kaçışı, satır sonu → boşluk), MEB, sorular, özet, taslak notu", () => {
    const md = denetimToMarkdown("Çocuk doğru | okur.", s);
    expect(md.startsWith("## Hedef\n> Çocuk doğru | okur.\n\n## Bileşenler\n| Bileşen | Durum | Alıntı | Not |\n| --- | --- | --- | --- |\n")).toBe(true);
    expect(md).toContain('| Gözlenebilir davranış | ✓ var | "doğru \\| okur" | x |');
    expect(md).toContain("| Ölçüt | ○ eksik |  |  |");
    expect(md).toContain("| Koşul | ~ belirsiz |  | a b |");
    expect(md).toContain("## MEB uyumu\n**Kısmen uyumlu** — aynı bölüm");
    expect(md).toContain("## Uzmana sorular\n- **Ölçüt:** Kaç denemede? _örn. 10 denemenin 8'inde_");
    expect(md.trimEnd().endsWith(`## Özet\nÖlçüt yok.\n\n⚠️ ${DENETIM_NOTU}`)).toBe(true);
  });
  it("hücrede ters bölü önce kaçışlanır (a\\|b → a\\\\\\|b)", () => {
    const md = denetimToMarkdown("a\\|b okur", { ...s, bilesenler: { ...s.bilesenler, davranis: { durum: "var", alinti: "a\\|b", not: "" } } });
    expect(md).toContain('"a\\\\\\|b"');
  });
  it("çok satırlı hedef her satırda '> '; ornek içindeki _ ve * kaçışlanır", () => {
    const md = denetimToMarkdown("a\n---\n# b", { ...s, sorular: [{ bilesen: "olcut", soru: "Q?", ornek: "x_y*z" }] });
    expect(md).toContain("## Hedef\n> a\n> ---\n> # b\n\n## Bileşenler");
    expect(md).toContain("_örn. x\\_y\\*z_");
  });
  it("MEB ve soru yoksa o bölümler yok", () => {
    const md = denetimToMarkdown("okur", { ...s, mebUyum: null, sorular: [] });
    expect(md).not.toContain("## MEB uyumu");
    expect(md).not.toContain("## Uzmana sorular");
  });
});
