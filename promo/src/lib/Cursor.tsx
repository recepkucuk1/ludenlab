import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../brand";

export const Cursor: React.FC<{
  keyframes: { frame: number; x: number; y: number }[];
  clickAt?: number;
  appearAt: number;
}> = ({ keyframes, clickAt, appearAt }) => {
  const frame = useCurrentFrame();
  const fs = keyframes.map((k) => k.frame);
  const x = interpolate(frame, fs, keyframes.map((k) => k.x), {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, fs, keyframes.map((k) => k.y), {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const clickScale =
    clickAt === undefined
      ? 1
      : interpolate(frame, [clickAt - 4, clickAt, clickAt + 6], [1, 0.7, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const opacity = interpolate(frame, [appearAt, appearAt + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 44,
        height: 44,
        borderRadius: 22,
        background: colors.ink,
        opacity: opacity * 0.85,
        transform: `scale(${clickScale})`,
        border: `3px solid ${colors.cream}`,
      }}
    />
  );
};
