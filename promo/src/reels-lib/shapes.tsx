import React from "react";
import { colors } from "../brand";

export type ShapeKind = "circle" | "ring" | "square" | "plus";

/** Açılış ve kapanışta ortak dekoratif şekiller: merkez (x, y), boyut, tür, renk, gecikme. */
export const SHAPES: { x: number; y: number; size: number; kind: ShapeKind; color: string; delay: number }[] = [
  { x: 170, y: 380, size: 90, kind: "circle", color: colors.orange, delay: 12 },
  { x: 900, y: 330, size: 70, kind: "square", color: colors.studioBlue, delay: 16 },
  { x: 260, y: 640, size: 48, kind: "ring", color: colors.orange, delay: 22 },
  { x: 830, y: 600, size: 34, kind: "circle", color: colors.logoCream, delay: 24 },
  { x: 860, y: 1260, size: 44, kind: "plus", color: colors.orange, delay: 18 },
  { x: 120, y: 1330, size: 60, kind: "plus", color: colors.logoCream, delay: 20 },
  { x: 950, y: 1440, size: 110, kind: "ring", color: colors.lightBlueText, delay: 14 },
  { x: 230, y: 1500, size: 76, kind: "square", color: colors.orange, delay: 26 },
];

export const Shape: React.FC<{ kind: ShapeKind; size: number; color: string }> = ({ kind, size, color }) => {
  if (kind === "plus") {
    const bar = size * 0.26;
    return (
      <div style={{ position: "relative", width: size, height: size }}>
        <div style={{ position: "absolute", left: 0, top: (size - bar) / 2, width: size, height: bar, borderRadius: bar, background: color }} />
        <div style={{ position: "absolute", top: 0, left: (size - bar) / 2, width: bar, height: size, borderRadius: bar, background: color }} />
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: kind === "square" ? size * 0.22 : "50%",
        background: kind === "ring" ? "transparent" : color,
        border: kind === "ring" ? `${Math.max(8, size * 0.12)}px solid ${color}` : undefined,
        boxSizing: "border-box",
      }}
    />
  );
};
