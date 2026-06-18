import type { CSSProperties } from "react";

/**
 * iyzico "güvenli ödeme" logo bandı (resmi footer asset) — tüm ödeme/abonelik
 * yüzeylerinde tutarlı güven göstergesi. Tema-duyarlı: light'ta colored, dark'ta
 * white varyant (poster `.dark` sınıfı). Asset: public/iyzico/logo-band-*.svg.
 */
export function IyzicoBadge({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 7,
        padding: "8px 0",
        ...style,
      }}
    >
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
        iyzico ile güvenli ödeme
      </span>
      <img
        src="/iyzico/logo-band-colored.svg"
        alt="iyzico ile güvenli ödeme — kabul edilen kartlar"
        className="iyz-band iyz-band--light"
        style={{ height: 26, width: "auto" }}
      />
      <img
        src="/iyzico/logo-band-white.svg"
        alt=""
        aria-hidden="true"
        className="iyz-band iyz-band--dark"
        style={{ height: 26, width: "auto" }}
      />
      <style>{`.iyz-band--dark{display:none}.dark .iyz-band--light{display:none}.dark .iyz-band--dark{display:inline-block}`}</style>
    </div>
  );
}
