import { describe, expect, it, vi } from "vitest";
vi.mock("@studio/lib/db", () => ({ prisma: {} }));
const { parcala } = await import("./profileSections");

describe("parcala", () => {
  it("asistan satırlarını ayırır, aradaki Markdown'ı bütün tutar", () => {
    const out = parcala("- İki kelime\n- Kelime başı /r/ _(asistan)_\n\nAçıklama.\n- Oyun _(asistan)_");
    expect(out).toEqual([
      { tur: "md", metin: "- İki kelime" },
      { tur: "asistan", satir: "- Kelime başı /r/ _(asistan)_", metin: "Kelime başı /r/", bolum: null },
      { tur: "md", metin: "Açıklama." },
      { tur: "asistan", satir: "- Oyun _(asistan)_", metin: "Oyun", bolum: null },
    ]);
  });

  it("asistan maddesi en yakın ### başlığı taşır", () => {
    const out = parcala("### Öncelikli Çalışma Alanları\n- a _(asistan)_\n\n### Dikkat Edilmesi Gereken Noktalar\n- b _(asistan)_");
    expect(out.filter((p) => p.tur === "asistan").map((p) => (p as { bolum: string | null }).bolum)).toEqual(["Öncelikli Çalışma Alanları", "Dikkat Edilmesi Gereken Noktalar"]);
  });

  it("etiket yoksa tek Markdown parçası", () => {
    expect(parcala("- a\n- b")).toEqual([{ tur: "md", metin: "- a\n- b" }]);
  });
});
