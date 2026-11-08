import { describe, expect, it } from "vitest";
import { gorunmezSok, gorunmezSokDeep } from "./gorunmez";

describe("gorunmezSok", () => {
  it("yumuşak tire, ZWSP, bidi ve BOM'u söker; görünür metni korur", () => {
    expect(gorunmezSok("Ar\u00ADda")).toBe("Arda");
    expect(gorunmezSok("E\u200Bla\u200D")).toBe("Ela");
    expect(gorunmezSok("\uFEFF\u202Eselam\u202C")).toBe("selam");
    expect(gorunmezSok("Türkçe İçerik ğüşöç")).toBe("Türkçe İçerik ğüşöç");
  });
  it("satır sonu ve sekmeye dokunmaz", () => {
    expect(gorunmezSok("a\nb\tc")).toBe("a\nb\tc");
  });
});

describe("gorunmezSokDeep", () => {
  it("iç içe nesne/dizideki tüm dizgileri temizler, diğer türleri aynen bırakır", () => {
    const girdi = {
      rumuz: "Ar\u00ADda Yıl\u200Bmaz",
      kademe: "ilkokul",
      sayi: 3,
      bos: null,
      bayrak: true,
      notlar: ["Ar\u00ADda okumayı sever", "düz"],
      ic: { guclu: "E\u200Bla ile oynar" },
    };
    expect(gorunmezSokDeep(girdi)).toEqual({
      rumuz: "Arda Yılmaz",
      kademe: "ilkokul",
      sayi: 3,
      bos: null,
      bayrak: true,
      notlar: ["Arda okumayı sever", "düz"],
      ic: { guclu: "Ela ile oynar" },
    });
  });
  it("girdiyi değiştirmez (yeni nesne döner)", () => {
    const girdi = { rumuz: "Ar\u00ADda" };
    gorunmezSokDeep(girdi);
    expect(girdi.rumuz).toBe("Ar\u00ADda");
  });
});
