import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../brand";
import { PosterCard } from "../../lib/PosterCard";
import { Squiggle } from "../../lib/Squiggle";
import { EndCard } from "../../reels-lib/EndCard";
import { LaunchBoard } from "./LaunchBoard";

/** Dağınık materyal sayfaları: x, y, son açı, gecikme. */
const SHEETS = [
  { x: 90, y: 300, r: -12, d: 0 },
  { x: 640, y: 250, r: 9, d: 4 },
  { x: 360, y: 420, r: -4, d: 8 },
  { x: 760, y: 540, r: 14, d: 12 },
  { x: 130, y: 610, r: 7, d: 16 },
];

const Sheet: React.FC<{ rotate: number; style: React.CSSProperties }> = ({ rotate, style }) => (
  <PosterCard rotate={rotate} shadow={6} style={{ position: "absolute", width: 220, height: 280, padding: 26, ...style }}>
    <div style={{ height: 18, width: "70%", background: colors.paleBlue, borderRadius: 9, marginBottom: 16 }} />
    <div style={{ height: 14, width: "90%", background: colors.cream, borderRadius: 7, marginBottom: 12 }} />
    <div style={{ height: 14, width: "60%", background: colors.cream, borderRadius: 7 }} />
  </PosterCard>
);

const Headline: React.FC<{ lines: string[]; top: number; fontSize: number; delay: number }> = ({
  lines,
  top,
  fontSize,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top }}>
      {lines.map((line, i) => {
        const p = spring({ frame: frame - delay - i * 10, fps, config: { damping: 13 } });
        return (
          <div
            key={line}
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize,
              lineHeight: 1.1,
              color: i === lines.length - 1 ? colors.orange : colors.ink,
              opacity: p,
              transform: `translateY(${(1 - p) * 60}px)`,
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};

export const S1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: colors.cream }}>
      {SHEETS.map((s, i) => {
        const p = spring({ frame: frame - s.d, fps, config: { damping: 14 } });
        return <Sheet key={i} rotate={s.r * p} style={{ left: s.x, top: s.y - (1 - p) * 500, opacity: p }} />;
      })}
      <Headline lines={["Her çocuk ayrı.", "Her materyal ayrı."]} top={1000} fontSize={96} delay={18} />
    </AbsoluteFill>
  );
};

export const S2Yalniz: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settle = spring({ frame, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill style={{ background: colors.cream }}>
      {SHEETS.slice(0, 3).map((s, i) => (
        <Sheet
          key={i}
          rotate={s.r + (i * 3 - 3 - s.r) * settle}
          style={{ left: s.x + (430 + i * 18 - s.x) * settle, top: s.y + (380 + i * 18 - s.y) * settle }}
        />
      ))}
      <Headline lines={["Yalnız", "değilsin."]} top={960} fontSize={150} delay={6} />
      <div style={{ position: "absolute", left: 90, top: 1300 }}>
        <Squiggle start={24} />
      </div>
    </AbsoluteFill>
  );
};

export const S3Studio: React.FC = () => <LaunchBoard enter showAtolye={false} />;

export const S4Atolye: React.FC = () => <LaunchBoard enter={false} showAtolye />;

export const S5Kapanis: React.FC = () => <EndCard />;
