"use client";

import * as React from "react";

type SectionTone = "neutral" | "warning" | "success" | "error" | "info";

type PSectionProps = {
  /** Üstteki uppercase başlık. Boş bırakılırsa header alanı render edilmez. */
  title?: string;
  /**
   * `neutral` — beyaz/krem panel, ink-3 başlık (default).
   * `warning|success|error|info` — alert palette'ini paylaşır
   * (`--alert-{tone}-{bg,border,text}`), dark mode'da otomatik flip.
   */
  tone?: SectionTone;
  /** Sağ üstte küçük etiket veya buton için slot. */
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  /** İç padding (default 14). */
  padding?: number;
  /** Köşe yuvarlatma (default 14). */
  rounded?: number;
  style?: React.CSSProperties;
};

/**
 * Başlıklı, tonlu içerik bloğu — PAlert'ten daha kart-like, daha uzun
 * gövde içerik için. CardPreview'da sınanmış pattern primitive haline
 * getirildi. Tools sayfalarındaki "Uzman Notları", "Ev Egzersizi",
 * "Materyaller" gibi bölümler için reusable.
 */
export function PSection({
  title,
  tone = "neutral",
  rightSlot,
  children,
  padding = 14,
  rounded = 14,
  style,
}: PSectionProps) {
  const isNeutral = tone === "neutral";
  const bg = isNeutral ? "var(--poster-panel)" : `var(--alert-${tone}-bg)`;
  const borderColor = isNeutral ? "var(--poster-ink)" : `var(--alert-${tone}-border)`;
  const titleColor = isNeutral ? "var(--poster-ink-3)" : `var(--alert-${tone}-text)`;
  const bodyColor = isNeutral ? "var(--poster-ink)" : `var(--alert-${tone}-text)`;
  const showShadow = !isNeutral;

  return (
    <div
      style={{
        padding,
        background: bg,
        border: `2px solid ${borderColor}`,
        borderRadius: rounded,
        boxShadow: showShadow ? `0 4px 0 ${borderColor}` : "var(--poster-shadow-sm)",
        fontFamily: "var(--font-display)",
        ...style,
      }}
    >
      {(title || rightSlot) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 10,
          }}
        >
          {title && (
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: titleColor,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                margin: 0,
              }}
            >
              {title}
            </p>
          )}
          {rightSlot}
        </div>
      )}
      <div style={{ color: bodyColor }}>{children}</div>
    </div>
  );
}
