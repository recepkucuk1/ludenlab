import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import type { V2 } from "./izometri.ts";
import { NoktaliCizgi, Raptiye } from "./sahne3b.tsx";
import { FONT, RENK, TUVAL_169 } from "./tema.ts";

const IZGARA = "rgba(14,30,38,0.055)";

/** Krem zemin + 60 px ızgara + yumuşak ışık + gren. isik: ışığın yatay konumu (0–1); kayma: ızgaranın kayması (px). */
export const Zemin: React.FC<{ isik?: number; kayma?: number }> = ({ isik = 0.7, kayma = 0 }) => (
  <AbsoluteFill style={{ background: RENK.krem }}>
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${IZGARA} 1.5px, transparent 1.5px), linear-gradient(90deg, ${IZGARA} 1.5px, transparent 1.5px)`,
        backgroundSize: "60px 60px",
        backgroundPosition: `${kayma * 0.866}px ${kayma * 0.5}px`,
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
      // Logo SVG'sinin sol iç boşluğu 102 px yükseklikte ≈8 px (20,5/260×102); yazı metin sütunuyla hizalansın.
      left: TUVAL_169.sol - 8,
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

// Soldan sağa yumuşak kenarlı maske: p = 0 gizli, 1 tam açık (LudenMain kagit.tsx). Taşan harf parçaları da
// maskenin içinde kalsın diye kutu dikeyde 0,2em büyütülüp aynı kadar geri çekilir (kapsayıcı flex sütun).
// p = 1'de maske hiç uygulanmaz: tam açık metin maskesiz çizilir.
const maske = (p: number): React.CSSProperties => {
  if (p >= 1) return {};
  const x = Math.max(0, p) * 112 - 12;
  const m = `linear-gradient(90deg, #000 ${x}%, transparent ${x + 12}%)`;
  return { WebkitMaskImage: m, maskImage: m, padding: "0.2em 0", margin: "-0.2em 0" };
};

/** Büyük harf başlık (Bricolage 800, teal); her eleman bir satır. acilis: satır başına açılma oranı (0–1). */
export const Baslik: React.FC<{ satirlar: string[]; top: number; boyut?: number; acilis?: number[] }> = ({ satirlar, top, boyut = 104, acilis }) => (
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
    {satirlar.map((s, i) => (
      <div key={i} style={maske(acilis?.[i] ?? 1)}>
        {s}
      </div>
    ))}
  </div>
);

/** Başlığın üstündeki cümle (Satoshi 500); acilis: soldan sağa açılma oranı (0–1). */
export const UstCumle: React.FC<{ metin: string; top: number; acilis?: number }> = ({ metin, top, acilis = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: TUVAL_169.sol,
      top,
      display: "flex",
      flexDirection: "column",
      fontFamily: FONT.govde,
      fontWeight: 500,
      fontSize: 44,
      lineHeight: 1.3,
      color: RENK.ink,
      opacity: 0.85,
    }}
  >
    <div style={maske(acilis)}>{metin}</div>
  </div>
);

export type Hiza = "sol" | "sag";

/** Hap çip. hiza "sol": sol kenarı x'te; "sag": sağ kenarı x'te. Dikeyde y'ye ortalı. nokta: modül rengi.
 *  gorunum: 0–1 bulanıktan netleşme (spec: 16 px → 0 + opaklık). */
export const Cip: React.FC<{ x: number; y: number; metin: string; hiza?: Hiza; nokta?: string; gorunum?: number }> = ({ x, y, metin, hiza = "sol", nokta, gorunum = 1 }) => {
  const { width } = useVideoConfig();
  if (gorunum <= 0) return null;
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
        opacity: gorunum,
        filter: gorunum < 1 ? `blur(${(1 - gorunum) * 16}px)` : undefined,
      }}
    >
      {nokta ? <span style={{ width: 16, height: 16, borderRadius: 8, background: nokta, border: `2px solid ${RENK.ink}`, boxSizing: "border-box" }} /> : null}
      {metin}
    </div>
  );
};

/**
 * Noktalı etiket: çipin hizalı kenarından (x, y) çapaya çizgi; çizgi vardığında çapada raptiye.
 * gorunum: çipin netleşmesi (0–1); ilerleme: çizginin çapaya ilerlemesi (0–1).
 */
export const Etiket: React.FC<{ capa: V2; x: number; y: number; metin: string; hiza?: Hiza; nokta?: string; gorunum?: number; ilerleme?: number }> = ({
  capa,
  x,
  y,
  metin,
  hiza,
  nokta,
  gorunum = 1,
  ilerleme = 1,
}) => {
  const { width, height } = useVideoConfig();
  return (
    <>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <NoktaliCizgi a={[x, y]} b={capa} ilerleme={ilerleme} />
        {ilerleme >= 1 ? <Raptiye p={capa} /> : null}
      </svg>
      <Cip x={x} y={y} metin={metin} hiza={hiza} nokta={nokta} gorunum={gorunum} />
    </>
  );
};
