"use client";

import * as React from "react";

type PHoverPanelProps = {
  children: React.ReactNode;
  /** Default 18 (kart-tarzı). 14 daha kompakt panel için iyi. */
  rounded?: number;
  /** Aktif değilken hover lift'i kapat. */
  disabled?: boolean;
  /** İçi padding'siz, tüketicinin yapısı korunsun. */
  padding?: number;
  /** Kart üzerinde absolute pozisyonlu badge/ikon overlay'leri için. */
  style?: React.CSSProperties;
  className?: string;
  /** Tüketici hover state'ine ihtiyaç duyarsa (örn. fade-in icon button). */
  onHoverChange?: (hover: boolean) => void;
};

/**
 * Poster'ın "kart hover lift" pattern'i: 6px shadow → 9px shadow,
 * `translateY(-3px)` ve cubic-bezier easing. Students/Cards/Tools listelerinde
 * tekrarlanan inline kodu tek noktaya çeker.
 *
 * Tıklanabilir hale getirmek için tüketici bir <Link>/<a> ile sarmalar veya
 * onClick prop'u verir; primitive sadece görsel davranışı sağlar.
 */
export function PHoverPanel({
  children,
  rounded = 18,
  disabled,
  padding,
  style,
  className,
  onHoverChange,
}: PHoverPanelProps) {
  const baseShadow = "0 6px 0 var(--poster-ink)";
  const hoverShadow = "0 9px 0 var(--poster-ink)";

  return (
    <div
      className={className}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = hoverShadow;
        onHoverChange?.(true);
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = baseShadow;
        onHoverChange?.(false);
      }}
      style={{
        position: "relative",
        background: "var(--poster-panel)",
        border: "2px solid var(--poster-ink)",
        borderRadius: rounded,
        boxShadow: baseShadow,
        transition:
          "transform .15s cubic-bezier(.16,1,.3,1), box-shadow .15s cubic-bezier(.16,1,.3,1)",
        overflow: "hidden",
        padding,
        fontFamily: "var(--font-display)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
