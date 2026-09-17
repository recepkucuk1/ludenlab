import { describe, expect, it } from "vitest";
import { studentPatchSchema, studentSchema } from "./student";

/**
 * Öğrenci kaydı şeması — kısmi güncelleme SESSİZCE veri silmemeli.
 *
 * `studentPatchSchema = studentSchema.partial()` idi ve `mebBolumler` alanı
 * `.optional().default([])` taşıyordu. zod 4 kısmi şemada da iç varsayılanı uyguluyor:
 * yalnız ad ya da yalnız not gönderen istek sunucuya `mebBolumler: []` olarak ulaşıyor,
 * `updateCase` de bunu yazıp öğrencinin çalışılan MEB modüllerini siliyordu. Kullanıcıya
 * "Öğrenci güncellendi" deniyordu (2026-09-17 denetimi).
 *
 * Boşaltılan alanlar da ayrı bir sorundu: istemci boş alanı isteğe hiç koymadığı için
 * sunucu güncellemiyordu. Artık null gönderilebiliyor.
 */
describe("öğrenci şeması", () => {
  it("yeni kayıtta MEB modülleri boş listeyle başlar", () => {
    const r = studentSchema.parse({ code: "Ali Veli", kademe: "ilkokul_1_4" });
    expect(r.mebBolumler).toEqual([]);
  });

  it("kısmi güncellemede gönderilmeyen MEB modülleri alanı hiç oluşmaz", () => {
    expect(studentPatchSchema.parse({ notes: "gözlem" })).not.toHaveProperty("mebBolumler");
    expect(studentPatchSchema.parse({ code: "Ali Veli" })).not.toHaveProperty("mebBolumler");
  });

  it("kısmi güncelleme MEB modüllerini açıkça değiştirebilir", () => {
    expect(studentPatchSchema.parse({ mebBolumler: ["3.1", "5.2"] }).mebBolumler).toEqual(["3.1", "5.2"]);
  });

  it("boşaltılan alanlar null olarak gönderilebilir", () => {
    const r = studentPatchSchema.parse({ gucluYonler: null, ilgiAlanlari: null, notes: null, yas: null });
    expect(r).toMatchObject({ gucluYonler: null, ilgiAlanlari: null, notes: null, yas: null });
  });

  it("dolu alanlar kırpılarak ve sınır içinde kabul edilir", () => {
    const r = studentPatchSchema.parse({ gucluYonler: "  müzik  ", yas: "9" });
    expect(r.gucluYonler).toBe("müzik");
    expect(r.yas).toBe(9);
    expect(studentPatchSchema.safeParse({ gucluYonler: "a".repeat(501) }).success).toBe(false);
  });
});
