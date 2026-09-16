import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { colors } from "../../brand";

export const Clock: React.FC<{ size: number; fromMin: number; toMin: number; durationFrames: number }> = ({
  size,
  fromMin,
  toMin,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const minutes = interpolate(frame, [0, durationFrames], [fromMin, toMin], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const hourDeg = (minutes / 60) * 30;
  const minuteDeg = (minutes % 60) * 6;
  const hand = (len: number, width: number, deg: number, color: string): React.CSSProperties => ({
    position: "absolute",
    left: size / 2 - width / 2,
    top: size / 2 - len,
    width,
    height: len,
    borderRadius: width,
    background: color,
    transformOrigin: "50% 100%",
    transform: `rotate(${deg}deg)`,
  });
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        background: colors.white,
        border: `6px solid ${colors.ink}`,
        boxShadow: `10px 10px 0 ${colors.ink}`,
      }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: size / 2 - 4,
            top: 18,
            width: 8,
            height: i % 3 === 0 ? 34 : 18,
            borderRadius: 4,
            background: colors.ink,
            transformOrigin: `50% ${size / 2 - 18}px`,
            transform: `rotate(${i * 30}deg)`,
          }}
        />
      ))}
      <div style={hand(size * 0.26, 16, hourDeg, colors.ink)} />
      <div style={hand(size * 0.38, 10, minuteDeg, colors.orange)} />
      <div
        style={{
          position: "absolute",
          left: size / 2 - 16,
          top: size / 2 - 16,
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: colors.ink,
        }}
      />
    </div>
  );
};
