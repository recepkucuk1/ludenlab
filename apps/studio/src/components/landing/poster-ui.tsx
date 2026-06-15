"use client";
import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

/**
 * Poster / neo-brutalist UI primitives — kept local to the landing + auth routes.
 * Palette and shadow style are intentionally light-mode only.
 */

export const POSTER_TOKENS = {
  bg: "#FFF8EC",
  bg2: "#FDE8C7",
  panel: "#FFFFFF",
  ink: "#0E1E26",
  ink2: "rgba(14,30,38,.7)",
  ink3: "rgba(14,30,38,.45)",
  accent: "#FE703A",
  green: "#2CC069",
  yellow: "#FFCE52",
  pink: "#FF6B9D",
  blue: "#4A90E2",
};

export type BadgeColor =
  | "accent"
  | "green"
  | "yellow"
  | "pink"
  | "blue"
  | "ink"
  | "soft";

const BADGE_COLORS: Record<BadgeColor, { bg: string; ink: string }> = {
  // Brand colors — keep their hue in both modes
  accent: { bg: "#FE703A", ink: "#fff" },
  green: { bg: "#2CC069", ink: "#fff" },
  yellow: { bg: "#FFCE52", ink: "#3D2900" },
  pink: { bg: "#FF6B9D", ink: "#fff" },
  blue: { bg: "#4A90E2", ink: "#fff" },
  // Neutral variants — token-driven so they flip with the theme
  ink: { bg: "var(--poster-ink)", ink: "var(--poster-panel)" },
  soft: {
    bg: "color-mix(in srgb, var(--poster-ink) 10%, transparent)",
    ink: "var(--poster-ink)",
  },
};

export function PBadge({
  children,
  color = "green",
  style,
}: {
  children: React.ReactNode;
  color?: BadgeColor;
  style?: React.CSSProperties;
}) {
  const v = BADGE_COLORS[color];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 11px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: ".01em",
        background: v.bg,
        color: v.ink,
        fontFamily: "var(--font-display)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

type BtnVariant = "accent" | "green" | "dark" | "white";
type BtnSize = "sm" | "md" | "lg";

const BTN_VARIANTS: Record<
  BtnVariant,
  { bg: string; ink: string; shadow: string; border?: string }
> = {
  // Brand colors — same in light + dark
  accent: { bg: "#FE703A", ink: "#fff", shadow: "#D14F1E" },
  green: { bg: "#2CC069", ink: "#fff", shadow: "#1F8E4A" },
  // Neutral variants — token-driven so they flip in dark mode
  dark: {
    bg: "var(--poster-ink)",
    ink: "var(--poster-panel)",
    shadow: "var(--poster-ink)",
  },
  white: {
    bg: "var(--poster-panel)",
    ink: "var(--poster-ink)",
    shadow: "var(--poster-ink)",
    border: "2px solid var(--poster-ink)",
  },
};

const BTN_SIZES: Record<
  BtnSize,
  { height: number; padding: string; fontSize: number; radius: number; shadowY: number }
> = {
  sm: { height: 44, padding: "0 14px", fontSize: 13, radius: 12, shadowY: 3 },
  md: { height: 48, padding: "0 22px", fontSize: 14.5, radius: 14, shadowY: 4 },
  lg: { height: 58, padding: "0 28px", fontSize: 16, radius: 16, shadowY: 5 },
};

// Mobile-compact overrides: tighten padding, reduce shadow depth, but keep
// height at or above 44px so touch targets stay within WCAG guidance.
const BTN_SIZES_MOBILE: Record<
  BtnSize,
  { height: number; padding: string; fontSize: number; radius: number; shadowY: number }
> = {
  sm: { height: 44, padding: "0 12px", fontSize: 13, radius: 12, shadowY: 2 },
  md: { height: 46, padding: "0 16px", fontSize: 14, radius: 14, shadowY: 3 },
  lg: { height: 52, padding: "0 20px", fontSize: 15, radius: 16, shadowY: 3 },
};

type PBtnProps = {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
  as?: "button" | "a";
  href?: string;
  className?: string;
  style?: React.CSSProperties;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style">;

export function PBtn({
  variant = "accent",
  size = "lg",
  children,
  icon,
  as = "button",
  href,
  style,
  ...rest
}: PBtnProps) {
  const v = BTN_VARIANTS[variant];
  const isMobile = useMediaQuery("(max-width: 640px)");
  const s = isMobile ? BTN_SIZES_MOBILE[size] : BTN_SIZES[size];
  const baseShadow = `0 ${s.shadowY}px 0 ${v.shadow}`;

  const commonStyle: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: v.bg,
    color: v.ink,
    border: v.border || `2px solid ${v.shadow}`,
    height: s.height,
    padding: s.padding,
    fontSize: s.fontSize,
    borderRadius: s.radius,
    boxShadow: baseShadow,
    transition: "transform .08s cubic-bezier(.16,1,.3,1), box-shadow .08s cubic-bezier(.16,1,.3,1)",
    letterSpacing: "-.005em",
    textDecoration: "none",
    ...style,
  };

  const pressHandlers = {
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.transform = `translateY(${s.shadowY}px)`;
      e.currentTarget.style.boxShadow = `0 0 0 ${v.shadow}`;
    },
    onMouseUp: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.transform = "";
      e.currentTarget.style.boxShadow = baseShadow;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.transform = "";
      e.currentTarget.style.boxShadow = baseShadow;
    },
  };

  if (as === "a") {
    return (
      <a href={href} style={commonStyle} {...pressHandlers}>
        {icon}
        {children}
      </a>
    );
  }

  return (
    <button {...rest} style={commonStyle} {...pressHandlers}>
      {icon}
      {children}
    </button>
  );
}

export function PCard({
  children,
  color,
  rotate = 0,
  rounded = 20,
  style,
  keepRotateOnMobile = false,
}: {
  children: React.ReactNode;
  /** Override panel background. Defaults to var(--poster-panel) so dark
   *  mode flips automatically. Pass a hex (or a category tint) for
   *  always-on accent cards. */
  color?: string;
  rotate?: number;
  rounded?: number;
  style?: React.CSSProperties;
  keepRotateOnMobile?: boolean;
}) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const effectiveRotate = isMobile && !keepRotateOnMobile ? 0 : rotate;
  const shadowY = isMobile ? 3 : 6;
  return (
    <div
      style={{
        background: color ?? "var(--poster-panel)",
        borderRadius: rounded,
        border: "2px solid var(--poster-ink)",
        boxShadow: `0 ${shadowY}px 0 var(--poster-ink)`,
        transform: effectiveRotate ? `rotate(${effectiveRotate}deg)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Blob({
  color = "#FFCE52",
  style,
}: {
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 200 200" style={style} aria-hidden>
      <path
        d="M41.8,-69.1C54.9,-62.9,67.3,-53.6,74.4,-41.1C81.5,-28.5,83.3,-12.7,81.8,2.8C80.3,18.3,75.6,33.5,67.2,46.4C58.8,59.3,46.8,70,33,75.8C19.2,81.7,3.6,82.7,-11.8,80.4C-27.3,78.1,-42.6,72.5,-55.5,63.4C-68.4,54.2,-78.9,41.6,-82.9,27C-87,12.4,-84.6,-4.1,-79.1,-19.4C-73.7,-34.6,-65.2,-48.6,-53.1,-56.1C-41.1,-63.6,-25.4,-64.7,-10.8,-64.4C3.7,-64.1,28.8,-75.3,41.8,-69.1Z"
        transform="translate(100 100)"
        fill={color}
      />
    </svg>
  );
}

export function Squiggle({
  color = "#FE703A",
  style,
}: {
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none" style={style} aria-hidden>
      <path
        d="M0,10 Q 12.5,0 25,10 T 50,10 T 75,10 T 100,10"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
