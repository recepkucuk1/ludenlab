/* SVG çizgi grafiği geometrisi (spec §7): saf, testlenebilir; bileşen yalnız çizer. */
export const CHART = { w: 320, h: 140, pad: { l: 30, r: 16, t: 10, b: 24 } } as const;
export const GECIS_OLCUTU = 80;

export interface ChartPoint { x: number; y: number; pct: number; label: string; showLabel: boolean }
export interface ChartGeometry { points: ChartPoint[]; path: string; line80Y: number }

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Yüzdeyi (0–100'e kırpılmış) SVG y koordinatına çevirir. */
export function yOf(pct: number): number {
  const innerH = CHART.h - CHART.pad.t - CHART.pad.b;
  return r2(CHART.pad.t + ((100 - Math.max(0, Math.min(100, pct))) / 100) * innerH);
}

export function chartGeometry(runs: ReadonlyArray<{ pct: number; label: string }>): ChartGeometry {
  const innerW = CHART.w - CHART.pad.l - CHART.pad.r;
  const n = runs.length;
  const step = Math.max(1, Math.ceil(n / 8));
  const points = runs.map((r, i) => ({
    x: r2(n === 1 ? CHART.pad.l + innerW / 2 : CHART.pad.l + (i / (n - 1)) * innerW),
    y: yOf(r.pct),
    pct: r.pct,
    label: r.label,
    showLabel: i === n - 1 || (i % step === 0 && n - 1 - i >= step),
  }));
  const path = points.length >= 2 ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") : "";
  return { points, path, line80Y: yOf(GECIS_OLCUTU) };
}
