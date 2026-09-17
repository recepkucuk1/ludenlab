import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../brand";
import { PosterCard } from "../../lib/PosterCard";
import { r2Card } from "./cardData";

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: colors.gray, marginBottom: 10 }}>
    {children}
  </div>
);

export const CardMock: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number) => spring({ frame: frame - start - d, fps, config: { damping: 14 } });
  const reveal = (p: number): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * 30}px)` });
  const card = s(0);
  return (
    <PosterCard style={{ width: 900, padding: "34px 40px", ...reveal(card) }}>
      <div style={{ ...reveal(s(4)), fontFamily: fonts.display, fontWeight: 800, fontSize: 50, color: colors.ink, lineHeight: 1.1 }}>
        {r2Card.title}
      </div>
      <div style={{ ...reveal(s(10)), marginTop: 22 }}>
        <SectionTitle>AMAÇ</SectionTitle>
        <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 32, lineHeight: 1.35, color: colors.ink }}>
          {r2Card.objective}
        </div>
      </div>
      <div style={{ ...reveal(s(18)), marginTop: 22 }}>
        <SectionTitle>MATERYALLER</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {r2Card.materials.map((m, i) => {
            const p = s(20 + i * 3);
            return (
              <span
                key={m}
                style={{
                  fontFamily: fonts.body,
                  fontWeight: 500,
                  fontSize: 28,
                  background: colors.paleBlue,
                  borderRadius: 999,
                  padding: "8px 20px",
                  opacity: p,
                  transform: `scale(${0.6 + 0.4 * p})`,
                }}
              >
                {m}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ ...reveal(s(32)), marginTop: 22 }}>
        <SectionTitle>UYGULAMA ADIMLARI</SectionTitle>
        {r2Card.instructions.slice(0, 3).map((step, i) => {
          const p = s(34 + i * 5);
          return (
            <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 10, ...reveal(p) }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  background: colors.studioBlue,
                  color: colors.white,
                  fontFamily: fonts.body,
                  fontWeight: 700,
                  fontSize: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 28, lineHeight: 1.35, color: colors.ink }}>
                {step.replace(/^Adım \d+:\s*/, "")}
              </span>
            </div>
          );
        })}
      </div>
    </PosterCard>
  );
};
