import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { LayoutGrid } from "lucide-react";
import { colors, fonts } from "../../brand";
import { Cursor } from "../../lib/Cursor";
import { PosterCard } from "../../lib/PosterCard";
import { ToolHeader } from "../../lib/ToolHeader";
import { TypeWriter } from "../../lib/TypeWriter";
import { EndCard } from "../../reels-lib/EndCard";
import { Headline } from "../../reels-lib/Headline";
import { CardMock } from "./CardMock";
import { Clock } from "./Clock";
import { Mug } from "./Mug";

export const S1Aksam: React.FC = () => (
  <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
    <div style={{ marginTop: 300 }}>
      <Clock size={480} fromMin={18 * 60} toMin={21 * 60 + 40} durationFrames={60} />
    </div>
    <Headline lines={["Pazar akşamı.", "Yine materyaller."]} top={960} fontSize={120} delay={10} />
  </AbsoluteFill>
);

const CHOICES = ["Konuşma", "3–6 yaş", "Orta"];

export const S2Uret: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number) => spring({ frame: frame - d, fps, config: { damping: 13 } });
  const input = s(10);
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", paddingTop: 220 }}>
      <ToolHeader icon={<LayoutGrid size={52} strokeWidth={2.4} />} title="Öğrenme Kartı" />
      <div style={{ display: "flex", gap: 16, marginTop: 30 }}>
        {CHOICES.map((c, i) => {
          const p = s(4 + i * 3);
          return (
            <span
              key={c}
              style={{
                fontFamily: fonts.body,
                fontWeight: 700,
                fontSize: 34,
                color: colors.white,
                background: colors.studioBlue,
                border: `3px solid ${colors.ink}`,
                borderRadius: 999,
                padding: "10px 26px",
                opacity: p,
                transform: `scale(${0.6 + 0.4 * p})`,
              }}
            >
              {c}
            </span>
          );
        })}
      </div>
      <PosterCard style={{ width: 900, padding: "20px 32px", marginTop: 26, opacity: input, transform: `translateY(${(1 - input) * 40}px)` }}>
        <TypeWriter text="/s/ sesi üretimi" start={14} framesPerChar={2} fontSize={44} />
      </PosterCard>
      <div style={{ marginTop: 34 }}>
        <CardMock start={50} />
      </div>
    </AbsoluteFill>
  );
};

const PDF_CLICK = 40;

export const S3Pdf: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const page = spring({ frame, fps, config: { damping: 14 } });
  const btn = spring({ frame: frame - 18, fps, config: { damping: 11 } });
  const dip = interpolate(frame, [PDF_CLICK - 4, PDF_CLICK, PDF_CLICK + 6], [1, 0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arrow = frame > PDF_CLICK ? Math.abs(Math.sin((frame - PDF_CLICK) / 5)) * 16 : 0;
  // Sayfanın üst yarısına yakın plan; yavaşça aşağı kayar (okunur kalsın).
  const pan = interpolate(frame, [10, 100], [0, -220], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <PosterCard
        radius={16}
        shadow={12}
        style={{
          marginTop: 240,
          width: 900,
          height: 980,
          overflow: "hidden",
          opacity: page,
          transform: `translateY(${(1 - page) * 400}px) rotate(${-1.5 * page}deg)`,
        }}
      >
        <Img
          src={staticFile("real/r2-kart.png")}
          style={{ width: 1000, display: "block", marginLeft: -50, marginTop: -30, transform: `translateY(${pan}px)` }}
        />
      </PosterCard>
      <div
        style={{
          position: "absolute",
          left: 560,
          top: 1110,
          display: "flex",
          alignItems: "center",
          gap: 18,
          background: colors.orange,
          border: `4px solid ${colors.ink}`,
          boxShadow: `6px 6px 0 ${colors.ink}`,
          borderRadius: 20,
          padding: "22px 40px",
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 48,
          color: colors.white,
          opacity: btn,
          transform: `scale(${btn * dip})`,
        }}
      >
        <span style={{ display: "inline-block", transform: `translateY(${arrow}px)` }}>↓</span>
        PDF indir
      </div>
      <Cursor
        appearAt={20}
        clickAt={PDF_CLICK}
        keyframes={[
          { frame: 20, x: 960, y: 1340 },
          { frame: PDF_CLICK - 4, x: 850, y: 1150 },
        ]}
      />
    </AbsoluteFill>
  );
};

export const S4Esenlik: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mug = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <div style={{ marginTop: 260 }}>
        <Mug scale={0.9 * mug} />
      </div>
      <Headline lines={["Esenliğin de", "işinin parçası."]} top={880} fontSize={112} delay={8} />
    </AbsoluteFill>
  );
};

export const S5Kapanis: React.FC = () => <EndCard product="STUDIO" />;
