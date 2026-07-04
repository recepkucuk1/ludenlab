import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../brand";

export const ToolHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13 } });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        opacity: s,
        transform: `translateY(${(1 - s) * 40}px)`,
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 24,
          background: colors.studioBlue,
          border: `3px solid ${colors.ink}`,
          boxShadow: `6px 6px 0 ${colors.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.white,
        }}
      >
        {icon}
      </div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 76, color: colors.ink }}>{title}</div>
    </div>
  );
};
