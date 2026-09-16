import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../brand";
import { PosterCard } from "../../lib/PosterCard";

const ModuleCard: React.FC<{ title: string; line: string; accent: string; progress: number }> = ({
  title,
  line,
  accent,
  progress,
}) => (
  <PosterCard
    style={{
      marginTop: 50,
      padding: "36px 44px",
      borderLeft: `18px solid ${accent}`,
      opacity: progress,
      transform: `translateX(${(1 - progress) * -140}px)`,
    }}
  >
    <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 84, color: accent, lineHeight: 1 }}>
      {title}
    </div>
    <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 46, color: colors.ink, marginTop: 14 }}>
      {line}
    </div>
  </PosterCard>
);

export const LaunchBoard: React.FC<{ enter: boolean; showAtolye: boolean }> = ({ enter, showAtolye }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 13 } });
  const badge = enter ? s(0) : 1;
  const mark = enter ? s(6) : 1;
  const studio = enter ? s(18) : 1;
  const atolye = showAtolye ? s(4) : 0;
  return (
    <AbsoluteFill style={{ background: colors.cream, padding: "260px 90px 0" }}>
      <div
        style={{
          alignSelf: "flex-start",
          background: colors.orange,
          color: colors.white,
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 38,
          letterSpacing: 8,
          padding: "12px 28px",
          borderRadius: 999,
          border: `3px solid ${colors.ink}`,
          opacity: badge,
          transform: `scale(${0.6 + 0.4 * badge})`,
        }}
      >
        YAYINDA
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 170,
          lineHeight: 1,
          marginTop: 30,
          opacity: mark,
          transform: `translateY(${(1 - mark) * 50}px)`,
        }}
      >
        <span style={{ color: colors.ink }}>Luden</span>
        <span style={{ color: colors.orange }}>Lab</span>
      </div>
      <ModuleCard title="Studio" line="Dil ve konuşma alanında çalışan uzmanlar için" accent={colors.studioBlue} progress={studio} />
      <ModuleCard title="Atölye" line="Özel eğitim öğretmenleri için" accent={colors.orange} progress={atolye} />
    </AbsoluteFill>
  );
};
