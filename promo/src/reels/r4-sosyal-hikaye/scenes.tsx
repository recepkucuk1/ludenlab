import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BookOpen, Hourglass, Printer } from "lucide-react";
import { colors, fonts } from "../../brand";
import { Cursor } from "../../lib/Cursor";
import { PosterCard } from "../../lib/PosterCard";
import { ToolHeader } from "../../lib/ToolHeader";
import { EndCard } from "../../reels-lib/EndCard";
import { Headline } from "../../reels-lib/Headline";
import { SENTENCE_TYPE, r4Story } from "./story";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const S1Zor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12 } });
  // Kum saati iki kez ters döner
  const flip = interpolate(frame % 45, [25, 40], [0, 180], clamp) + Math.floor(frame / 45) * 180;
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <PosterCard
        radius={60}
        style={{
          marginTop: 320,
          width: 420,
          height: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: pop,
          transform: `scale(${0.6 + 0.4 * pop})`,
        }}
      >
        <div style={{ transform: `rotate(${flip}deg)` }}>
          <Hourglass size={240} color={colors.orange} strokeWidth={2} />
        </div>
      </PosterCard>
      <Headline lines={["Sıra beklemek", "çok zor."]} top={940} fontSize={124} delay={10} />
    </AbsoluteFill>
  );
};

const SITUATIONS = ["Sıra bekleme", "Selamlaşma", "Paylaşma", "Yardım isteme"];
const ENVIRONMENTS = ["Okul", "Park", "Market"];
const PICK_AT = 30;

const Chip: React.FC<{ label: string; active: boolean; activeBg: string; progress: number }> = ({
  label,
  active,
  activeBg,
  progress,
}) => (
  <span
    style={{
      fontFamily: fonts.body,
      fontWeight: 700,
      fontSize: 36,
      padding: "12px 28px",
      borderRadius: 999,
      border: `3px solid ${colors.ink}`,
      background: active ? activeBg : colors.white,
      color: active ? colors.white : colors.ink,
      opacity: progress,
      transform: `scale(${0.6 + 0.4 * progress})`,
      display: "inline-block",
    }}
  >
    {label}
  </span>
);

const labelStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontWeight: 700,
  fontSize: 30,
  letterSpacing: 6,
  color: colors.gray,
  alignSelf: "flex-start",
  marginLeft: 90,
};

export const S2Durum: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number) => spring({ frame: frame - d, fps, config: { damping: 13 } });
  const picked = frame >= PICK_AT;
  const env = s(PICK_AT + 6);
  const title = spring({ frame: frame - PICK_AT - 22, fps, config: { damping: 11 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", paddingTop: 240 }}>
      <ToolHeader icon={<BookOpen size={52} strokeWidth={2.4} />} title="Sosyal Hikaye" />
      <div style={{ ...labelStyle, marginTop: 50, opacity: s(4) }}>SOSYAL DURUM</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, width: 900, marginTop: 16 }}>
        {SITUATIONS.map((t, i) => (
          <Chip key={t} label={t} active={i === 0 && picked} activeBg={colors.orange} progress={s(6 + i * 3)} />
        ))}
      </div>
      <div style={{ ...labelStyle, marginTop: 40, opacity: env }}>ORTAM</div>
      <div style={{ display: "flex", gap: 16, width: 900, marginTop: 16 }}>
        {ENVIRONMENTS.map((t, i) => (
          <Chip key={t} label={t} active={i === 2} activeBg={colors.studioBlue} progress={env} />
        ))}
      </div>
      <PosterCard
        bg={colors.paleBlue}
        style={{
          marginTop: 56,
          width: 900,
          padding: "30px 36px",
          opacity: title,
          transform: `translateY(${(1 - title) * 60}px) rotate(${-1.5 * title}deg)`,
        }}
      >
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 28, letterSpacing: 4, color: colors.studioBlue }}>
          CAROL GRAY FORMATI
        </div>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 64, color: colors.ink, marginTop: 8 }}>
          {r4Story.title}
        </div>
      </PosterCard>
      <Cursor
        appearAt={8}
        clickAt={PICK_AT}
        keyframes={[
          { frame: 8, x: 760, y: 1250 },
          { frame: PICK_AT - 4, x: 200, y: 455 },
        ]}
      />
    </AbsoluteFill>
  );
};

/** Ürün arayüzündeki rozet eşlemesi (mavi / mürekkep / turuncu / sarı), marka tonlarıyla. */
const BADGE: Record<string, { bg: string; fg: string }> = {
  descriptive: { bg: colors.paleBlue, fg: colors.studioBlue },
  perspective: { bg: colors.cream, fg: colors.ink },
  directive: { bg: colors.cream, fg: colors.orange },
  affirmative: { bg: colors.logoCream, fg: colors.amber },
};

export const S3Cumleler: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", paddingTop: 220 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 440px)", gap: 28 }}>
        {r4Story.sentences.map((st, i) => {
          const p = spring({ frame: frame - i * 7, fps, config: { damping: 12 } });
          const b = BADGE[st.type];
          return (
            <PosterCard
              key={st.type}
              style={{
                padding: 16,
                opacity: p,
                transform: `translateY(${(1 - p) * 120}px) rotate(${(i % 2 ? 1.2 : -1.2) * p}deg)`,
              }}
            >
              <Img src={staticFile(st.file)} style={{ width: "100%", height: 330, objectFit: "cover", borderRadius: 14, display: "block" }} />
              <span
                style={{
                  display: "inline-block",
                  marginTop: 12,
                  fontFamily: fonts.body,
                  fontWeight: 700,
                  fontSize: 22,
                  padding: "4px 14px",
                  borderRadius: 999,
                  background: b.bg,
                  color: b.fg,
                  border: `2px solid ${b.fg}`,
                }}
              >
                {SENTENCE_TYPE[st.type].label}
              </span>
              <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 26, lineHeight: 1.3, color: colors.ink, marginTop: 8, height: 102 }}>
                {st.text}
              </div>
            </PosterCard>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const PRINT_AT = 34;

export const S4Pdf: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const page = spring({ frame, fps, config: { damping: 14 } });
  const btn = spring({ frame: frame - 14, fps, config: { damping: 11 } });
  const dip = interpolate(frame, [PRINT_AT - 4, PRINT_AT, PRINT_AT + 6], [1, 0.9, 1], clamp);
  const badge = spring({ frame: frame - PRINT_AT - 6, fps, config: { damping: 9, stiffness: 170 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <PosterCard
        radius={16}
        shadow={12}
        style={{
          marginTop: 230,
          width: 900,
          height: 1000,
          overflow: "hidden",
          opacity: page,
          transform: `translateY(${(1 - page) * 400}px) rotate(${-1.2 * page}deg)`,
        }}
      >
        <Img src={staticFile("real/r4-hikaye.png")} style={{ width: 960, display: "block", marginLeft: -30, marginTop: -30 }} />
      </PosterCard>
      <div
        style={{
          position: "absolute",
          top: 250,
          right: 70,
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 40,
          color: colors.white,
          background: colors.studioBlue,
          border: `4px solid ${colors.ink}`,
          borderRadius: 999,
          padding: "12px 30px",
          opacity: frame < PRINT_AT + 6 ? 0 : 1,
          transform: `rotate(6deg) scale(${badge})`,
        }}
      >
        Öğrencine özel
      </div>
      <div
        style={{
          position: "absolute",
          left: 600,
          top: 1110,
          display: "flex",
          alignItems: "center",
          gap: 16,
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
        <Printer size={48} strokeWidth={2.6} />
        Yazdır
      </div>
      <Cursor
        appearAt={16}
        clickAt={PRINT_AT}
        keyframes={[
          { frame: 16, x: 980, y: 1400 },
          { frame: PRINT_AT - 4, x: 780, y: 1150 },
        ]}
      />
    </AbsoluteFill>
  );
};

export const S5Kendi: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 11 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <PosterCard
        style={{
          marginTop: 250,
          padding: 18,
          opacity: pop,
          transform: `scale(${0.7 + 0.3 * pop}) rotate(${-4 + 4 * pop + Math.sin(frame / 16) * 1.5}deg)`,
        }}
      >
        <Img src={staticFile(r4Story.sentences[3].file)} style={{ width: 520, height: 520, objectFit: "cover", borderRadius: 16, display: "block" }} />
      </PosterCard>
      <Headline lines={["Her çocuğa", "kendi hikayesi."]} top={930} fontSize={120} delay={8} />
    </AbsoluteFill>
  );
};

export const S6Kapanis: React.FC = () => <EndCard product="STUDIO" />;
