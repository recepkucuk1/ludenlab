import { describe, it, expect } from "vitest";
import { normalizeWord } from "./normalize";

describe("normalizeWord", () => {
  it("küçük harfe çevirir ve trim'ler", () => {
    expect(normalizeWord("  Sandal  ")).toBe("sandal");
  });

  it("Türkçe İ/I'yı doğru indirger", () => {
    expect(normalizeWord("İĞNE")).toBe("iğne");
    expect(normalizeWord("ISPANAK")).toBe("ıspanak");
  });

  it("baş/son noktalama ve fazla boşluğu temizler", () => {
    expect(normalizeWord("şapka.")).toBe("şapka");
    expect(normalizeWord('"top"!')).toBe("top");
    expect(normalizeWord("el   feneri")).toBe("el feneri");
  });
});
