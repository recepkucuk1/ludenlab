// apps/hub/src/modules/studio/lib/probe/contextLine.test.ts
import { describe, expect, it } from "vitest";
import { OLCUM_KOSU_TAVANI, OLCUM_SERI_TAVANI, gunAy, probeContextLines } from "./contextLine";

const gun = (d: number) => new Date(2026, 9, d); // Ekim 2026
const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

describe("probeContextLines", () => {
  it("seri başına tek satır: ses, kısa pozisyon, düzey, yüzdeler → ve tarihler (tarih ARTAN)", () => {
    const satirlar = probeContextLines(
      [{ sound: "/r/", position: "initial", level: "word", runs: [{ date: gun(14), pct: 60 }, { date: gun(21), pct: 70 }, { date: gun(28), pct: 80 }] }],
      fmt,
    );
    expect(satirlar).toEqual(["- /r/ başta kelime: %60 → %70 → %80 (14.10.2026, 21.10.2026, 28.10.2026)"]);
  });
  it("koşusuz seri atlanır; en çok 3 seri; seri başına son 3 koşu", () => {
    const seri = (s: string, n: number) => ({ sound: s, position: "final" as const, level: "word", runs: Array.from({ length: n }, (_, i) => ({ date: gun(i + 1), pct: 10 * (i + 1) })) });
    const satirlar = probeContextLines([seri("/s/", 0), seri("/k/", 5), seri("/l/", 1), seri("/m/", 2), seri("/n/", 2)], fmt);
    expect(satirlar).toHaveLength(OLCUM_SERI_TAVANI);
    expect(satirlar[0]).toBe("- /k/ sonda kelime: %30 → %40 → %50 (03.10.2026, 04.10.2026, 05.10.2026)");
    expect(OLCUM_KOSU_TAVANI).toBe(3);
  });
  it("girdi sırası ne olursa olsun koşular tarihe göre sıralanır", () => {
    const [s] = probeContextLines([{ sound: "/z/", position: "medial", level: "word", runs: [{ date: gun(9), pct: 90 }, { date: gun(2), pct: 20 }] }], fmt);
    expect(s).toBe("- /z/ ortada kelime: %20 → %90 (02.10.2026, 09.10.2026)");
  });
  it("gunAy: grafik etiketi gün.ay, sıfır dolgulu; ISO string de kabul", () => {
    expect(gunAy(gun(3))).toBe("03.10");
    expect(gunAy("2026-12-25T10:00:00.000Z")).toBe("25.12");
  });
});
