"use client";

import * as React from "react";

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
        <p
          style={{
            marginTop: 14,
            fontSize: 13,
            color: "var(--poster-ink-2)",
            fontFamily: "var(--font-display)",
          }}
        >
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
