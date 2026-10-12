import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CalendarDays, Check, ChevronDown, FileQuestion } from "lucide-react";
import { colors, fonts } from "../../brand";
import { Cursor } from "../../lib/Cursor";
import { PosterCard } from "../../lib/PosterCard";
import { EndCard } from "../../reels-lib/EndCard";
import { Headline } from "../../reels-lib/Headline";
import { R5_COUNTS, R5_FLOW, R5_MEB } from "./plan";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Atölye aksanı turuncu; başlık ikonu kutusu Studio'nun mavi ToolHeader'ı yerine turuncu. */
const AtolyeHeader: React.FC<{ title: string; progress: number }> = ({ title, progress }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 26, opacity: progress, transform: `translateY(${(1 - progress) * 40}px)` }}>
    <div
      style={{
        width: 92,
        height: 92,
        borderRadius: 24,
        background: colors.orange,
        border: `3px solid ${colors.ink}`,
        boxShadow: `6px 6px 0 ${colors.ink}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: colors.white,
      }}
    >
      <CalendarDays size={50} strokeWidth={2.4} />
    </div>
    <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 72, color: colors.ink }}>{title}</div>
  </div>
);

export const S1Plan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const goal = spring({ frame, fps, config: { damping: 13 } });
  const doc = spring({ frame: frame - 10, fps, config: { damping: 13 } });
  const wobble = Math.sin(frame / 5) * 4;
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <PosterCard
        bg={colors.white}
        style={{ marginTop: 250, width: 880, padding: "26px 34px", opacity: goal, transform: `translateX(${(1 - goal) * -160}px) rotate(-2deg)` }}
      >
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 28, letterSpacing: 4, color: colors.green }}>
          BEP HEDEFİ ✓
        </div>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 46, color: colors.ink, marginTop: 8 }}>
          {R5_MEB.hedef.metin}
        </div>
      </PosterCard>
      <PosterCard
        style={{
          marginTop: 40,
          width: 520,
          height: 380,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: doc,
          transform: `translateY(${(1 - doc) * 120}px) rotate(${2 + wobble * 0.3}deg)`,
        }}
      >
        <div style={{ transform: `rotate(${wobble}deg)` }}>
          <FileQuestion size={200} color={colors.orange} strokeWidth={1.8} />
        </div>
      </PosterCard>
      <Headline lines={["Hedef belli.", "Plan nerede?"]} top={1060} fontSize={112} delay={14} />
    </AbsoluteFill>
  );
};

/** Açılır liste: seçim anına kadar boş, sonra değer yazılır ve yeşil tik. */
const Dropdown: React.FC<{ label: string; value: string; pickAt: number; appearAt: number }> = ({ label, value, pickAt, appearAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - appearAt, fps, config: { damping: 13 } });
  const picked = frame >= pickAt;
  const flash = interpolate(frame, [pickAt, pickAt + 10], [1, 0], clamp);
  return (
    <div style={{ width: 900, opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 30, letterSpacing: 4, color: colors.gray, marginBottom: 10 }}>{label}</div>
      <PosterCard
        shadow={6}
        bg={picked ? colors.white : colors.cream}
        style={{
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          outline: flash > 0 ? `${8 * flash}px solid ${colors.orange}` : undefined,
        }}
      >
        <span style={{ flex: 1, fontFamily: fonts.body, fontWeight: 700, fontSize: 38, color: picked ? colors.ink : colors.gray }}>
          {picked ? value : `${label} seçin…`}
        </span>
        {picked ? <Check size={42} color={colors.green} strokeWidth={3} /> : <ChevronDown size={42} color={colors.ink} strokeWidth={3} />}
      </PosterCard>
    </div>
  );
};

const PICKS = [26, 46, 66];

export const S2Meb: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = spring({ frame, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", paddingTop: 220, gap: 26 }}>
      <AtolyeHeader title="Seans Planı" progress={head} />
      <Dropdown label="Modül" value={`${R5_MEB.modul.no} · ${R5_MEB.modul.ad}`} appearAt={6} pickAt={PICKS[0]} />
      <Dropdown label="Bölüm" value={`${R5_MEB.bolum.kod} · ${R5_MEB.bolum.ad}`} appearAt={12} pickAt={PICKS[1]} />
      <Dropdown label="Hedef" value={`${R5_MEB.hedef.kod} · ${R5_MEB.hedef.metin}`} appearAt={18} pickAt={PICKS[2]} />
      <div style={{ width: 900, display: "flex", flexDirection: "column", gap: 10 }}>
        {R5_MEB.davranislar.map((d, i) => {
          const at = PICKS[2] + 12 + i * 8;
          const p = spring({ frame: frame - at, fps, config: { damping: 12 } });
          return (
            <div key={d.kod} style={{ display: "flex", alignItems: "center", gap: 16, opacity: p, transform: `translateX(${(1 - p) * -60}px)` }}>
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  border: `3px solid ${colors.ink}`,
                  background: colors.green,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Check size={30} color={colors.white} strokeWidth={3.5} />
              </span>
              <span style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 30, color: colors.ink }}>
                <b>{d.kod}</b> {d.metin}
              </span>
            </div>
          );
        })}
      </div>
      <Cursor
        appearAt={14}
        clickAt={PICKS[0]}
        keyframes={[
          { frame: 14, x: 900, y: 1300 },
          { frame: PICKS[0] - 4, x: 820, y: 395 },
          { frame: PICKS[1] - 4, x: 820, y: 575 },
          { frame: PICKS[2] - 4, x: 820, y: 755 },
        ]}
      />
    </AbsoluteFill>
  );
};

const STAMP_AT = 40;

export const S3Taslak: React.FC = () => {
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
          marginTop: 220,
          width: 900,
          height: 760,
          overflow: "hidden",
          opacity: page,
          transform: `translateY(${(1 - page) * 400 + shake}px) rotate(${-1.2 * page}deg)`,
        }}
      >
        <Img src={staticFile("real/r5-taslak.png")} style={{ width: 960, display: "block", marginLeft: -30, marginTop: -20 }} />
      </PosterCard>
      <div style={{ position: "absolute", top: 1000, left: 90, right: 90, display: "flex", gap: 10 }}>
        {R5_FLOW.map((f, i) => {
          const p = spring({ frame: frame - 14 - i * 5, fps, config: { damping: 12 } });
          const main = f.ad.startsWith("Ana");
          return (
            <div
              key={f.ad}
              style={{
                // Dakikaya orantılı genişlik kısa adımları okunmaz kılıyordu: ana etkinlikler biraz geniş, diğerleri eşit.
                flex: main ? 1.5 : 1,
                minWidth: 0,
                height: 120,
                borderRadius: 16,
                border: `3px solid ${colors.ink}`,
                background: main ? colors.orange : colors.white,
                color: main ? colors.white : colors.ink,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: fonts.body,
                fontWeight: 700,
                opacity: p,
                transform: `scaleY(${p})`,
                transformOrigin: "bottom",
              }}
            >
              <span style={{ fontSize: 24, whiteSpace: "nowrap" }}>
                {f.ad.replace(" 1", "").replace(" 2", "")}
              </span>
              <span style={{ fontSize: 34 }}>{f.dk} dk</span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 520,
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 120,
          color: colors.orange,
          border: `10px solid ${colors.orange}`,
          borderRadius: 24,
          padding: "4px 44px",
          background: "rgba(255,255,255,0.88)",
          opacity: frame < STAMP_AT ? 0 : 1,
          transform: `translate(-50%, 0) rotate(-10deg) scale(${1 + (1 - stamp) * 1.6})`,
        }}
      >
        TASLAK
      </div>
      <div
        style={{
          position: "absolute",
          top: 1150,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 38,
          color: colors.ink,
          opacity: spring({ frame: frame - STAMP_AT - 10, fps, config: { damping: 13 } }),
        }}
      >
        Son söz uzmanın ✍️
      </div>
    </AbsoluteFill>
  );
};

export const S4Cocuk: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = Math.round(interpolate(frame, [4, 40], [0, R5_COUNTS.hedef], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 }));
  const count2 = Math.round(interpolate(frame, [10, 46], [0, R5_COUNTS.davranis], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 }));
  const card = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <div style={{ display: "flex", gap: 30, marginTop: 300, opacity: card, transform: `scale(${0.7 + 0.3 * card})` }}>
        {[
          { n: count, label: "MEB hedefi" },
          { n: count2, label: "hedef davranış" },
        ].map((c, i) => (
          <PosterCard key={c.label} bg={i === 0 ? colors.orange : colors.white} style={{ width: 400, padding: "34px 20px", textAlign: "center", transform: `rotate(${i ? 2 : -2}deg)` }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 130, lineHeight: 1, color: i === 0 ? colors.white : colors.ink }}>{c.n}</div>
            <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 36, marginTop: 10, color: i === 0 ? colors.white : colors.gray }}>{c.label}</div>
          </PosterCard>
        ))}
      </div>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 32, color: colors.gray, marginTop: 34, opacity: card }}>
        resmî kodlarıyla
      </div>
      <Headline lines={["Evrakla değil,", "çocukla geçen bir gün."]} top={960} fontSize={84} delay={12} />
    </AbsoluteFill>
  );
};

export const S5Kapanis: React.FC = () => <EndCard product="ATÖLYE" />;
