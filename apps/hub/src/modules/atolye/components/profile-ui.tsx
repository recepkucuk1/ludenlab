"use client";

/**
 * Profil sayfası poster primitifleri — Studio'daki `@/components/poster` setinin
 * Atölye'ye taşınmış, kendi içinde kapalı kopyası. Görsel parite için birebir
 * aynı inline stiller + `--poster-*` token'ları kullanılır.
 *
 * @ludenlab/ui paketinde PSwitch / PProgress / PLabel yok ve PBtn / PStatCard
 * API'leri farklı olduğundan, sayfa kodunun Studio ile aynı kalabilmesi için bu
 * primitifler burada yerel olarak tutulur. PStatCard'ın CountUp animasyonu
 * framer-motion yerine IntersectionObserver ile yeniden yazıldı (ek bağımlılık yok).
 */

import * as React from "react";

/* ==================== useMediaQuery (SSR-safe) ==================== */

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia(query);
    setMatches(m.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

/* ==================== PBadge ==================== */

export type BadgeColor = "accent" | "green" | "yellow" | "pink" | "blue" | "ink" | "soft";

const BADGE_COLORS: Record<BadgeColor, { bg: string; ink: string }> = {
  accent: { bg: "#FE703A", ink: "#fff" },
  green: { bg: "#2CC069", ink: "#fff" },
  yellow: { bg: "#FFCE52", ink: "#3D2900" },
  pink: { bg: "#FF6B9D", ink: "#fff" },
  blue: { bg: "#4A90E2", ink: "#fff" },
  ink: { bg: "var(--poster-ink)", ink: "var(--poster-panel)" },
  soft: { bg: "color-mix(in srgb, var(--poster-ink) 10%, transparent)", ink: "var(--poster-ink)" },
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

/* ==================== PBtn ==================== */

type BtnVariant = "accent" | "green" | "dark" | "white";
type BtnSize = "sm" | "md" | "lg";

const BTN_VARIANTS: Record<BtnVariant, { bg: string; ink: string; shadow: string; border?: string }> = {
  accent: { bg: "#FE703A", ink: "#fff", shadow: "#D14F1E" },
  green: { bg: "#2CC069", ink: "#fff", shadow: "#1F8E4A" },
  dark: { bg: "var(--poster-ink)", ink: "var(--poster-panel)", shadow: "var(--poster-ink)" },
  white: {
    bg: "var(--poster-panel)",
    ink: "var(--poster-ink)",
    shadow: "var(--poster-ink)",
    border: "2px solid var(--poster-ink)",
  },
};

const BTN_SIZES: Record<BtnSize, { height: number; padding: string; fontSize: number; radius: number; shadowY: number }> = {
  sm: { height: 44, padding: "0 14px", fontSize: 13, radius: 12, shadowY: 3 },
  md: { height: 48, padding: "0 22px", fontSize: 14.5, radius: 14, shadowY: 4 },
  lg: { height: 58, padding: "0 28px", fontSize: 16, radius: 16, shadowY: 5 },
};

const BTN_SIZES_MOBILE: Record<BtnSize, { height: number; padding: string; fontSize: number; radius: number; shadowY: number }> = {
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

/* ==================== PCard ==================== */

export function PCard({
  children,
  color,
  rotate = 0,
  rounded = 20,
  style,
  keepRotateOnMobile = false,
}: {
  children: React.ReactNode;
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

/* ==================== PInput ==================== */

type PInputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const PInput = React.forwardRef<HTMLInputElement, PInputProps>(
  function PInput({ style, invalid, onFocus, onBlur, ...rest }, ref) {
    return (
      <input
        ref={ref}
        {...rest}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = "0 4px 0 var(--poster-accent)";
          e.currentTarget.style.borderColor = "var(--poster-ink)";
          onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = "var(--poster-shadow-sm)";
          e.currentTarget.style.borderColor = invalid ? "var(--poster-danger)" : "var(--poster-ink)";
          onBlur?.(e);
        }}
        style={{
          width: "100%",
          height: 46,
          padding: "0 14px",
          background: "var(--poster-panel)",
          border: `2px solid ${invalid ? "var(--poster-danger)" : "var(--poster-ink)"}`,
          borderRadius: 12,
          boxShadow: "var(--poster-shadow-sm)",
          fontFamily: "var(--font-display)",
          fontSize: 15,
          color: "var(--poster-ink)",
          outline: "none",
          transition: "box-shadow .15s, border-color .15s",
          ...style,
        }}
      />
    );
  }
);

/* ==================== PTextarea ==================== */

type PTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const PTextarea = React.forwardRef<HTMLTextAreaElement, PTextareaProps>(
  function PTextarea({ style, invalid, onFocus, onBlur, rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        {...rest}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = "0 4px 0 var(--poster-accent)";
          onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = "var(--poster-shadow-sm)";
          onBlur?.(e);
        }}
        style={{
          width: "100%",
          padding: "12px 14px",
          background: "var(--poster-panel)",
          border: `2px solid ${invalid ? "var(--poster-danger)" : "var(--poster-ink)"}`,
          borderRadius: 12,
          boxShadow: "var(--poster-shadow-sm)",
          fontFamily: "var(--font-display)",
          fontSize: 15,
          color: "var(--poster-ink)",
          outline: "none",
          resize: "vertical",
          transition: "box-shadow .15s",
          ...style,
        }}
      />
    );
  }
);

/* ==================== PLabel ==================== */

export function PLabel({
  htmlFor,
  children,
  rightSlot,
  required,
  optional,
  style,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, ...style }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--poster-ink)",
          fontFamily: "var(--font-display)",
        }}
      >
        {children}
        {required && (
          <span aria-hidden style={{ color: "var(--poster-accent)", fontWeight: 800, marginLeft: 3 }}>
            *
          </span>
        )}
        {optional && (
          <span style={{ fontWeight: 500, color: "var(--poster-ink-3)", marginLeft: 6 }}>(opsiyonel)</span>
        )}
      </label>
      {rightSlot}
    </div>
  );
}

/* ==================== PSelect ==================== */

type PSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

export const PSelect = React.forwardRef<HTMLSelectElement, PSelectProps>(
  function PSelect({ style, invalid, children, className, ...rest }, ref) {
    return (
      <select
        ref={ref}
        {...rest}
        className={`p-select${className ? ` ${className}` : ""}`}
        style={{
          width: "100%",
          height: 46,
          padding: "0 38px 0 14px",
          background: "var(--poster-panel)",
          border: `2px solid ${invalid ? "var(--poster-danger)" : "var(--poster-ink)"}`,
          borderRadius: 12,
          boxShadow: "var(--poster-shadow-sm)",
          fontFamily: "var(--font-display)",
          fontSize: 15,
          fontWeight: 600,
          color: "var(--poster-ink)",
          outline: "none",
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          cursor: "pointer",
          ...style,
        }}
      >
        {children}
      </select>
    );
  }
);

/* ==================== PSwitch ==================== */

type PSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  id?: string;
};

export function PSwitch({ checked, onChange, label, disabled, id }: PSwitchProps) {
  const generatedId = React.useId();
  const switchId = id ?? generatedId;
  return (
    <label
      htmlFor={switchId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "var(--font-display)",
        fontSize: 14,
        color: "var(--poster-ink)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        id={switchId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          position: "relative",
          width: 48,
          height: 28,
          padding: 0,
          minHeight: 28,
          background: checked ? "var(--poster-accent)" : "var(--poster-panel)",
          border: "2px solid var(--poster-ink)",
          borderRadius: 999,
          boxShadow: "var(--poster-shadow-sm)",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background .15s",
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 22 : 2,
            width: 18,
            height: 18,
            background: "var(--poster-ink)",
            borderRadius: 999,
            transition: "left .15s cubic-bezier(.16,1,.3,1)",
          }}
        />
      </button>
      {label}
    </label>
  );
}

/* ==================== PProgress ==================== */

export function PProgress({
  value,
  max = 100,
  color = "var(--poster-accent)",
  showLabel = false,
  style,
}: {
  value: number;
  max?: number;
  color?: string;
  showLabel?: boolean;
  style?: React.CSSProperties;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, ...style }}>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        style={{
          flex: 1,
          height: 10,
          background: "var(--poster-ink-faint)",
          border: "2px solid var(--poster-ink)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            transition: "width .3s cubic-bezier(.16,1,.3,1)",
          }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--poster-accent)", fontFamily: "var(--font-display)" }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}

/* ==================== PSpinner ==================== */

type PSpinnerProps = {
  size?: number;
  label?: string;
  fullPanel?: boolean;
  style?: React.CSSProperties;
};

export function PSpinner({ size = 32, label, fullPanel, style }: PSpinnerProps) {
  const ring = (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${Math.max(3, Math.round(size / 10))}px solid rgba(254,112,58,.2)`,
        borderTopColor: "var(--poster-accent)",
        animation: "poster-spin 1s linear infinite",
      }}
    />
  );

  const content = (
    <>
      {ring}
      {label && (
        <p style={{ marginTop: 14, fontSize: 13, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
          {label}
        </p>
      )}
      <style>{`@keyframes poster-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );

  if (fullPanel) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--poster-bg)",
          ...style,
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", ...style }}
    >
      {content}
    </div>
  );
}

/* ==================== PStatCard ==================== */
/**
 * Studio'daki PStatCard'ın framer-motion'sız uyarlaması. Profil sayfasındaki
 * tüm kartlar `noAnimation` geçtiği için entrance animasyonu hiç kullanılmaz;
 * yalnızca sayısal değerler için CountUp (IntersectionObserver ile) korunur.
 */

function CountUp({ target, durationMs = 1200 }: { target: number; durationMs?: number }) {
  const [count, setCount] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      if (target === 0) {
        setCount(0);
        return;
      }
      const steps = 30;
      const increment = target / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, durationMs / steps);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, durationMs]);

  return <span ref={ref}>{count}</span>;
}

type PStatCardProps = {
  label: string;
  value: number | string;
  /** Sayısal value için CountUp aktif mi (default true). */
  countUp?: boolean;
  /** Kompakt variant — padding ve font boyutları küçülür. */
  size?: "default" | "small";
  /** Value rengi override; default var(--poster-ink). */
  valueColor?: string;
  /** API uyumu için kabul edilir; bu uyarlamada entrance animasyonu zaten yok. */
  noAnimation?: boolean;
  /** Value sonrasında ek slot — trend indicator, mini progress bar vb. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

export function PStatCard({
  label,
  value,
  countUp = true,
  size = "default",
  valueColor,
  children,
  style,
}: PStatCardProps) {
  const isSmall = size === "small";
  const padding = isSmall ? 14 : 20;
  const valueFontSize = isSmall ? "clamp(18px, 4vw, 22px)" : "clamp(22px, 5vw, 30px)";

  const valueNode = typeof value === "number" && countUp ? <CountUp target={value} /> : value;

  return (
    <div
      style={{
        padding,
        background: "var(--poster-panel)",
        border: "2px solid var(--poster-ink)",
        borderRadius: isSmall ? 14 : 18,
        boxShadow: isSmall ? "var(--poster-shadow-sm)" : "var(--poster-shadow-lg)",
        fontFamily: "var(--font-display)",
        ...style,
      }}
    >
      <p
        style={{
          fontSize: isSmall ? 10 : 12,
          fontWeight: 800,
          color: "var(--poster-ink-2)",
          textTransform: "uppercase",
          letterSpacing: ".08em",
          margin: 0,
        }}
      >
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
        <p
          style={{
            fontSize: valueFontSize,
            fontWeight: 800,
            color: valueColor ?? "var(--poster-ink)",
            letterSpacing: "-.02em",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {valueNode}
        </p>
      </div>
      {children}
    </div>
  );
}
