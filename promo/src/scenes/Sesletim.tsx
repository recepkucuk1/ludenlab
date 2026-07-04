import React from "react";
import {
  AbsoluteFill,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AudioLines, FileDown, Image as ImageIcon } from "lucide-react";
import { colors, fonts } from "../brand";
import { PosterCard } from "../lib/PosterCard";
import { ToolHeader } from "../lib/ToolHeader";

const PHONEMES = ["/r/", "/s/", "/k/"];
const WORDS = [
  { word: "araba", delay: 48 },
  { word: "resim", delay: 56 },
  { word: "armut", delay: 64 },
  { word: "robot", delay: 72 },
];

export const Sesletim: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chipsIn = spring({ frame: frame - 10, fps, config: { damping: 13 } });
  const selBg = interpolateColors(frame, [26, 36], [colors.white, colors.studioBlue]);
  const selFg = interpolateColors(frame, [26, 36], [colors.gray, colors.white]);
  const selPop =
    1 +
    0.12 *
      Math.sin(
        Math.PI *
          interpolate(frame, [26, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      );
  const stampS = spring({ frame: frame - 105, fps, config: { damping: 11 } });
  const stampScale = interpolate(stampS, [0, 1], [2.4, 1]);
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", padding: 70, gap: 46 }}>
      <div style={{ marginTop: 20 }}>
        <ToolHeader icon={<AudioLines size={52} strokeWidth={2.4} />} title="Sesletim" />
      </div>
      <div style={{ display: "flex", gap: 24, opacity: chipsIn }}>
        {PHONEMES.map((p, i) => {
          const selected = i === 0;
          return (
            <div
              key={p}
              style={{
                background: selected ? selBg : colors.white,
                color: selected ? selFg : colors.gray,
                border: `3px solid ${colors.ink}`,
                borderRadius: 999,
                boxShadow: `5px 5px 0 ${colors.ink}`,
                padding: "16px 44px",
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: 52,
                transform: selected ? `scale(${selPop})` : undefined,
              }}
            >
              {p}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 30, width: 880 }}>
        {WORDS.map(({ word, delay }) => {
          const s = spring({ frame: frame - delay, fps, config: { damping: 13 } });
          return (
            <PosterCard
              key={word}
              style={{
                padding: 30,
                display: "flex",
                alignItems: "center",
                gap: 30,
                opacity: s,
                transform: `translateX(${(1 - s) * 300}px)`,
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 20,
                  background: colors.paleBlue,
                  border: `2px solid ${colors.ink}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ImageIcon size={54} color={colors.studioBlue} strokeWidth={2} />
              </div>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 60, color: colors.ink }}>{word}</div>
            </PosterCard>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 460,
          right: 120,
          opacity: stampS,
          transform: `scale(${stampScale}) rotate(-7deg)`,
        }}
      >
        <PosterCard bg={colors.green} shadow={6} style={{ padding: "24px 44px", display: "flex", alignItems: "center", gap: 20 }}>
          <FileDown size={48} color={colors.white} strokeWidth={2.4} />
          <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 46, color: colors.white }}>PDF hazır</span>
        </PosterCard>
      </div>
    </AbsoluteFill>
  );
};
