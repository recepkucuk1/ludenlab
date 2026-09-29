import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import type { V2 } from "./izometri.ts";
import { NoktaliCizgi, Raptiye } from "./sahne3b.tsx";
import { CIP, DAMGA_BOYUT, FONT, RENK, TUVAL_169 } from "./tema.ts";

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

/** Sol sütunda satır satır metin: her satır kendi genişliğinde soldan sağa maskeyle açılır (acilis: satır başına 0–1). */
export const MetinBlogu: React.FC<{
  satirlar: string[];
  top: number;
  font: "baslik" | "govde";
  boyut: number;
  agirlik: number;
  renk: string;
  opaklik?: number;
  acilis?: number[];
  genislik?: number;
  sol?: number;
}> = ({ satirlar, top, font, boyut, agirlik, renk, opaklik = 1, acilis, genislik, sol = TUVAL_169.sol }) => (
  <div
    style={{
      position: "absolute",
      left: sol,
      maxWidth: genislik,
      top,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      fontFamily: font === "baslik" ? FONT.baslik : FONT.govde,
      fontWeight: agirlik,
      fontSize: boyut,
      lineHeight: font === "baslik" ? 0.95 : 1.3,
      letterSpacing: font === "baslik" ? "0.005em" : undefined,
      color: renk,
      opacity: opaklik,
    }}
  >
    {satirlar.map((s, i) => (
      <div key={i} style={maske(acilis?.[i] ?? 1)}>
        {s}
      </div>
    ))}
  </div>
);

/** Bölüm kilidi (rehber): krem kare + blursuz ofset gölge içinde numara, yanında büyük harf bölüm adı.
 *  gorunum 0–1: kare haptan kareye dönüşerek bulanıktan netleşir, ad ardından soldan sağa açılır. */
export const Kilit: React.FC<{ numara: string; kelime: string; top: number; gorunum: number }> = ({ numara, kelime, top, gorunum }) => {
  if (gorunum <= 0) return null;
  const kutu = Math.min(1, gorunum * 1.6);
  const ad = Math.max(0, (gorunum - 0.35) / 0.65);
  const r = 62 - 40 * kutu;
  return (
    <>
      <div style={{ position: "absolute", left: TUVAL_169.sol, top, width: 124, height: 124, opacity: kutu, filter: kutu < 1 ? `blur(${(1 - kutu) * 16}px)` : undefined }}>
        <div style={{ position: "absolute", left: 7, top: 7, width: 124, height: 124, borderRadius: r, background: RENK.ink }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: r,
            background: RENK.kagitBeyaz,
            border: `3px solid ${RENK.ink}`,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT.baslik,
            fontWeight: 800,
            fontSize: 58,
            color: RENK.teal,
          }}
        >
          {numara}
        </div>
      </div>
      <MetinBlogu satirlar={[kelime]} top={top + 62 - (112 * 0.95) / 2} sol={TUVAL_169.sol + 162} font="baslik" boyut={112} agirlik={800} renk={RENK.teal} acilis={[ad]} />
    </>
  );
};

/** Ürünün gerçek çıktısı: Poster çerçeveli kart (ink kenar, blursuz ofset gölge), görsel üstten kırpılır.
 *  Konum merkezden; olcek, perspektifli rotateY (derece) ve egim (derece) animasyon içindir. */
export const CiktiKarti: React.FC<{ resim: string; cx: number; cy: number; w: number; h: number; olcek: number; rotY: number; egim: number; opaklik: number }> = ({
  resim,
  cx,
  cy,
  w,
  h,
  olcek,
  rotY,
  egim,
  opaklik,
}) =>
  opaklik <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        opacity: opaklik,
        transform: `perspective(1600px) rotateY(${rotY}deg) rotate(${egim}deg) scale(${olcek})`,
        transformOrigin: "center",
        // rotY ±90°'yi aşarsa kartın arka yüzü (ayna görüntüsü) çizilmesin.
        backfaceVisibility: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 10, top: 10, width: w, height: h, borderRadius: 14, background: RENK.ink }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 14, overflow: "hidden", background: "#ffffff", border: `3px solid ${RENK.ink}`, boxSizing: "border-box" }}>
        <Img src={staticFile(resim)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
      </div>
    </div>
  );

/** TASLAK damgası: ink çerçeveli, eğik; olcek ve opaklık vuruşa iniş içindir. Boyut: DAMGA_BOYUT (olcek 1'de). */
export const Damga: React.FC<{ x: number; y: number; olcek: number; aci: number; opaklik: number; metin: string }> = ({ x, y, olcek, aci, opaklik, metin }) =>
  opaklik <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: x - DAMGA_BOYUT.w / 2,
        top: y - DAMGA_BOYUT.h / 2,
        width: DAMGA_BOYUT.w,
        height: DAMGA_BOYUT.h,
        opacity: opaklik,
        transform: `rotate(${aci}deg) scale(${olcek})`,
        borderRadius: 9,
        border: `5px solid ${RENK.ink}`,
        background: "rgba(255,253,248,0.94)",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT.baslik,
        fontWeight: 800,
        fontSize: 49,
        letterSpacing: "0.09em",
        // Son harften sonra da letterSpacing eklenir: yazı ~2,5 px sola kayardı; aynı boşluk sola konarak ortalanır.
        paddingLeft: "0.09em",
        color: RENK.ink,
      }}
    >
      {metin}
    </div>
  );

/** Çıkış (rehber: bulanıklaşıp derinliğe kaçma, 0 → 20 px, ölçek 1 → 0,9). c: 0 dokunulmaz, 1 hiç çizilmez. */
export const Cikis: React.FC<{ c: number; koken?: string; children: React.ReactNode }> = ({ c, koken = "left center", children }) => {
  if (c >= 1) return null;
  if (c <= 0) return <>{children}</>;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - c, filter: `blur(${20 * c}px)`, transform: `scale(${1 - 0.1 * c})`, transformOrigin: koken }}>
      {children}
    </div>
  );
};

/** Büyük harf başlık (Bricolage 800, teal); her eleman bir satır. acilis: satır başına açılma oranı (0–1). */
export const Baslik: React.FC<{ satirlar: string[]; top: number; boyut?: number; acilis?: number[] }> = ({ satirlar, top, boyut = 104, acilis }) => (
  <MetinBlogu satirlar={satirlar} top={top} font="baslik" boyut={boyut} agirlik={800} renk={RENK.teal} acilis={acilis} />
);

/** Başlığın üstündeki cümle (Satoshi 500); acilis: soldan sağa açılma oranı (0–1). */
export const UstCumle: React.FC<{ metin: string; top: number; acilis?: number }> = ({ metin, top, acilis = 1 }) => (
  <MetinBlogu satirlar={[metin]} top={top} font="govde" boyut={44} agirlik={500} renk={RENK.ink} opaklik={0.85} acilis={[acilis]} />
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
        padding: `0 ${CIP.yan}px`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderRadius: 999,
        background: RENK.kagitBeyaz,
        border: `${CIP.kenar}px solid ${RENK.ink}`,
        boxSizing: "border-box",
        fontFamily: FONT.govde,
        fontWeight: 700,
        fontSize: CIP.boyut,
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
