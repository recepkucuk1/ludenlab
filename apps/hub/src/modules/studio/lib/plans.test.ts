import { describe, expect, it } from "vitest";
import { isStudentLimitReached, PLAN_CONFIG } from "./plans";

/**
 * Regresyon kilidi — "sınırsız" planda öğrenci EKLENEMİYORDU (2026-09 denetimi, P0).
 *
 * PLAN_CONFIG'de `studentLimit: -1` "sınırsız" demek (admin arayüzü de böyle gösteriyor).
 * Rota ham `count >= limit` karşılaştırması yapıyordu: `0 >= -1` her zaman doğru →
 * ADVANCED/ENTERPRISE hesapları İLK öğrenciyi bile ekleyemiyor, üstelik kullanıcıya
 * "Planınızda en fazla -1 öğrenci ekleyebilirsiniz" yazıyordu. Sözleşme artık burada.
 */
describe("isStudentLimitReached", () => {
  it("sayılı planda sınıra ulaşınca dolu sayar", () => {
    expect(isStudentLimitReached(2, 0)).toBe(false);
    expect(isStudentLimitReached(2, 1)).toBe(false);
    expect(isStudentLimitReached(2, 2)).toBe(true);
    expect(isStudentLimitReached(2, 3)).toBe(true);
  });

  it("-1 sınırsız demektir: hiçbir sayıda dolmaz", () => {
    expect(isStudentLimitReached(-1, 0)).toBe(false);
    expect(isStudentLimitReached(-1, 5000)).toBe(false);
  });

  it("ADVANCED ve ENTERPRISE sınırsız kabul edilir", () => {
    expect(isStudentLimitReached(PLAN_CONFIG.ADVANCED.studentLimit, 1)).toBe(false);
    expect(isStudentLimitReached(PLAN_CONFIG.ENTERPRISE.studentLimit, 1)).toBe(false);
  });

  it("FREE planı iki öğrenciyle sınırlı kalır", () => {
    expect(isStudentLimitReached(PLAN_CONFIG.FREE.studentLimit, 2)).toBe(true);
  });
});
