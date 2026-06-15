"use client";
/**
 * Poster primitives — canonical home.
 * Tokens come from CSS vars in globals.css (both .poster-scope light + dark).
 * Re-exports existing primitives from landing/poster-ui so call sites can
 * import from a single `@/components/poster` path.
 */
import * as React from "react";

// Re-exports from the historical location (landing + auth)
export { PBtn, PCard, PBadge, Blob, Squiggle, POSTER_TOKENS } from "@/components/landing/poster-ui";
export type { BadgeColor } from "@/components/landing/poster-ui";

// Form primitives — promoted from auth/PosterAuthShell but token-driven so dark works
export { PosterAuthShell } from "@/components/auth/PosterAuthShell";

// Interaction primitives
export { PModal } from "./PModal";
export { PTabs } from "./PTabs";
export { PToaster } from "./PToaster";
export { PSpinner } from "./PSpinner";
export { PEmptyState } from "./PEmptyState";
export { PStatCard } from "./PStatCard";
export { PHoverPanel } from "./PHoverPanel";
export { PSection } from "./PSection";

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
  /** Zorunlu alan göstergesi — turuncu yıldız ekler. */
  required?: boolean;
  /** İsteğe bağlı alan göstergesi — sağ tarafta gri "(opsiyonel)". */
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
          <span style={{ fontWeight: 500, color: "var(--poster-ink-3)", marginLeft: 6 }}>
            (opsiyonel)
          </span>
        )}
      </label>
      {rightSlot}
    </div>
  );
}

/* ==================== PFieldHint ==================== */
/**
 * Form alanlarının altında gösterilen kısa hint/error metni.
 * tone="error" → kırmızı; tone="hint" → gri.
 */
export function PFieldHint({
  tone = "hint",
  children,
  style,
}: {
  tone?: "hint" | "error";
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      style={{
        margin: "6px 0 0",
        fontSize: 12,
        lineHeight: 1.4,
        color: tone === "error" ? "var(--poster-danger)" : "var(--poster-ink-3)",
        fontWeight: tone === "error" ? 700 : 500,
        fontFamily: "var(--font-display)",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

/* ==================== PAlert ==================== */

type AlertTone = "error" | "success" | "warning" | "info";

export function PAlert({
  tone,
  children,
  style,
}: {
  tone: AlertTone;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      role="alert"
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        background: `var(--alert-${tone}-bg)`,
        border: `2px solid var(--alert-${tone}-border)`,
        boxShadow: `0 3px 0 var(--alert-${tone}-border)`,
        fontSize: 13,
        lineHeight: 1.5,
        color: `var(--alert-${tone}-text)`,
        fontFamily: "var(--font-display)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ==================== PSelect (native wrapper) ==================== */

type PSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

export const PSelect = React.forwardRef<HTMLSelectElement, PSelectProps>(
  function PSelect({ style, invalid, children, className, ...rest }, ref) {
    // Arrow rendered via CSS background-image with theme-aware stroke; see globals.css
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

/* ==================== PCheckbox ==================== */

type PCheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: React.ReactNode;
};

export const PCheckbox = React.forwardRef<HTMLInputElement, PCheckboxProps>(
  function PCheckbox({ label, style, id, ...rest }, ref) {
    const generatedId = React.useId();
    const checkboxId = id ?? generatedId;
    return (
      <label
        htmlFor={checkboxId}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          fontFamily: "var(--font-display)",
          fontSize: 14,
          color: "var(--poster-ink)",
          userSelect: "none",
        }}
      >
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          {...rest}
          style={{
            width: 20,
            height: 20,
            appearance: "none",
            WebkitAppearance: "none",
            background: "var(--poster-panel)",
            border: "2px solid var(--poster-ink)",
            borderRadius: 6,
            boxShadow: "var(--poster-shadow-sm)",
            cursor: "pointer",
            position: "relative",
            flexShrink: 0,
            // checked state via CSS trick: use accent color via :checked
            accentColor: "var(--poster-accent)",
            ...style,
          }}
        />
        {label}
      </label>
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

/* ==================== PSkeleton ==================== */

export function PSkeleton({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={{
        width,
        height,
        borderRadius: radius,
        background: "var(--poster-ink-faint)",
        border: "1px dashed var(--poster-ink-3)",
        animation: "poster-skeleton-pulse 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/* ==================== PTable ==================== */
/**
 * Poster list container + row primitive.
 * Usage:
 *   <PTable>
 *     <PTable.Header>...columns...</PTable.Header>
 *     {items.map(i => <PTable.Row key={i.id}>...cells...</PTable.Row>)}
 *   </PTable>
 * Columns are consumer-controlled via CSS grid — pass gridTemplateColumns.
 */
type PTableProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export function PTable({ children, style }: PTableProps) {
  return (
    <div
      style={{
        background: "var(--poster-panel)",
        border: "2px solid var(--poster-ink)",
        borderRadius: 18,
        boxShadow: "var(--poster-shadow-lg)",
        overflow: "hidden",
        fontFamily: "var(--font-display)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

PTable.Header = function PTableHeader({
  children,
  gridTemplateColumns,
  style,
}: {
  children: React.ReactNode;
  gridTemplateColumns: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      role="row"
      style={{
        display: "grid",
        gridTemplateColumns,
        gap: 20,
        alignItems: "center",
        padding: "10px 16px",
        fontSize: 11,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: ".1em",
        color: "var(--poster-ink-2)",
        borderBottom: "2px solid var(--poster-ink)",
        background: "var(--poster-bg-2)",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

PTable.Row = function PTableRow({
  children,
  gridTemplateColumns,
  onClick,
  href,
  first,
  style,
}: {
  children: React.ReactNode;
  gridTemplateColumns: string;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  first?: boolean;
  style?: React.CSSProperties;
}) {
  const commonStyle: React.CSSProperties = {
    textDecoration: "none",
    color: "inherit",
    display: "grid",
    gridTemplateColumns,
    gap: 20,
    alignItems: "center",
    padding: "14px 16px",
    borderTop: first ? "none" : "2px dashed var(--poster-ink-faint)",
    transition: "background .1s",
    cursor: href || onClick ? "pointer" : "default",
    ...style,
  };
  const handlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.background = "var(--poster-bg-2)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.background = "";
    },
  };
  if (href) {
    return (
      <a href={href} onClick={onClick} role="row" style={commonStyle} {...handlers}>
        {children}
      </a>
    );
  }
  return (
    <div role="row" onClick={onClick} style={commonStyle} {...handlers}>
      {children}
    </div>
  );
};
