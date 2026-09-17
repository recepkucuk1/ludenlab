import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../brand";

/** Ok imlecinin çizim boyutu ve SVG içindeki uç noktası (px). */
const W = 58;
const H = 64;
const VIEW_W = 22;
const TIP = { x: (3 * W) / VIEW_W, y: (2 * W) / VIEW_W };
/**
 * Keyframe'ler eski yuvarlak imlecin sol-üst köşesini (44 px daire) verir;
 * tıklama noktası dairenin merkeziydi. Ok ucunu aynı noktaya oturtuyoruz ki
 * mevcut sahnelerin koordinatları değişmesin.
 */
const HOTSPOT_OFFSET = 22;

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
      : interpolate(frame, [clickAt - 4, clickAt, clickAt + 6], [1, 0.8, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const opacity = interpolate(frame, [appearAt, appearAt + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <svg
      width={W}
      height={H}
      viewBox="0 0 22 24"
      style={{
        position: "absolute",
        left: x + HOTSPOT_OFFSET - TIP.x,
        top: y + HOTSPOT_OFFSET - TIP.y,
        opacity,
        overflow: "visible",
        transform: `scale(${clickScale})`,
        transformOrigin: `${TIP.x}px ${TIP.y}px`,
        filter: "drop-shadow(3px 4px 0 rgba(14,30,38,0.35))",
      }}
    >
      <path
        d="M3 2 L3 19.5 L7.6 15.4 L10.9 22.2 L14 20.7 L10.8 14 L17 14 Z"
        fill={colors.white}
        stroke={colors.ink}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
};
