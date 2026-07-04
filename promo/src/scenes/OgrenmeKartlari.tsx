import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Apple, Bike, Car, LayoutGrid, Sun } from "lucide-react";
import { colors, fonts } from "../brand";
import { PosterCard } from "../lib/PosterCard";
import { ToolHeader } from "../lib/ToolHeader";
import { TypeWriter } from "../lib/TypeWriter";

const CARDS = [
  { word: "araba", Icon: Car, rot: -2, color: colors.studioBlue, delay: 66 },
  { word: "elma", Icon: Apple, rot: 1.5, color: colors.orange, delay: 72 },
  { word: "güneş", Icon: Sun, rot: 1, color: colors.amber, delay: 78 },
  { word: "bisiklet", Icon: Bike, rot: -1, color: colors.green, delay: 84 },
];

export const OgrenmeKartlari: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inputIn = spring({ frame: frame - 8, fps, config: { damping: 13 } });
  const caption = spring({ frame: frame - 125, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", padding: 70, gap: 44 }}>
      <div style={{ marginTop: 20 }}>
        <ToolHeader icon={<LayoutGrid size={52} strokeWidth={2.4} />} title="Öğrenme Kartları" />
      </div>
      <PosterCard
        style={{
          width: 880,
          padding: "28px 36px",
          opacity: inputIn,
          transform: `translateY(${(1 - inputIn) * 60}px)`,
        }}
      >
        <TypeWriter text="günlük nesneler" start={16} />
      </PosterCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44, width: 880 }}>
        {CARDS.map(({ word, Icon, rot, color, delay }) => {
          const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
          return (
            <PosterCard
              key={word}
              style={{
                height: 420,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 26,
                opacity: s,
                transform: `translateY(${(1 - s) * 120}px) rotate(${rot * s}deg) scale(${0.7 + 0.3 * s})`,
              }}
            >
              <Icon size={150} color={color} strokeWidth={1.8} />
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 56, color: colors.ink }}>{word}</div>
            </PosterCard>
          );
        })}
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontWeight: 500,
          fontSize: 46,
          color: colors.gray,
          opacity: caption,
        }}
      >
        Kelimeyi yaz, kartlar hazır.
      </div>
    </AbsoluteFill>
  );
};
