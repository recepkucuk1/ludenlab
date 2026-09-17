import { describe, expect, it } from "vitest";
import { studentFormPayload, type StudentFormState } from "./studentForm";

/**
 * Öğrenci düzenleme penceresinin gönderdiği gövde.
 *
 * Boşaltılan alanlar `|| undefined` ile isteğe hiç konmuyordu; sunucu yalnız gelen alanları
 * güncellediği için "Güncelle" başarı mesajı veriyor ama eski metin kalıyordu — araçlar da
 * eski metni doldurmaya devam ediyordu (2026-09-17 denetimi). Boşaltılan alan artık null
 * gider; şema null kabul eder (student.test.ts).
 */
const DOLU: StudentFormState = {
  code: "  Ali Veli  ",
  kademe: "ilkokul_1_4",
  yas: "9",
  taniProfili: ["disleksi"],
  guclukDuzeyi: "orta",
  gucluYonler: "  müzik  ",
  ilgiAlanlari: "arabalar",
  notes: "gözlem",
  mebBolumler: ["3.1"],
};

describe("öğrenci formu gövdesi", () => {
  it("boşaltılan alanları null gönderir (sunucu ancak böyle silebilir)", () => {
    const p = studentFormPayload({ ...DOLU, yas: "", gucluYonler: "", ilgiAlanlari: "   ", notes: "" });
    expect(p).toMatchObject({ yas: null, gucluYonler: null, ilgiAlanlari: null, notes: null });
  });

  it("dolu alanları kırpılmış olarak gönderir", () => {
    const p = studentFormPayload(DOLU);
    expect(p).toMatchObject({
      code: "Ali Veli",
      kademe: "ilkokul_1_4",
      yas: 9,
      gucluYonler: "müzik",
      ilgiAlanlari: "arabalar",
      notes: "gözlem",
    });
  });

  it("MEB modüllerini her zaman gönderir (eksik alan modülleri silerdi)", () => {
    expect(studentFormPayload({ ...DOLU, mebBolumler: [] }).mebBolumler).toEqual([]);
    expect(studentFormPayload(DOLU).mebBolumler).toEqual(["3.1"]);
  });
});
