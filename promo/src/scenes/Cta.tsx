import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../brand";

export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wipe = interpolate(frame, [0, 16], [0, 1600], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logo = spring({ frame: frame - 12, fps, config: { damping: 12 } });
  const studio = spring({ frame: frame - 24, fps, config: { damping: 13 } });
  const btn = spring({ frame: frame - 34, fps, config: { damping: 12 } });
  const pulse = 1 + 0.04 * Math.sin(frame / 8);
  return (
    <AbsoluteFill style={{ background: colors.cream }}>
      <AbsoluteFill
        style={{
          background: colors.darkTeal,
          clipPath: `circle(${wipe}px at 50% 50%)`,
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
        }}
      >
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 130,
            opacity: logo,
            transform: `translateY(${(1 - logo) * 50}px)`,
          }}
        >
          <span style={{ color: colors.logoCream }}>Luden</span>
          <span style={{ color: colors.orange }}>Lab</span>
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 52,
            letterSpacing: 22,
            color: colors.lightBlueText,
            opacity: studio,
          }}
        >
          STUDIO
        </div>
        <div
          style={{
            marginTop: 40,
            background: colors.orange,
            border: `4px solid ${colors.logoCream}`,
            borderRadius: 22,
            padding: "28px 80px",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 54,
            color: colors.white,
            opacity: btn,
            transform: `scale(${btn * pulse})`,
          }}
        >
          ludenlab.com
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 90,
            fontFamily: fonts.body,
            fontSize: 32,
            color: colors.logoCream,
            opacity: 0.6 * studio,
          }}
        >
          © 2026 LudenLab · Made in Türkiye
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
