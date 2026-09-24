import { describe, expect, it } from "vitest";
import { csvCell } from "./csvSafe";

describe("csvCell", () => {
  it("formül başlangıçlarını metne sabitler", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("-2")).toBe("'-2");
  });

  it("baştaki boşluk ve tam genişlikli işaretleri de yakalar (#28)", () => {
    expect(csvCell("  =HYPERLINK(1)")).toBe("'  =HYPERLINK(1)");
    expect(csvCell("＝HYPERLINK(1)")).toBe("'＝HYPERLINK(1)");
  });

  it("ayraç ve tırnak içeren alanı RFC-4180'e göre kaçar", () => {
    expect(csvCell('Ad; "Soyad"')).toBe('"Ad; ""Soyad"""');
    expect(csvCell("Normal Ad")).toBe("Normal Ad");
    expect(csvCell(null)).toBe("");
  });
});
