import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AudioLines, Search } from "lucide-react";
import { colors, fonts } from "../../brand";
import { Cursor } from "../../lib/Cursor";
import { PosterCard } from "../../lib/PosterCard";
import { ToolHeader } from "../../lib/ToolHeader";
import { EndCard } from "../../reels-lib/EndCard";
import { Headline } from "../../reels-lib/Headline";
import { R3_WORDS } from "./words";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Dağınık arama sekmeleri: x, y, açı, gecikme, sorgu. */
const TABS = [
  { x: 80, y: 260, r: -6, d: 0, q: "r ile başlayan kelimeler" },
  { x: 300, y: 420, r: 4, d: 6, q: "robot resmi çocuk" },
  { x: 120, y: 580, r: -3, d: 12, q: "roket çizimi" },
  { x: 360, y: 740, r: 7, d: 18, q: "radyo görseli ücretsiz" },
];

export const S1Arama: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: colors.cream }}>
      {TABS.map((t, i) => {
        const p = spring({ frame: frame - t.d, fps, config: { damping: 13 } });
        const shake = frame > 30 ? Math.sin(frame / 2 + i) * 3 : 0;
        return (
          <PosterCard
            key={i}
            shadow={6}
            style={{
              position: "absolute",
              left: t.x,
              top: t.y,
              width: 640,
              padding: "22px 28px",
              display: "flex",
              alignItems: "center",
              gap: 18,
              opacity: p,
              transform: `translateX(${(1 - p) * -200 + shake}px) rotate(${t.r * p}deg)`,
            }}
          >
            <Search size={40} color={colors.gray} strokeWidth={2.6} />
            <span style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 36, color: colors.ink }}>{t.q}</span>
          </PosterCard>
        );
      })}
      <Headline lines={["/r/ sesi için", "kelime + görsel avı?"]} top={960} fontSize={100} delay={14} />
    </AbsoluteFill>
  );
};

const LIQUIDS = ["/r/", "/l/", "/n/", "/m/"];
const PICK_AT = 34;

export const S2Ses: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number) => spring({ frame: frame - d, fps, config: { damping: 13 } });
  const picked = frame >= PICK_AT;
  const pickPop = spring({ frame: frame - PICK_AT, fps, config: { damping: 8, stiffness: 160 } });
  const pos = s(PICK_AT + 8);
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", paddingTop: 260 }}>
      <ToolHeader icon={<AudioLines size={52} strokeWidth={2.4} />} title="Artikülasyon" />
      <div style={{ ...labelStyle, marginTop: 60, opacity: s(6) }}>HEDEF SES · AKICI</div>
      <div style={{ display: "flex", gap: 26, marginTop: 20 }}>
        {LIQUIDS.map((snd, i) => {
          const p = s(8 + i * 4);
          const isR = i === 0;
          const active = isR && picked;
          return (
            <PosterCard
              key={snd}
              bg={active ? colors.orange : colors.white}
              radius={28}
              style={{
                width: 190,
                height: 190,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: 76,
                color: active ? colors.white : colors.ink,
                opacity: p,
                transform: `scale(${(0.6 + 0.4 * p) * (active ? 1 + 0.12 * (1 - pickPop) : 1)})`,
              }}
            >
              {snd}
            </PosterCard>
          );
        })}
      </div>
      <div style={{ ...labelStyle, marginTop: 70, opacity: pos }}>SES POZİSYONU</div>
      <div style={{ display: "flex", gap: 20, marginTop: 20, opacity: pos, transform: `translateY(${(1 - pos) * 30}px)` }}>
        {["Başta", "Ortada", "Sonda"].map((p, i) => (
          <span
            key={p}
            style={{
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: 42,
              padding: "14px 34px",
              borderRadius: 999,
              border: `3px solid ${colors.ink}`,
              background: i === 0 ? colors.studioBlue : colors.white,
              color: i === 0 ? colors.white : colors.ink,
            }}
          >
            {p}
          </span>
        ))}
      </div>
      <Cursor
        appearAt={12}
        clickAt={PICK_AT}
        keyframes={[
          { frame: 12, x: 700, y: 1250 },
          { frame: PICK_AT - 4, x: 250, y: 640 },
        ]}
      />
    </AbsoluteFill>
  );
};

const labelStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontWeight: 700,
  fontSize: 32,
  letterSpacing: 6,
  color: colors.gray,
};

/** Ürün gibi: hedef harf turuncu, kalın. */
const Highlighted: React.FC<{ word: string }> = ({ word }) => (
  <>
    {word.split("").map((ch, i) => (
      <span key={i} style={ch.toLowerCase() === "r" ? { color: colors.orange, fontWeight: 900 } : undefined}>
        {ch}
      </span>
    ))}
  </>
);

export const S3Kartlar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", paddingTop: 240 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 430px)", gap: 34 }}>
        {R3_WORDS.map((w, i) => {
          const p = spring({ frame: frame - i * 5, fps, config: { damping: 11 } });
          const bob = Math.sin((frame + i * 9) / 14) * 5;
          return (
            <PosterCard
              key={w.word}
              style={{
                height: 330,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: p,
                transform: `translateY(${(1 - p) * 140 + bob}px) scale(${0.7 + 0.3 * p}) rotate(${(i % 2 ? 1.5 : -1.5) * p}deg)`,
              }}
            >
              <Img src={staticFile(w.file)} style={{ width: 220, height: 220, objectFit: "contain" }} />
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 56, color: colors.ink }}>
                <Highlighted word={w.word} />
              </div>
            </PosterCard>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const STAMP_AT = 30;

export const S4Kagit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const page = spring({ frame, fps, config: { damping: 14 } });
  const stamp = spring({ frame: frame - STAMP_AT, fps, config: { damping: 9, stiffness: 180 } });
  const shake = interpolate(frame, [STAMP_AT, STAMP_AT + 3, STAMP_AT + 6], [0, 8, 0], clamp);
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <PosterCard
        radius={16}
        shadow={12}
        style={{
          marginTop: 240,
          width: 900,
          height: 720,
          overflow: "hidden",
          opacity: page,
          transform: `translateY(${(1 - page) * 400 + shake}px) rotate(${1.5 * page}deg)`,
        }}
      >
        <Img src={staticFile("real/r3-kagit.png")} style={{ width: 940, display: "block", marginLeft: -30, marginTop: -30 }} />
      </PosterCard>
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 860,
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 110,
          color: colors.green,
          border: `10px solid ${colors.green}`,
          borderRadius: 24,
          padding: "6px 40px",
          background: "rgba(255,255,255,0.85)",
          opacity: frame < STAMP_AT ? 0 : 1,
          transform: `translate(-50%, 0) rotate(-12deg) scale(${1 + (1 - stamp) * 1.6})`,
        }}
      >
        HAZIR ✓
      </div>
    </AbsoluteFill>
  );
};

export const S5Esenlik: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <div style={{ display: "flex", gap: 30, marginTop: 330 }}>
        {R3_WORDS.slice(0, 3).map((w, i) => {
          const p = spring({ frame: frame - i * 4, fps, config: { damping: 12 } });
          return (
            // Görsellerin beyaz zemini krem arka planda kare gibi durmasın: poster kartına al.
            <PosterCard
              key={w.word}
              style={{
                padding: 16,
                opacity: p,
                transform: `translateY(${(1 - p) * 80 + Math.sin((frame + i * 10) / 12) * 10}px) rotate(${(i - 1) * 4}deg)`,
              }}
            >
              <Img src={staticFile(w.file)} style={{ width: 230, height: 230, objectFit: "contain", display: "block" }} />
            </PosterCard>
          );
        })}
      </div>
      <Headline lines={["Aramaya değil,", "çocuğa vakit ayır."]} top={860} fontSize={108} delay={10} />
    </AbsoluteFill>
  );
};

export const S6Kapanis: React.FC = () => <EndCard product="STUDIO" />;
