import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../brand";
import { SHAPES, Shape } from "./shapes";

/** Açılış hareketinin süresi (kare); ReelFrame bu kadar süre ilk sahnenin üstüne bindirir. */
export const INTRO_FRAMES = 46;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const CENTER = { x: 540, y: 960 };

/**
 * Kapanış kartının motion dilinde açılış: koyu teal zemin ortadan büyüyen
 * daireyle açılır, şekiller merkezden kenarlara saçılıp söner. Ayrı bir intro
 * değildir — hook sahnesi alttan ilk karelerden itibaren görünür (gecikme yok).
 */
export const IntroBurst: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hole = interpolate(frame, [0, 18], [90, 1250], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const edgeOpacity = interpolate(frame, [16, 26], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Ortadan delinerek açılan teal örtü */}
      <AbsoluteFill
        style={{
          background: colors.darkTeal,
          WebkitMaskImage: `radial-gradient(circle at 50% 50%, transparent ${hole}px, black ${hole + 1}px)`,
          maskImage: `radial-gradient(circle at 50% 50%, transparent ${hole}px, black ${hole + 1}px)`,
        }}
      />
      {/* Delik kenarını çizen turuncu halka */}
      <div
        style={{
          position: "absolute",
          left: CENTER.x - hole,
          top: CENTER.y - hole,
          width: hole * 2,
          height: hole * 2,
          borderRadius: "50%",
          border: `14px solid ${colors.orange}`,
          opacity: hole === 0 ? 0 : edgeOpacity,
        }}
      />
      {/* Merkezden saçılan şekiller */}
      {SHAPES.map((sh, i) => {
        const fly = spring({ frame: frame + 2 - i, fps, config: { damping: 14, stiffness: 90 } });
        const fade = interpolate(frame, [26 + i, 42 + i / 2], [1, 0], clamp);
        const x = CENTER.x + (sh.x - CENTER.x) * fly * 1.15;
        const y = CENTER.y + (sh.y - CENTER.y) * fly * 1.15;
        const rot = (1 - fly) * 180 + frame * (i % 2 ? 2 : -2);
        // Krem şekiller açılan krem zeminde kaybolmasın.
        const color = sh.color === colors.logoCream ? colors.ink : sh.color;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - sh.size / 2,
              top: y - sh.size / 2,
              opacity: fade,
              transform: `scale(${Math.min(1, fly * 1.4) * (0.6 + 0.4 * fade)}) rotate(${rot}deg)`,
            }}
          >
            <Shape kind={sh.kind} size={sh.size} color={color} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
