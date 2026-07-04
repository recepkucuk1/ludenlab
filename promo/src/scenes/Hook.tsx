import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../brand";
import { Squiggle } from "../lib/Squiggle";

const WORDS = ["Seans", "materyali", "hazırlamak", "saatler", "almasın."];

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const label = spring({ frame: frame - 3, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, justifyContent: "center", padding: 90 }}>
      <div
        style={{
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 40,
          letterSpacing: 10,
          color: colors.orange,
          marginBottom: 56,
          opacity: label,
        }}
      >
        LUDENLAB STUDIO
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", columnGap: 30 }}>
        {WORDS.map((w, i) => {
          const s = spring({ frame: frame - 8 - i * 5, fps, config: { damping: 13 } });
          return (
            <span
              key={w}
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: 112,
                lineHeight: 1.18,
                color: colors.ink,
                opacity: s,
                display: "inline-block",
                transform: `translateY(${(1 - s) * 60}px)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      <div style={{ marginTop: 48 }}>
        <Squiggle start={45} />
      </div>
    </AbsoluteFill>
  );
};
