import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../brand";

export const EndCard: React.FC<{ product?: "STUDIO" | "ATÖLYE" }> = ({ product }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wipe = interpolate(frame, [0, 14], [0, 1600], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 13 } });
  const logo = s(10);
  const sub = s(20);
  const btn = s(28);
  const pulse = 1 + 0.04 * Math.sin(frame / 8);
  return (
    <AbsoluteFill style={{ background: colors.cream }}>
      <AbsoluteFill
        style={{
          background: colors.darkTeal,
          clipPath: `circle(${wipe}px at 50% 50%)`,
          alignItems: "center",
          justifyContent: "center",
          gap: 34,
          paddingBottom: 120,
        }}
      >
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 150,
            opacity: logo,
            transform: `translateY(${(1 - logo) * 50}px)`,
          }}
        >
          <span style={{ color: colors.logoCream }}>Luden</span>
          <span style={{ color: colors.orange }}>Lab</span>
        </div>
        {product ? (
          <div
            style={{
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: 52,
              letterSpacing: 22,
              color: colors.lightBlueText,
              opacity: sub,
            }}
          >
            {product}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 30,
            background: colors.orange,
            border: `4px solid ${colors.logoCream}`,
            borderRadius: 22,
            padding: "28px 80px",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 58,
            color: colors.white,
            opacity: btn,
            transform: `scale(${btn * pulse})`,
          }}
        >
          ludenlab.com
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
