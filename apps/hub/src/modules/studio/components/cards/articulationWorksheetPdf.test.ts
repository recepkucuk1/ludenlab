import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Artikülasyon çalışma kâğıdı PDF'i — kartlar sayfa sınırında bölünmemeli.
 *
 * react-pdf'te View varsayılan olarak bölünebilir. Kartlar tek bir flex-wrap ızgarasında
 * dizildiği için sayfa sonuna denk gelen kartın görseli bir sayfada, kelimesi ve cümlesi
 * sonraki sayfada kalıyordu (2026-09-16'da sunucuda üretilen 30 kartlık cümle ve bağlam
 * kâğıtlarında görüldü). Çözüm, sosyal hikâye PDF'indeki kalıpla aynı: kartlar satırlara
 * bölünür ve satır `wrap={false}` ile bütün olarak sonraki sayfaya geçer. Tek tek kartlara
 * `wrap={false}` vermek aynı satırın kartlarını farklı sayfalara dağıtabilirdi.
 *
 * react-pdf yerleşimi birim testte ölçülemediği için sözleşme dosya düzeyinde kilitlenir;
 * davranış sunucuda üretilen PDF sayfalarıyla doğrulandı.
 */
const src = readFileSync(path.resolve(import.meta.dirname, "articulationWorksheetPdf.tsx"), "utf8");

describe("artikülasyon çalışma kâğıdı PDF'i", () => {
  it("kartları sayfa sınırında bölünmeyen satırlar içinde dizer", () => {
    expect(src).toMatch(/<View\b[^>]*style=\{styles\.row\}[^>]*wrap=\{false\}/);
  });
});
