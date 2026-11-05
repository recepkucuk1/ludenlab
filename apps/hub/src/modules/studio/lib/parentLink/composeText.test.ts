import { describe, expect, it } from "vitest";
import { composeObservationText } from "./composeText";

describe("composeObservationText", () => {
  it("tüm alanlar: gün, kolay, zor, not", () => {
    expect(composeObservationText({ days: 4, easy: ["istekle_oturdu", "oyunu_sevdi"], hard: ["zaman_bulamadik"], note: "Akşamları daha iyi." }))
      .toBe("Veli: 4 gün çalışıldı. Kolay: istekle oturdu, oyunu sevdi. Zor: zaman bulamadık. Not: Akşamları daha iyi.");
  });
  it("0 gün → 'bu hafta çalışılamadı'; boş gruplar atlanır; 1 gün tekil", () => {
    expect(composeObservationText({ days: 0, easy: [], hard: [], note: undefined })).toBe("Veli: bu hafta çalışılamadı.");
    expect(composeObservationText({ days: 1, easy: [], hard: ["zorlandi"], note: "" })).toBe("Veli: 1 gün çalışıldı. Zor: zorlandı.");
  });
  it("not tek satıra iner, HTML temizlenir, 1000 karakteri aşmaz", () => {
    const t = composeObservationText({ days: 7, easy: [], hard: [], note: "a<b>b</b>\n\nc  d" });
    expect(t).toBe("Veli: 7 gün çalışıldı. Not: ab c d");
    expect(composeObservationText({ days: 7, easy: [], hard: [], note: "x".repeat(300) }).length).toBeLessThanOrEqual(1000);
  });
  it("NUL, kontrol, sıfır genişlik ve bidi karakterleri atılır", () => {
    const t = composeObservationText({ days: 3, easy: [], hard: [], note: "a\u0000b\u202Ec\u200Bd\u007F\uFEFFe" });
    expect(t).toBe("Veli: 3 gün çalışıldı. Not: abcde");
    // eslint-disable-next-line no-control-regex
    expect(t).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/);
  });
});
