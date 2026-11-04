"use client";

import { CHART, GECIS_OLCUTU, chartGeometry } from "@studio/lib/probe/chartGeometry";

/* Satır içi SVG; kütüphane yok. Renkler poster token'ları (koyu temada da okunur). */
interface Props {
  runs: { pct: number; label: string }[];
  ariaLabel: string;
}

export function ProbeChart({ runs, ariaLabel }: Props) {
  const g = chartGeometry(runs);
  const yTicks = [0, 50, 100];
  const innerH = CHART.h - CHART.pad.t - CHART.pad.b;
  return (
    <svg viewBox={`0 0 ${CHART.w} ${CHART.h}`} role="img" aria-label={ariaLabel} style={{ width: "100%", height: "auto", display: "block" }}>
      {yTicks.map((t) => {
        const y = CHART.pad.t + ((100 - t) / 100) * innerH;
        return (
          <g key={t}>
            <line x1={CHART.pad.l} x2={CHART.w - CHART.pad.r} y1={y} y2={y} stroke="var(--poster-ink-faint)" strokeWidth={1} />
            <text x={CHART.pad.l - 6} y={y + 4} fontSize={9} textAnchor="end" fill="var(--poster-ink-3)">%{t}</text>
          </g>
        );
      })}
      <line x1={CHART.pad.l} x2={CHART.w - CHART.pad.r} y1={g.line80Y} y2={g.line80Y} stroke="var(--poster-green)" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={CHART.w - CHART.pad.r} y={g.line80Y - 3} fontSize={9} textAnchor="end" fill="var(--poster-green)">%{GECIS_OLCUTU} geçiş ölçütü</text>
      {g.path && <path d={g.path} fill="none" stroke="var(--poster-accent)" strokeWidth={2.5} strokeLinejoin="round" />}
      {g.points.map((p) => (
        <g key={`${p.label}-${p.x}`}>
          <circle cx={p.x} cy={p.y} r={4.5} fill="var(--poster-accent)" stroke="var(--poster-ink)" strokeWidth={1.5}>
            <title>{p.label}: %{p.pct}</title>
          </circle>
          <text x={p.x} y={CHART.h - 8} fontSize={9} textAnchor="middle" fill="var(--poster-ink-3)">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}
