"use client";

import { CHART, GECIS_OLCUTU, chartGeometry, yOf } from "@studio/lib/probe/chartGeometry";

/* Satır içi SVG; kütüphane yok. Renkler poster token'ları (koyu temada da okunur). */
interface Props {
  runs: { pct: number; label: string }[];
  ariaLabel: string;
}

export function ProbeChart({ runs, ariaLabel }: Props) {
  const g = chartGeometry(runs);
  const yTicks = [0, 50, 100];
  return (
    <figure style={{ margin: 0, maxWidth: 560 }}>
    <svg viewBox={`0 0 ${CHART.w} ${CHART.h}`} role="img" aria-label={ariaLabel} style={{ width: "100%", height: "auto", display: "block" }}>
      {yTicks.map((t) => {
        const y = yOf(t);
        return (
          <g key={t}>
            <line x1={CHART.pad.l} x2={CHART.w - CHART.pad.r} y1={y} y2={y} stroke="var(--poster-ink-faint)" strokeWidth={1} />
            <text x={CHART.pad.l - 6} y={y + 4} fontSize={9} textAnchor="end" fill="var(--poster-ink-3)">%{t}</text>
          </g>
        );
      })}
      <line x1={CHART.pad.l} x2={CHART.w - CHART.pad.r} y1={g.line80Y} y2={g.line80Y} stroke="var(--poster-green)" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={CHART.pad.l + 4} y={g.line80Y - 3} fontSize={9} textAnchor="start" fill="var(--poster-ink-3)">%{GECIS_OLCUTU} geçiş ölçütü</text>
      {g.path && <path d={g.path} fill="none" stroke="var(--poster-accent)" strokeWidth={2.5} strokeLinejoin="round" />}
      {g.points.map((p) => (
        <g key={`${p.label}-${p.x}`}>
          <circle cx={p.x} cy={p.y} r={4.5} fill="var(--poster-accent)" stroke="var(--poster-ink)" strokeWidth={1.5}>
            <title>{p.label}: %{p.pct}</title>
          </circle>
          {p.showLabel && <text x={p.x} y={CHART.h - 8} fontSize={9} textAnchor="middle" fill="var(--poster-ink-3)">{p.label}</text>}
        </g>
      ))}
    </svg>
    <figcaption style={{ fontSize: 11, color: "var(--poster-ink-3)", marginTop: 4 }}>%80 ve üzeri ardışık iki ölçüm: geçiş düşünülebilir</figcaption>
    </figure>
  );
}
