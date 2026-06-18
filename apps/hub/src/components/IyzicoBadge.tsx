import type { CSSProperties } from "react";

/**
 * iyzico resmi logoları — tema-duyarlı (light=colored, dark=white; poster `.dark`).
 * Asset: public/iyzico/*.svg (resmi marka paketi).
 *
 *  - variant="band" (varsayılan): footer "logo band" (kart şemaları + iyzico) +
 *    "iyzico ile güvenli ödeme" etiketi → fiyatlandırma/abonelik (ödeme öncesi güven).
 *  - variant="checkout": "iyzico ile öde" logosu → ödeme noktası (/odeme checkout).
 */
type Variant = "band" | "checkout";

const ASSET: Record<Variant, { light: string; dark: string; height: number; alt: string; label: string | null }> = {
  band: {
    light: "/iyzico/logo-band-colored.svg",
    dark: "/iyzico/logo-band-white.svg",
    height: 26,
    alt: "iyzico ile güvenli ödeme — kabul edilen kartlar",
    label: "iyzico ile güvenli ödeme",
  },
  checkout: {
    light: "/iyzico/iyzico-ile-ode-colored.svg",
    dark: "/iyzico/iyzico-ile-ode-white.svg",
    height: 30,
    alt: "iyzico ile öde",
    label: null,
  },
};

export function IyzicoBadge({ variant = "band", style }: { variant?: Variant; style?: CSSProperties }) {
  const a = ASSET[variant];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "8px 0", ...style }}>
      {a.label && (
        <span
          style={{
            fontSize: 11,
            letterSpacing: ".05em",
            textTransform: "uppercase",
            color: "var(--poster-ink-3)",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
          }}
        >
          {a.label}
        </span>
      )}
      <img src={a.light} alt={a.alt} className="iyz-band iyz-band--light" style={{ height: a.height, width: "auto" }} />
      <img src={a.dark} alt="" aria-hidden="true" className="iyz-band iyz-band--dark" style={{ height: a.height, width: "auto" }} />
      <style>{`.iyz-band--dark{display:none}.dark .iyz-band--light{display:none}.dark .iyz-band--dark{display:inline-block}`}</style>
    </div>
  );
}
