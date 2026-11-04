import { describe, expect, it } from "vitest";
import { CHART, chartGeometry } from "./chartGeometry";

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
});
