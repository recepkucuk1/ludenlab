import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CalendarDays, Users } from "lucide-react";
import { colors, fonts } from "../brand";
import { PosterCard } from "../lib/PosterCard";
import { Cursor } from "../lib/Cursor";

export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = spring({ frame, fps, config: { damping: 13 } });
  const panel = spring({ frame: frame - 8, fps, config: { damping: 14 }, durationInFrames: 35 });
  const chip = (d: number) => spring({ frame: frame - d, fps, config: { damping: 12 } });
  const btnScale = interpolate(frame, [116, 122, 130], [1, 0.93, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", padding: 70 }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 72,
          color: colors.ink,
          marginTop: 20,
          opacity: title,
          transform: `translateY(${(1 - title) * 40}px)`,
        }}
      >
        Tüm çalışmanız tek panelde
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
      <PosterCard
        style={{
          width: 880,
          padding: 44,
          display: "flex",
          flexDirection: "column",
          gap: 30,
          transform: `translateY(${(1 - panel) * 1100}px)`,
        }}
      >
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 52, color: colors.ink }}>Merhaba!</div>
        <div style={{ display: "flex", gap: 26 }}>
          <PosterCard bg={colors.paleBlue} rotate={-1.5} shadow={5} style={{ flex: 1, padding: 26, opacity: chip(24) }}>
            <Users size={44} color={colors.studioBlue} strokeWidth={2.4} />
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 64, color: colors.ink }}>12</div>
            <div style={{ fontFamily: fonts.body, fontSize: 34, color: colors.gray }}>öğrenci</div>
          </PosterCard>
          <PosterCard rotate={1} shadow={5} style={{ flex: 1, padding: 26, opacity: chip(30) }}>
            <CalendarDays size={44} color={colors.orange} strokeWidth={2.4} />
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 64, color: colors.ink }}>5</div>
            <div style={{ fontFamily: fonts.body, fontSize: 34, color: colors.gray }}>bugünkü seans</div>
          </PosterCard>
        </div>
        <PosterCard shadow={5} style={{ padding: 30, opacity: chip(38) }}>
          <div style={{ fontFamily: fonts.body, fontSize: 32, color: colors.gray, marginBottom: 18 }}>Bugünkü takvim</div>
          {[100, 78, 56].map((w, i) => (
            <div
              key={i}
              style={{
                height: 34,
                width: `${w}%`,
                background: colors.paleBlue,
                border: `2px solid ${colors.ink}`,
                borderRadius: 10,
                marginBottom: 14,
              }}
            />
          ))}
        </PosterCard>
        <div
          style={{
            alignSelf: "center",
            background: colors.studioBlue,
            border: `3px solid ${colors.ink}`,
            borderRadius: 18,
            boxShadow: `6px 6px 0 ${colors.ink}`,
            padding: "22px 70px",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 42,
            color: colors.white,
            opacity: chip(46),
            transform: `scale(${btnScale})`,
          }}
        >
          Araçlar →
        </div>
      </PosterCard>
      </div>
      <Cursor
        appearAt={85}
        keyframes={[
          { frame: 85, x: 850, y: 1700 },
          { frame: 114, x: 518, y: 1323 },
        ]}
        clickAt={122}
      />
    </AbsoluteFill>
  );
};
