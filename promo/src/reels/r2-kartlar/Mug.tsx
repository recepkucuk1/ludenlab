import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../../brand";

const STEAM_PATH = "M20 120 Q 0 90, 20 60 T 20 0";

export const Mug: React.FC<{ scale: number }> = ({ scale }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "relative", width: 420, height: 520, transform: `scale(${scale})` }}>
      {[0, 1, 2].map((i) => {
        const t = ((frame + i * 14) % 42) / 42;
        return (
          <svg
            key={i}
            width={40}
            height={120}
            viewBox="0 0 40 120"
            style={{
              position: "absolute",
              left: 110 + i * 70,
              top: 40 - t * 50,
              opacity: interpolate(t, [0, 0.3, 1], [0, 0.9, 0]),
            }}
          >
            <path d={STEAM_PATH} stroke={colors.gray} strokeWidth={9} strokeLinecap="round" fill="none" />
          </svg>
        );
      })}
      <div
        style={{
          position: "absolute",
          right: 10,
          top: 250,
          width: 130,
          height: 150,
          borderRadius: "0 70px 70px 0",
          border: `22px solid ${colors.ink}`,
          borderLeft: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 180,
          width: 300,
          height: 320,
          background: colors.orange,
          border: `6px solid ${colors.ink}`,
          borderRadius: "18px 18px 70px 70px",
          boxShadow: `10px 10px 0 ${colors.ink}`,
        }}
      />
    </div>
  );
};
