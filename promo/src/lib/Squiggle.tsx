import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../brand";

export const Squiggle: React.FC<{ start: number; width?: number; color?: string }> = ({
  start,
  width = 420,
  color = colors.orange,
}) => {
  const frame = useCurrentFrame();
  const len = 600;
  const off = interpolate(frame, [start, start + 20], [len, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <svg width={width} height={36} viewBox="0 0 420 36" fill="none">
      <path
        d="M8 22 Q 42 6, 76 22 T 144 22 T 212 22 T 280 22 T 348 22 T 412 22"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={off}
      />
    </svg>
  );
};
