import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Studio panosu — "Günlük Seri" kaldırıldı, yerine "Çalışılan Hedef" geldi.
 *
 * Faz 0 spec §7: uzmana dönük dışsal motivasyon öğesi kaldırıldı; bekçi.
 * Rota ve pano DB/oturum ister, birim testte çalıştırılamaz; burada kilitlenen şey kaynaktır
 * (seri geri gelmesin, "mastered" tamamlanmış sayılsın, kart yazıları sayıyı doğru anlatsın).
 */
const route = readFileSync(path.resolve(import.meta.dirname, "route.ts"), "utf8");
const dashboard = readFileSync(
  path.resolve(import.meta.dirname, "../../../(main)/dashboard/page.tsx"),
  "utf8",
);

describe("haftalık istatistik rotası", () => {
  it("bekçi boşa düşmesin: rota okunuyor", () => {
    expect(route).toContain("GET /studio/api/stats/weekly");
  });

  it("günlük seri hesabı yok", () => {
    expect(route).not.toMatch(/streak/i);
    expect(route).not.toContain("calculateStreak");
  });

  it("çalışılan hedef sayısını döndürür", () => {
    expect(route).toContain("goalsWorked");
  });

  it("tamamlanan hedef sayımı ortak durum listesini kullanır (mastered dahil)", () => {
    expect(route).toContain("TAMAMLANAN_DURUMLAR");
  });
});

describe("Studio panosu — istatistik kartları", () => {
  it("bekçi boşa düşmesin: pano okunuyor", () => {
    expect(dashboard).toContain("Toplam Öğrenci");
  });

  it("'Günlük Seri' kartı ve alev ikonu yok", () => {
    expect(dashboard).not.toContain("Günlük Seri");
    expect(dashboard).not.toMatch(/\bFlame\b/);
  });

  it("'Çalışılan Hedef' kartı kayıt güncellemesini doğru anlatır", () => {
    expect(dashboard).toContain("Çalışılan Hedef");
    expect(dashboard).toContain("Bu hafta kaydı güncellenen hedef");
  });
});
