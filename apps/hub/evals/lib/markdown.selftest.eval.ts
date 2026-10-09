// apps/hub/evals/lib/markdown.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { OLCUT, TANI, bulletsUnder, genericMarkdown, notNormalize, sections } from "./markdown";
import { lower } from "./sharedChecks";

const md = `## Okuma
### Kısa dönem hedefler
- Verilen 10 heceyi 8/10 doğrulukla okur.
1. **İkinci hedef** yüzde 80
| Hedef | Ölçüt |
|---|---|
| Üçüncü | 10 denemenin 8'inde |
### Yöntem
- Sabırlı olun.
⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır.`;

describe("markdown yardımcıları", () => {
  it("sections başlıkları seviyeleriyle verir", () => {
    const s = sections(md);
    expect(s.map((x) => x.heading)).toEqual(["okuma", "kısa dönem hedefler", "yöntem"]);
    expect(s[1]!.level).toBe(3);
  });
  it("bulletsUnder madde, numaralı ve tablo satırlarını toplar", () => {
    const items = bulletsUnder(md, /kısa dönem/);
    expect(items).toHaveLength(3);
    expect(items.every((i) => OLCUT.test(i.toLocaleLowerCase("tr-TR")))).toBe(true);
  });
  it("TANI tanı cümlesini yakalar, 'tanılı' ifadesini yakalamaz", () => {
    expect(TANI.test(lower("öğrenci disleksiktir"))).toBe(true);
    expect(TANI.test(lower("DEHB’dir"))).toBe(true);
    expect(TANI.test(lower("disleksi tanılı öğrenci"))).toBe(false);
  });
  it("notNormalize biçimden bağımsız karşılaştırır", () => {
    expect(notNormalize("**⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR**")).toBe(notNormalize("⚠️ Bu metin yapay zeka ile üretilmiş bir TASLAKTIR"));
  });
  it("genericMarkdown başlık ve notu korur, içeriği jenerikleştirir", () => {
    const g = genericMarkdown(md);
    expect(g).toContain("### Kısa dönem hedefler");
    expect(g).toContain("TASLAKTIR");
    expect(g).not.toContain("8/10");
  });
  it("kalın sözde başlık 'bold' düzeyinde başlık olur", () => {
    const s = sections(`**Kısa dönem hedefler:**
- Sabırlı olun.
3. **Yöntem**
- Model olun.`);
    expect(s.map((x) => [x.heading, x.level])).toEqual([
      ["kısa dönem hedefler", "bold"],
      ["yöntem", "bold"],
    ]);
  });
  it("tamamı kalın ama noktayla biten hedef cümlesi başlık değil maddedir", () => {
    const t = `### Kısa dönem hedefler
1. **Verilen 10 heceyi %80 doğrulukla okur.**`;
    expect(sections(t).map((x) => x.heading)).toEqual(["kısa dönem hedefler"]);
    expect(bulletsUnder(t, /kısa dönem/)).toEqual(["Verilen 10 heceyi %80 doğrulukla okur."]);
  });
  it("bulletsUnder: durak listesi yoksa daha derin başlıklar kapsanır, verilince kardeş başlıkta durulur", () => {
    const t = `## Etkinlik akışı
- Isınma
### Ana etkinlik: strateji öğretimi
- Model olma
### Kapanış ve değerlendirme
- Özet
## Veli notu
- Evde tekrar`;
    expect(bulletsUnder(t, /etkinlik akışı|akış/)).toEqual(["Isınma", "Model olma", "Özet"]);
    const kardes = [/yöntem|teknik|strateji/, /ölçme|değerlendirme/];
    expect(bulletsUnder(t, /etkinlik akışı|akış/, kardes)).toEqual(["Isınma"]);
    // g/y bayraklı kalıp lastIndex durumu taşımaz: art arda çağrılar aynı sonucu verir.
    const g = /etkinlik akışı/g;
    expect(bulletsUnder(t, g, kardes)).toEqual(["Isınma"]);
    expect(bulletsUnder(t, g, kardes)).toEqual(["Isınma"]);
  });
  it("genericMarkdown tablonun başlık ve ayraç satırını korur, gövde hücrelerini değiştirir", () => {
    const g = genericMarkdown(md).split("\n");
    expect(g).toContain("| Hedef | Ölçüt |");
    expect(g).toContain("|---|---|");
    expect(g).not.toContain("| Üçüncü | 10 denemenin 8'inde |");
    const govde = g.filter((l) => l.startsWith("| ") && l !== "| Hedef | Ölçüt |");
    expect(govde).toHaveLength(1);
    expect(govde[0]!.match(/\|/g)).toHaveLength(3); // hücre sayısı korunur
    expect(/\d/.test(govde[0]!)).toBe(false);
  });
});
