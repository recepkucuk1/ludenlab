import { describe, expect, it } from "vitest";
import { VELI_SATIR_TAVANI, parentContextLines } from "./contextLine";

const gun = (d: number) => new Date(2026, 9, d);
describe("parentContextLines", () => {
  it("tarih ARTAN; 'Veli: ' öneki kırpılır; en çok 2 satır (en yeniler)", () => {
    const satirlar = parentContextLines([
      { text: "Veli: 5 gün çalışıldı. Not: c", createdAt: gun(21) },
      { text: "Veli: 2 gün çalışıldı.", createdAt: gun(7) },
      { text: "Veli: 4 gün çalışıldı. Zor: zorlandı.", createdAt: gun(14) },
    ]);
    expect(satirlar).toEqual(["- 14.10: 4 gün çalışıldı. Zor: zorlandı.", "- 21.10: 5 gün çalışıldı. Not: c"]);
    expect(VELI_SATIR_TAVANI).toBe(2);
  });
  it("boş → []; önek yoksa metin olduğu gibi", () => {
    expect(parentContextLines([])).toEqual([]);
    expect(parentContextLines([{ text: "serbest", createdAt: gun(1) }])).toEqual(["- 01.10: serbest"]);
  });
});
