import type { CSSProperties } from "react";

/**
 * Güvenli ödeme rozeti — Paynkolay (nkolay VPOS). Logo-asset
 * bağımlılığı kaldırıldı; metin tabanlı (Visa/Mastercard/Troy · 3D Secure).
 *  - variant="band" (varsayılan): fiyatlandırma/abonelik (ödeme öncesi güven).
 *  - variant="checkout": ödeme noktası (/odeme).
 * onDark=true → sabit-koyu yüzeylerde açık metin (tema bağımsız).
 */
type Variant = "band" | "checkout";

export function PaymentBadge({
  variant = "band",
  onDark = false,
  style,
}: {
  variant?: Variant;
  onDark?: boolean;
  style?: CSSProperties;
}) {
  void variant; // her iki varyant aynı metni gösterir (logo yok)
  const labelColor = onDark ? "rgba(255,255,255,0.6)" : "var(--poster-ink-3)";
  const cardsColor = onDark ? "rgba(255,255,255,0.78)" : "var(--poster-ink-2)";
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 0", ...style }}
    >
      <span
        style={{
          fontSize: 11,
          letterSpacing: ".05em",
          textTransform: "uppercase",
          color: labelColor,
          fontFamily: "var(--font-display)",
          fontWeight: 600,
        }}
      >
        Paynkolay ile güvenli ödeme
      </span>
      <span style={{ fontSize: 12, fontWeight: 500, color: cardsColor }}>
        Visa · Mastercard · Troy — 3D Secure
      </span>
    </div>
  );
}
