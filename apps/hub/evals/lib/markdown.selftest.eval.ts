// apps/hub/evals/lib/markdown.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { OLCUT, TANI, bulletsUnder, genericMarkdown, notNormalize, sections } from "./markdown";

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
    expect(TANI.test("öğrenci disleksiktir")).toBe(true);
    expect(TANI.test("DEHB’dir")).toBe(true);
    expect(TANI.test("disleksi tanılı öğrenci")).toBe(false);
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
});
