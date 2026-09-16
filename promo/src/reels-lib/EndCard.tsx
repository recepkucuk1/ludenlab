import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../brand";
import { Cursor } from "../lib/Cursor";
import { Squiggle } from "../lib/Squiggle";
import { SHAPES, Shape } from "./shapes";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Butonun merkezi — imleç ve tıklama dalgası buna göre konumlanır. */
const BUTTON_Y = 1030;
const BUTTON_H = 134;
const BUTTON_CENTER = { x: 540, y: BUTTON_Y + BUTTON_H / 2 };
const CLICK_AT = 66;

const Letters: React.FC<{ text: string; color: string; startDelay: number }> = ({ text, color, startDelay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {text.split("").map((ch, i) => {
        const p = spring({ frame: frame - startDelay - i * 2, fps, config: { damping: 10, stiffness: 140 } });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color,
              opacity: Math.min(1, p * 1.5),
              transform: `translateY(${(1 - p) * 90}px) rotate(${(1 - p) * (i % 2 ? 14 : -14)}deg)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </>
  );
};

export const EndCard: React.FC<{ product?: "STUDIO" | "ATÖLYE" }> = ({ product }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wipe = interpolate(frame, [0, 14], [0, 1600], clamp);
  const s = (delay: number, damping = 13) => spring({ frame: frame - delay, fps, config: { damping } });

  const sub = s(24);
  const btn = s(30, 11);
  const pulse = 1 + 0.03 * Math.sin(frame / 7);
  const clickDip = interpolate(frame, [CLICK_AT - 4, CLICK_AT, CLICK_AT + 6], [1, 0.9, 1], clamp);
  const shineCycle = frame < 42 ? -1 : (frame - 42) % 50;
  const shineX = interpolate(shineCycle, [0, 18], [-220, 760], clamp);
  const clickWave = interpolate(frame, [CLICK_AT, CLICK_AT + 22], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: colors.cream }}>
      <AbsoluteFill style={{ background: colors.darkTeal, clipPath: `circle(${wipe}px at 50% 50%)` }}>
        {/* Merkezden yayılan halkalar */}
        {[8, 18, 28].map((start) => {
          const t = interpolate(frame, [start, start + 40], [0, 1], clamp);
          const size = 200 + t * 1500;
          return (
            <div
              key={start}
              style={{
                position: "absolute",
                left: 540 - size / 2,
                top: 900 - size / 2,
                width: size,
                height: size,
                borderRadius: "50%",
                border: `6px solid ${colors.logoCream}`,
                opacity: t === 0 ? 0 : 0.28 * (1 - t),
              }}
            />
          );
        })}

        {/* Uçuşan şekiller */}
        {SHAPES.map((sh, i) => {
          const pop = spring({ frame: frame - sh.delay, fps, config: { damping: 9, stiffness: 120 } });
          const dx = Math.sin(frame / 20 + i) * 16;
          const dy = Math.cos(frame / 24 + i * 1.3) * 20;
          const rot = frame * (i % 2 ? 0.9 : -0.7) + i * 20;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: sh.x - sh.size / 2 + dx,
                top: sh.y - sh.size / 2 + dy,
                transform: `scale(${pop}) rotate(${rot}deg)`,
                opacity: 0.9,
              }}
            >
              <Shape kind={sh.kind} size={sh.size} color={sh.color} />
            </div>
          );
        })}

        {/* Wordmark */}
        <div
          style={{
            position: "absolute",
            top: 740,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 150,
            lineHeight: 1,
          }}
        >
          <Letters text="Luden" color={colors.logoCream} startDelay={12} />
          <Letters text="Lab" color={colors.orange} startDelay={22} />
        </div>
        <div style={{ position: "absolute", top: 910, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <Squiggle start={30} width={360} />
        </div>

        {product ? (
          <div
            style={{
              position: "absolute",
              top: 640,
              left: 0,
              right: 0,
              textAlign: "center",
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: 48,
              letterSpacing: 22,
              color: colors.lightBlueText,
              opacity: sub,
            }}
          >
            {product}
          </div>
        ) : null}

        {/* Tıklama dalgası */}
        <div
          style={{
            position: "absolute",
            left: BUTTON_CENTER.x - (160 + clickWave * 520) / 2,
            top: BUTTON_CENTER.y - (160 + clickWave * 520) / 2,
            width: 160 + clickWave * 520,
            height: 160 + clickWave * 520,
            borderRadius: "50%",
            border: `8px solid ${colors.orange}`,
            opacity: clickWave === 0 ? 0 : 0.7 * (1 - clickWave),
          }}
        />

        {/* Buton */}
        <div style={{ position: "absolute", top: BUTTON_Y, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              height: BUTTON_H,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              background: colors.orange,
              border: `4px solid ${colors.logoCream}`,
              borderRadius: 22,
              padding: "0 80px",
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: 58,
              color: colors.white,
              opacity: Math.min(1, btn * 1.5),
              transform: `scale(${btn * pulse * clickDip})`,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -20,
                bottom: -20,
                left: shineX,
                width: 90,
                transform: "skewX(-20deg)",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
              }}
            />
            <span style={{ position: "relative" }}>ludenlab.com</span>
          </div>
        </div>

        <Cursor
          appearAt={44}
          clickAt={CLICK_AT}
          keyframes={[
            { frame: 44, x: 860, y: 1480 },
            { frame: CLICK_AT - 4, x: BUTTON_CENTER.x + 150, y: BUTTON_CENTER.y + 34 },
          ]}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
