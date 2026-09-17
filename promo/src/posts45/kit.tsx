import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { colors, fonts } from "../brand";
import { Shape, type ShapeKind } from "../reels-lib/shapes";

/** Instagram 4:5 gönderi boyutu. Profil ızgarası 3:4 kırptığı için kenarlarda ~70px boşluk bırakılır. */
export const POST = { width: 1080, height: 1350 } as const;
export const PAD = 76;

export type Product = "STUDIO" | "ATÖLYE";
export const accentOf = (p?: Product) => (p === "ATÖLYE" ? colors.orange : colors.studioBlue);

export const Wordmark: React.FC<{ size?: number; dark?: boolean }> = ({ size = 44, dark }) => (
  <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: size, lineHeight: 1 }}>
    <span style={{ color: dark ? colors.logoCream : colors.ink }}>Luden</span>
    <span style={{ color: colors.orange }}>Lab</span>
  </span>
);

export const Pill: React.FC<{ bg: string; color?: string; children: React.ReactNode; size?: number }> = ({
  bg,
  color = colors.white,
  children,
  size = 26,
}) => (
  <span
    style={{
      background: bg,
      color,
      fontFamily: fonts.body,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: 4,
      padding: "10px 22px",
      borderRadius: 999,
      border: `3px solid ${colors.ink}`,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

/** Ortak çerçeve: üstte logo + modül rozeti, altta adres. */
export const PostFrame: React.FC<{ product?: Product; bg?: string; dark?: boolean; children: React.ReactNode }> = ({
  product,
  bg = colors.cream,
  dark,
  children,
}) => (
  <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
    {children}
    <div style={{ position: "absolute", top: 60, left: PAD, right: PAD, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Wordmark dark={dark} />
      {product ? <Pill bg={accentOf(product)}>{product}</Pill> : null}
    </div>
    <div
      style={{
        position: "absolute",
        bottom: 52,
        left: PAD,
        right: PAD,
        display: "flex",
        justifyContent: "space-between",
        fontFamily: fonts.body,
        fontWeight: 700,
        fontSize: 28,
        color: dark ? colors.logoCream : colors.ink,
      }}
    >
      <span>ludenlab.com</span>
      <span style={{ opacity: 0.6 }}>
        {product === "ATÖLYE" ? "Özel eğitim öğretmenleri için" : product === "STUDIO" ? "Dil ve konuşma uzmanları için" : ""}
      </span>
    </div>
  </AbsoluteFill>
);

export const Headline: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({
  children,
  size = 92,
  color = colors.ink,
  style,
}) => (
  <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: size, lineHeight: 1.02, letterSpacing: -1.5, color, ...style }}>
    {children}
  </div>
);

export const Hi: React.FC<{ color?: string; children: React.ReactNode }> = ({ color = colors.orange, children }) => (
  <span style={{ color }}>{children}</span>
);

/**
 * Ürünün gerçek PDF çıktısından (A4, 1654×2339) kırpılmış kâğıt maketi.
 * cropTop/cropHeight kaynak piksel cinsindendir.
 */
export const Paper: React.FC<{
  src: string;
  width: number;
  cropTop?: number;
  cropHeight?: number;
  rotate?: number;
  shadow?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ src, width, cropTop = 0, cropHeight = 2339, rotate = 0, shadow = 14, style, children }) => {
  const scale = width / 1654;
  return (
    <div
      style={{
        position: "absolute",
        width,
        height: cropHeight * scale,
        overflow: "hidden",
        background: colors.white,
        border: `3px solid ${colors.ink}`,
        borderRadius: 14,
        boxShadow: `${shadow}px ${shadow}px 0 ${colors.ink}`,
        transform: `rotate(${rotate}deg)`,
        ...style,
      }}
    >
      <Img src={staticFile(src)} style={{ width, display: "block", marginTop: -cropTop * scale }} />
      {children}
    </div>
  );
};

export const Deco: React.FC<{ items: { x: number; y: number; size: number; kind: ShapeKind; color: string; rot?: number }[] }> = ({ items }) => (
  <>
    {items.map((d, i) => (
      <div key={i} style={{ position: "absolute", left: d.x - d.size / 2, top: d.y - d.size / 2, transform: `rotate(${d.rot ?? 0}deg)` }}>
        <Shape kind={d.kind} size={d.size} color={d.color} />
      </div>
    ))}
  </>
);

export const Squiggle: React.FC<{ width?: number; color?: string }> = ({ width = 300, color = colors.orange }) => (
  <svg width={width} height={width * (36 / 420)} viewBox="0 0 420 36" fill="none">
    <path d="M8 22 Q 42 6, 76 22 T 144 22 T 212 22 T 280 22 T 348 22 T 412 22" stroke={color} strokeWidth={10} strokeLinecap="round" />
  </svg>
);
