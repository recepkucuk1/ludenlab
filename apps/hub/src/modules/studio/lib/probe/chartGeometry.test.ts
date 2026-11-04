import { describe, expect, it } from "vitest";
import { CHART, chartGeometry, yOf } from "./chartGeometry";

describe("chartGeometry", () => {
  it("tek koşu: nokta yatayda ortada, yol yok", () => {
    const g = chartGeometry([{ pct: 50, label: "14.10" }]);
    expect(g.points).toHaveLength(1);
    expect(g.points[0]!.x).toBeCloseTo(CHART.pad.l + (CHART.w - CHART.pad.l - CHART.pad.r) / 2, 5);
    expect(g.path).toBe("");
  });
  it("y ekseni: %100 üstte (pad.t), %0 altta (h - pad.b); 80 çizgisi aradadır", () => {
    const g = chartGeometry([{ pct: 100, label: "a" }, { pct: 0, label: "b" }]);
    expect(g.points[0]!.y).toBeCloseTo(CHART.pad.t, 5);
    expect(g.points[1]!.y).toBeCloseTo(CHART.h - CHART.pad.b, 5);
    expect(g.line80Y).toBeGreaterThan(g.points[0]!.y);
    expect(g.line80Y).toBeLessThan(g.points[1]!.y);
  });
  it("çok koşu: x eşit aralıklı, yol M…L… biçiminde", () => {
    const g = chartGeometry([{ pct: 10, label: "a" }, { pct: 20, label: "b" }, { pct: 30, label: "c" }]);
    const dx = g.points[1]!.x - g.points[0]!.x;
    expect(g.points[2]!.x - g.points[1]!.x).toBeCloseTo(dx, 5);
    expect(g.path).toMatch(/^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/);
  });
  it("boş liste: nokta yok, yol boş", () => {
    expect(chartGeometry([])).toEqual({ points: [], path: "", line80Y: expect.any(Number) });
  });

  it("kırpma: %150 üstte, %-10 altta", () => {
    expect(yOf(150)).toBe(CHART.pad.t);
    expect(yOf(-10)).toBe(CHART.h - CHART.pad.b);
    const g = chartGeometry([{ pct: 150, label: "a" }, { pct: -10, label: "b" }]);
    expect(g.points[0]!.y).toBe(CHART.pad.t);
    expect(g.points[1]!.y).toBe(CHART.h - CHART.pad.b);
  });
  it("iki nokta: tam yol dizgesi", () => {
    const g = chartGeometry([{ pct: 100, label: "a" }, { pct: 0, label: "b" }]);
    expect(g.path).toBe("M 30 10 L 304 116");
  });
  it("2 ondalığa yuvarlar", () => {
    expect(yOf(33.333)).toBe(80.67);
  });
  it("line80Y tam değer", () => {
    expect(chartGeometry([]).line80Y).toBe(31.2);
  });
  it("etiket seyreltme: n=3 ve n=8 hepsi görünür", () => {
    for (const n of [3, 8]) {
      const g = chartGeometry(Array.from({ length: n }, (_, i) => ({ pct: i, label: String(i) })));
      expect(g.points.every((p) => p.showLabel)).toBe(true);
    }
  });
  it("etiket seyreltme: n=20 → adım 3, son nokta hep görünür, label korunur", () => {
    const g = chartGeometry(Array.from({ length: 20 }, (_, i) => ({ pct: i, label: `L${i}` })));
    const shown = g.points.flatMap((p, i) => (p.showLabel ? [i] : []));
    expect(shown).toEqual([0, 3, 6, 9, 12, 15, 18, 19]);
    expect(g.points[1]!.label).toBe("L1");
  });
});
