import React from "react";
import { Img, staticFile } from "remotion";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { colors, fonts } from "../brand";
import { R5_COUNTS, R5_MEB } from "../reels/r5-meb-atolye/plan";
import { Deco, Headline, Hi, PAD, Paper, Pill, PostFrame, Logo, Mark } from "./kit";

export const Sub: React.FC<{ children: React.ReactNode; color?: string; top: number; width?: number }> = ({ children, color = colors.gray, top, width = 860 }) => (
  <div style={{ position: "absolute", top, left: PAD, width, fontFamily: fonts.body, fontWeight: 500, fontSize: 36, lineHeight: 1.3, color }}>
    {children}
  </div>
);

export const UiCard: React.FC<{ style?: React.CSSProperties; rotate?: number; children: React.ReactNode }> = ({ style, rotate = 0, children }) => (
  <div
    style={{
      position: "absolute",
      background: colors.white,
      border: `3px solid ${colors.ink}`,
      borderRadius: 22,
      boxShadow: `10px 10px 0 ${colors.ink}`,
      padding: "26px 30px",
      transform: `rotate(${rotate}deg)`,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 20, letterSpacing: 3, color: colors.gray, marginBottom: 8 }}>{children}</div>
);

export const Field: React.FC<{ children: React.ReactNode; done?: boolean }> = ({ children, done }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      border: `2.5px solid ${colors.ink}`,
      borderRadius: 14,
      padding: "12px 16px",
      fontFamily: fonts.body,
      fontWeight: 700,
      fontSize: 25,
      color: colors.ink,
      background: colors.white,
    }}
  >
    <span style={{ flex: 1 }}>{children}</span>
    {done ? <Check size={28} color={colors.green} strokeWidth={3} /> : <ChevronDown size={28} strokeWidth={3} />}
  </div>
);

export const Button: React.FC<{ bg: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ bg, children, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      background: bg,
      color: colors.white,
      border: `3px solid ${colors.ink}`,
      boxShadow: `5px 5px 0 ${colors.ink}`,
      borderRadius: 14,
      padding: "14px 24px",
      fontFamily: fonts.body,
      fontWeight: 700,
      fontSize: 26,
      ...style,
    }}
  >
    <Sparkles size={26} strokeWidth={2.6} />
    {children}
  </div>
);

/* 1 — Lansman */
export const P1Lansman: React.FC = () => (
  <PostFrame bg={colors.darkTeal} dark>
    <Deco
      items={[

        { x: 70, y: 700, size: 60, kind: "circle", color: colors.orange },
      ]}
    />
    <Mark size={170} style={{ position: "absolute", right: 70, top: 50, transform: "rotate(-8deg)" }} />
    <div style={{ position: "absolute", top: 190, left: PAD }}>
      <Pill bg={colors.orange}>YAYINDA</Pill>
    </div>
    <Headline color={colors.logoCream} size={112} style={{ position: "absolute", top: 270, left: PAD }}>
      Materyal yükünü
      <br />
      <Hi>paylaşalım.</Hi>
    </Headline>
    <Sub top={530} color={colors.logoCream} width={880}>
      Yapay zekâ destekli LudenLab, özel eğitimde çalışan uzmanlar için yayında.
    </Sub>
    {[
      { name: "Studio", line: "Dil ve konuşma alanında çalışan uzmanlar için", accent: colors.studioBlue, src: "real/r2-kart.png", x: PAD, rot: -3 },
      { name: "Atölye", line: "Özel eğitim öğretmenleri için", accent: colors.orange, src: "real/r5-taslak.png", x: 555, rot: 3 },
    ].map((m) => (
      <div key={m.name} style={{ position: "absolute", left: m.x, top: 700, width: 450, transform: `rotate(${m.rot}deg)` }}>
        <div
          style={{
            background: colors.cream,
            border: `3px solid ${colors.ink}`,
            borderRadius: 24,
            boxShadow: `12px 12px 0 ${colors.ink}`,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "26px 28px 20px", borderBottom: `3px solid ${colors.ink}`, background: m.accent }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 64, color: colors.white, lineHeight: 1 }}>{m.name}</div>
            <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 24, color: colors.white, marginTop: 8, height: 62 }}>{m.line}</div>
          </div>
          <div style={{ height: 300, overflow: "hidden", background: colors.white }}>
            <Img src={staticFile(m.src)} style={{ width: 450, display: "block", marginTop: -20 }} />
          </div>
        </div>
      </div>
    ))}
  </PostFrame>
);

/* 2 — Studio · Öğrenme Kartı */
export const P2OgrenmeKarti: React.FC = () => (
  <PostFrame product="STUDIO">
    <Headline style={{ position: "absolute", top: 170, left: PAD }}>
      Hedefini yaz,
      <br />
      kartın <Hi color={colors.studioBlue}>hazırlansın.</Hi>
    </Headline>
    <Sub top={380}>Amaç, materyaller, uygulama adımları, etkinlikler ve uzman notları — tek seans kartında.</Sub>
    <Deco items={[{ x: 990, y: 560, size: 70, kind: "circle", color: colors.orange }, { x: 110, y: 1180, size: 54, kind: "plus", color: colors.studioBlue, rot: 15 }]} />
    <Paper src="real/r2-kart.png" width={600} cropTop={60} cropHeight={1640} rotate={3} style={{ left: 400, top: 560 }} />
    <UiCard rotate={-3} style={{ left: PAD, top: 700, width: 440 }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 34, color: colors.ink, marginBottom: 18 }}>Öğrenme Kartı</div>
      <Label>ALAN</Label>
      <Field done>Konuşma · 3–6 yaş</Field>
      <div style={{ height: 16 }} />
      <Label>HEDEF</Label>
      <div
        style={{
          border: `2.5px solid ${colors.ink}`,
          borderRadius: 14,
          padding: "12px 16px",
          fontFamily: fonts.body,
          fontWeight: 500,
          fontSize: 25,
          lineHeight: 1.3,
          minHeight: 96,
        }}
      >
        /s/ sesini kelime başında üretir<span style={{ color: colors.studioBlue, fontWeight: 700 }}>|</span>
      </div>
      <Button bg={colors.studioBlue} style={{ marginTop: 22 }}>
        Kartı oluştur
      </Button>
    </UiCard>
  </PostFrame>
);

/* 3 — Studio · Artikülasyon */
const Tile: React.FC<{ file: string; word: string; x: number; y: number; rot: number; size?: number }> = ({ file, word, x, y, rot, size = 210 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: size,
      background: colors.white,
      border: `3px solid ${colors.ink}`,
      borderRadius: 20,
      boxShadow: `8px 8px 0 ${colors.ink}`,
      transform: `rotate(${rot}deg)`,
      padding: 14,
      textAlign: "center",
    }}
  >
    <Img src={staticFile(file)} style={{ width: size - 34, height: size - 34, objectFit: "contain", display: "block", margin: "0 auto" }} />
    <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 30, color: colors.ink, marginTop: 4 }}>{word}</div>
  </div>
);

export const P3Artikulasyon: React.FC = () => (
  <PostFrame product="STUDIO">
    <Headline size={104} style={{ position: "absolute", top: 170, left: PAD }}>
      Görsel avı
      <br />
      <Hi color={colors.studioBlue}>bitti.</Hi>
    </Headline>
    <div style={{ position: "absolute", top: 205, right: PAD, transform: "rotate(4deg)" }}>
      <UiCard style={{ position: "relative", padding: "18px 24px" }}>
        <Label>HEDEF SES</Label>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 72, color: colors.studioBlue, lineHeight: 1 }}>/r/</span>
          <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 26 }}>kelime başı</span>
        </div>
      </UiCard>
    </div>
    <Sub top={400}>Sesi seç; resimli artikülasyon çalışma kâğıdın hazır. Vaktin çocuğa kalsın.</Sub>
    <Paper src="real/r3-kagit.png" width={800} cropTop={40} cropHeight={1040} rotate={-2} style={{ left: 140, top: 590 }} />
    <Tile file="real/r3/robot.png" word="robot" x={72} y={930} rot={-8} size={200} />
    <Tile file="real/r3/roket.png" word="roket" x={820} y={520} rot={9} size={200} />
    <Tile file="real/r3/ruzgar.png" word="rüzgâr" x={830} y={930} rot={6} size={190} />
  </PostFrame>
);

/* 4 — Studio · Sosyal Hikaye */
export const P4SosyalHikaye: React.FC = () => (
  <PostFrame product="STUDIO">
    <Headline style={{ position: "absolute", top: 170, left: PAD }}>
      Her çocuğa
      <br />
      kendi <Hi color={colors.studioBlue}>hikayesi.</Hi>
    </Headline>
    <Sub top={380}>Durumu anlat; resimli sosyal hikaye, uzman notları ve veli rehberiyle birlikte gelsin.</Sub>
    <Deco items={[{ x: 1000, y: 1150, size: 90, kind: "ring", color: colors.orange }, { x: 70, y: 560, size: 46, kind: "square", color: colors.studioBlue, rot: 12 }]} />
    <Paper src="real/r4-hikaye.png" width={560} cropTop={60} cropHeight={1720} rotate={-4} style={{ left: PAD + 10, top: 590 }} />
    <div
      style={{
        position: "absolute",
        left: 560,
        top: 640,
        width: 440,
        background: colors.white,
        border: `3px solid ${colors.ink}`,
        borderRadius: 24,
        boxShadow: `12px 12px 0 ${colors.ink}`,
        transform: "rotate(3deg)",
        overflow: "hidden",
      }}
    >
      <Img src={staticFile("real/r4/s4.png")} style={{ width: 434, height: 400, objectFit: "cover", display: "block", borderBottom: `3px solid ${colors.ink}` }} />
      <div style={{ padding: "18px 22px 24px" }}>
        <span
          style={{
            background: "#fde8dc",
            color: "#c2410c",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 20,
            padding: "5px 14px",
            borderRadius: 999,
          }}
        >
          Olumlu
        </span>
        <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 28, lineHeight: 1.3, marginTop: 12, color: colors.ink }}>
          Sıramı beklediğimde kendimle gurur duyarım.
        </div>
      </div>
    </div>
  </PostFrame>
);

/* 5 — Atölye · MEB hedefinden seans planı */
export const P5AtolyeSeans: React.FC = () => (
  <PostFrame product="ATÖLYE">
    <Headline style={{ position: "absolute", top: 170, left: PAD }}>
      MEB hedefinden
      <br />
      <Hi>seans planına.</Hi>
    </Headline>
    <Sub top={380}>
      {R5_COUNTS.hedef} hedef, {R5_COUNTS.davranis} hedef davranış resmî kodlarıyla seçilir; seans planı taslağın hazırlanır.
    </Sub>
    <Paper src="real/r5-taslak.png" width={580} cropTop={60} cropHeight={1900} rotate={3} style={{ left: 430, top: 560 }}>
      <div
        style={{
          position: "absolute",
          left: 110,
          top: 330,
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 84,
          color: colors.orange,
          border: `8px solid ${colors.orange}`,
          borderRadius: 18,
          padding: "0 30px",
          background: "rgba(255,255,255,0.9)",
          transform: "rotate(-12deg)",
        }}
      >
        TASLAK
      </div>
    </Paper>
    <UiCard rotate={-2.5} style={{ left: PAD - 10, top: 580, width: 470 }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 34, color: colors.ink, marginBottom: 16 }}>Seans Planı</div>
      <Label>MODÜL</Label>
      <Field done>
        {R5_MEB.modul.no} · {R5_MEB.modul.ad}
      </Field>
      <div style={{ height: 12 }} />
      <Label>BÖLÜM</Label>
      <Field done>
        {R5_MEB.bolum.kod} · {R5_MEB.bolum.ad}
      </Field>
      <div style={{ height: 12 }} />
      <Label>HEDEF</Label>
      <Field done>
        {R5_MEB.hedef.kod} · {R5_MEB.hedef.metin}
      </Field>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        {R5_MEB.davranislar.map((d) => (
          <div key={d.kod} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: fonts.body, fontSize: 21, lineHeight: 1.25 }}>
            <span
              style={{
                width: 28,
                height: 28,
                flexShrink: 0,
                borderRadius: 7,
                background: colors.green,
                border: `2px solid ${colors.ink}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={20} color={colors.white} strokeWidth={3.5} />
            </span>
            <span>
              <b>{d.kod}</b> {d.metin}
            </span>
          </div>
        ))}
      </div>
    </UiCard>
    <div
      style={{
        position: "absolute",
        right: PAD,
        bottom: 118,
        fontFamily: fonts.body,
        fontWeight: 700,
        fontSize: 30,
        color: colors.ink,
        background: colors.logoCream,
        border: `3px solid ${colors.ink}`,
        borderRadius: 999,
        padding: "8px 22px",
        transform: "rotate(-2deg)",
      }}
    >
      Son söz uzmanın ✍️
    </div>
  </PostFrame>
);

/* 6 — Kapanış */
export const P6Kapanis: React.FC = () => (
  <PostFrame bg={colors.darkTeal} dark>
    <Deco
      items={[
        { x: 170, y: 300, size: 90, kind: "circle", color: colors.orange },
        { x: 920, y: 260, size: 70, kind: "square", color: colors.studioBlue, rot: 14 },
        { x: 560, y: 330, size: 48, kind: "ring", color: colors.orange },
        { x: 880, y: 1000, size: 44, kind: "plus", color: colors.orange, rot: 10 },
        { x: 130, y: 1080, size: 60, kind: "plus", color: colors.logoCream },
        { x: 960, y: 1150, size: 110, kind: "ring", color: colors.lightBlueText },
        { x: 250, y: 1190, size: 70, kind: "square", color: colors.orange, rot: -10 },
      ]}
    />
    <div style={{ position: "absolute", top: 400, left: 0, right: 0, textAlign: "center" }}>
      <Logo dark height={290} style={{ margin: "0 auto" }} />
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 56, color: colors.logoCream, marginTop: 36, lineHeight: 1.15 }}>
        Hazırlık bizden,
        <br />
        vakit çocuğa.
      </div>
      <div
        style={{
          display: "inline-block",
          marginTop: 44,
          background: colors.orange,
          color: colors.white,
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 54,
          padding: "18px 48px",
          borderRadius: 20,
          border: `3px solid ${colors.ink}`,
          boxShadow: `8px 8px 0 ${colors.ink}`,
        }}
      >
        ludenlab.com
      </div>
    </div>
  </PostFrame>
);
