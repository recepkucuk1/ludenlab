// apps/hub/src/modules/studio/lib/probe/contextLine.test.ts
import { describe, expect, it } from "vitest";
import { OLCUM_KOSU_TAVANI, OLCUM_SERI_TAVANI, gunAy, probeContextLines } from "./contextLine";

const gun = (d: number) => new Date(2026, 9, d); // Ekim 2026

describe("probeContextLines", () => {
  it("seri başına tek satır: ses, kısa pozisyon, düzey, yüzdeler → ve tarihler (tarih ARTAN)", () => {
    const satirlar = probeContextLines(
      [{ sound: "/r/", position: "initial", level: "word", runs: [{ date: gun(14), pct: 60 }, { date: gun(21), pct: 70 }, { date: gun(28), pct: 80 }] }],
    );
    expect(satirlar).toEqual(["- /r/ başta kelime: %60 → %70 → %80 (14.10, 21.10, 28.10)"]);
  });
  it("koşusuz seri atlanır; en çok 3 seri; seri başına son 3 koşu", () => {
    const seri = (s: string, n: number) => ({ sound: s, position: "final" as const, level: "word", runs: Array.from({ length: n }, (_, i) => ({ date: gun(i + 1), pct: 10 * (i + 1) })) });
    const satirlar = probeContextLines([seri("/s/", 0), seri("/k/", 5), seri("/l/", 1), seri("/m/", 2), seri("/n/", 2)]);
    expect(satirlar).toHaveLength(OLCUM_SERI_TAVANI);
    expect(satirlar[0]).toBe("- /k/ sonda kelime: %30 → %40 → %50 (03.10, 04.10, 05.10)");
    expect(OLCUM_KOSU_TAVANI).toBe(3);
  });
  it("aynı ses|pozisyon|düzey için yalnız en yeni (ilk gelen) set yazılır", () => {
    const r = (pct: number) => [{ date: gun(5), pct }];
    const satirlar = probeContextLines([
      { sound: "/r/", position: "initial", level: "word", runs: r(70) },
      { sound: "/r/", position: "initial", level: "word", runs: r(20) },
    ]);
    expect(satirlar).toEqual(["- /r/ başta kelime: %70 (05.10)"]);
  });
  it("koşusuz en yeni seri yer tüketmez: 3 koşulu + 1 koşusuz → 3 satır", () => {
    const k = (s: string) => ({ sound: s, position: "initial" as const, level: "word", runs: [{ date: gun(1), pct: 10 }] });
    const satirlar = probeContextLines([{ sound: "/x/", position: "initial", level: "word", runs: [] }, k("/a/"), k("/b/"), k("/c/")]);
    expect(satirlar).toHaveLength(3);
  });
  it("girdi sırası ne olursa olsun koşular tarihe göre sıralanır", () => {
    const [s] = probeContextLines([{ sound: "/z/", position: "medial", level: "word", runs: [{ date: gun(9), pct: 90 }, { date: gun(2), pct: 20 }] }]);
    expect(s).toBe("- /z/ ortada kelime: %20 → %90 (02.10, 09.10)");
  });
  it("gunAy: grafik etiketi gün.ay, sıfır dolgulu; ISO string de kabul", () => {
    expect(gunAy(gun(3))).toBe("03.10");
    expect(gunAy("2026-12-25T10:00:00.000Z")).toBe("25.12");
  });
});
