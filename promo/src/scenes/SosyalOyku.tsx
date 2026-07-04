import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BookOpen, School } from "lucide-react";
import { colors, fonts } from "../brand";
import { PosterCard } from "../lib/PosterCard";
import { ToolHeader } from "../lib/ToolHeader";

const PAGES = [
  { rot: -9, x: -200, z: 1 },
  { rot: 8, x: 200, z: 2 },
  { rot: 0, x: 0, z: 3 },
];

export const SosyalOyku: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fan = spring({ frame: frame - 18, fps, config: { damping: 13 }, durationInFrames: 35 });
  const caption = spring({ frame: frame - 120, fps, config: { damping: 13 } });
  const lineW = (base: number, d: number) =>
    interpolate(frame, [60 + d, 80 + d], [0, base], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", padding: 70 }}>
      <div style={{ marginTop: 20 }}>
        <ToolHeader icon={<BookOpen size={52} strokeWidth={2.4} />} title="Sosyal Öykü" />
      </div>
      <div style={{ position: "relative", width: 880, height: 1150, marginTop: 80 }}>
        {PAGES.map(({ rot, x, z }, i) => (
          <PosterCard
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: 60,
              width: 580,
              height: 960,
              zIndex: z,
              padding: 36,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              transform: `translateX(-50%) translateX(${x * fan}px) rotate(${rot * fan}deg)`,
            }}
          >
            {z === 3 ? (
              <>
                <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 50, color: colors.ink }}>
                  Okula gidiyorum
                </div>
                <div
                  style={{
                    flex: 1,
                    background: colors.paleBlue,
                    border: `2px solid ${colors.ink}`,
                    borderRadius: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <School size={170} color={colors.studioBlue} strokeWidth={1.6} />
                </div>
                {[100, 84, 58].map((w, j) => (
                  <div
                    key={j}
                    style={{
                      height: 22,
                      width: `${lineW(w, j * 6)}%`,
                      background: "#e5e0d2",
                      borderRadius: 8,
                    }}
                  />
                ))}
              </>
            ) : null}
          </PosterCard>
        ))}
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
        Kişiye özel öyküler, hazır PDF.
      </div>
    </AbsoluteFill>
  );
};
