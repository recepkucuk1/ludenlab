import { describe, expect, it, vi } from "vitest";
vi.mock("@studio/lib/db", () => ({ prisma: {} }));
const { parcala } = await import("./profileSections");

describe("parcala", () => {
  it("asistan satırlarını ayırır, aradaki Markdown'ı bütün tutar", () => {
    const out = parcala("- İki kelime\n- Kelime başı /r/ _(asistan)_\n\nAçıklama.\n- Oyun _(asistan)_");
    expect(out).toEqual([
      { tur: "md", metin: "- İki kelime" },
      { tur: "asistan", satir: "- Kelime başı /r/ _(asistan)_", metin: "Kelime başı /r/" },
      { tur: "md", metin: "Açıklama." },
      { tur: "asistan", satir: "- Oyun _(asistan)_", metin: "Oyun" },
    ]);
  });

  it("etiket yoksa tek Markdown parçası", () => {
    expect(parcala("- a\n- b")).toEqual([{ tur: "md", metin: "- a\n- b" }]);
  });
});
