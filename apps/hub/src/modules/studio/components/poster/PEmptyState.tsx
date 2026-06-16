"use client";

import * as React from "react";

type PEmptyStateProps = {
  /**
   * Emoji veya ikon. String emoji (önerilen — büyük emoji'ler boş ekran için
   * idealdir) ya da React node verilebilir.
   */
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /**
   * `panel` (default) — solid border + shadow.
   * `dashed` — dashed border, daha sessiz/secondary.
   */
  variant?: "panel" | "dashed";
  /**
   * Iç padding'i ayarlar. Default 64/24px (büyük), `compact` 24/16px (panel
   * içine yerleşen küçük empty state'ler için).
   */
  size?: "default" | "compact";
  style?: React.CSSProperties;
};

export function PEmptyState({
  icon,
  title,
  subtitle,
  action,
  variant = "panel",
  size = "default",
  style,
}: PEmptyStateProps) {
  const padding = size === "compact" ? "24px 16px" : "64px 24px";
  const iconSize = size === "compact" ? 28 : 40;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding,
        textAlign: "center",
        background: variant === "dashed" ? "var(--poster-bg-2)" : "var(--poster-panel)",
        border:
          variant === "dashed"
            ? "2px dashed var(--poster-ink-3)"
            : "2px solid var(--poster-ink)",
        borderRadius: 18,
        boxShadow: variant === "dashed" ? "none" : "var(--poster-shadow-md)",
        fontFamily: "var(--font-display)",
        ...style,
      }}
    >
      {icon != null && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: typeof icon === "string" ? iconSize : undefined,
            marginBottom: 12,
            opacity: 0.85,
            color: "var(--poster-ink-2)",
          }}
        >
          {icon}
        </div>
      )}
      <p
        style={{
          fontSize: size === "compact" ? 14 : 16,
          fontWeight: 700,
          color: "var(--poster-ink)",
          margin: 0,
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          style={{
            fontSize: size === "compact" ? 12 : 13,
            color: "var(--poster-ink-3)",
            margin: "4px 0 0",
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      )}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
