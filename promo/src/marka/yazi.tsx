import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import type { V2 } from "./izometri.ts";
import { NoktaliCizgi, Raptiye } from "./sahne3b.tsx";
import { FONT, RENK, TUVAL_169 } from "./tema.ts";

const IZGARA = "rgba(14,30,38,0.055)";

/** Krem zemin + 60 px ızgara + yumuşak ışık + gren. isik: ışığın yatay konumu (0–1); animasyonda kayar. */
export const Zemin: React.FC<{ isik?: number }> = ({ isik = 0.7 }) => (
  <AbsoluteFill style={{ background: RENK.krem }}>
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${IZGARA} 1.5px, transparent 1.5px), linear-gradient(90deg, ${IZGARA} 1.5px, transparent 1.5px)`,
        backgroundSize: "60px 60px",
      }}
    />
    <AbsoluteFill style={{ background: `radial-gradient(900px 700px at ${isik * 100}% 38%, rgba(255,255,255,0.55), transparent 70%)` }} />
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.07, mixBlendMode: "multiply" }}>
      <filter id="mk-gren" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={0.8} numOctaves={2} seed={7} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#mk-gren)" />
    </svg>
  </AbsoluteFill>
);

/** Künye: logo sol üstte, adres sağ üstte (Dönüş bölümünden sonra sabit). */
export const Kunye: React.FC<{ opaklik?: number }> = ({ opaklik = 1 }) => (
  <div
    style={{
      position: "absolute",
      // Logo SVG'sinin sol iç boşluğu ~28 px; yazı metin sütunuyla hizalansın.
      left: TUVAL_169.sol - 28,
      right: TUVAL_169.sol,
      top: 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      opacity: opaklik,
    }}
  >
    <Img src={staticFile("brand/ludenlab-logo.svg")} style={{ height: 102 }} />
    <div style={{ fontFamily: FONT.govde, fontWeight: 700, fontSize: 22, letterSpacing: "0.14em", color: RENK.ink, opacity: 0.6 }}>LUDENLAB.COM</div>
  </div>
);

/** Büyük harf başlık (Bricolage 800, teal); her eleman bir satır. */
export const Baslik: React.FC<{ satirlar: string[]; top: number; boyut?: number }> = ({ satirlar, top, boyut = 104 }) => (
  <div
    style={{
      position: "absolute",
      left: TUVAL_169.sol,
      top,
      display: "flex",
      flexDirection: "column",
      fontFamily: FONT.baslik,
      fontWeight: 800,
      fontSize: boyut,
      lineHeight: 0.95,
      letterSpacing: "0.005em",
      color: RENK.teal,
    }}
  >
    {satirlar.map((s) => (
      <div key={s}>{s}</div>
    ))}
  </div>
);

export type Hiza = "sol" | "sag";

/** Hap çip. hiza "sol": sol kenarı x'te; "sag": sağ kenarı x'te. Dikeyde y'ye ortalı. nokta: modül rengi. */
export const Cip: React.FC<{ x: number; y: number; metin: string; hiza?: Hiza; nokta?: string }> = ({ x, y, metin, hiza = "sol", nokta }) => {
  const { width } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        ...(hiza === "sol" ? { left: x } : { right: width - x }),
        transform: "translateY(-50%)",
        height: 54,
        padding: "0 22px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderRadius: 999,
        background: RENK.kagitBeyaz,
        border: `2.5px solid ${RENK.ink}`,
        boxSizing: "border-box",
        fontFamily: FONT.govde,
        fontWeight: 700,
        fontSize: 28,
        color: RENK.ink,
        whiteSpace: "nowrap",
      }}
    >
      {nokta ? <span style={{ width: 16, height: 16, borderRadius: 8, background: nokta, border: `2px solid ${RENK.ink}`, boxSizing: "border-box" }} /> : null}
      {metin}
    </div>
  );
};

/** Noktalı etiket: çapadaki raptiyeden çipin hizalı kenarına (x, y) çizgi. */
export const Etiket: React.FC<{ capa: V2; x: number; y: number; metin: string; hiza?: Hiza; nokta?: string }> = ({ capa, x, y, metin, hiza, nokta }) => {
  const { width, height } = useVideoConfig();
  return (
    <>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <NoktaliCizgi a={capa} b={[x, y]} />
        <Raptiye p={capa} />
      </svg>
      <Cip x={x} y={y} metin={metin} hiza={hiza} nokta={nokta} />
    </>
  );
};
