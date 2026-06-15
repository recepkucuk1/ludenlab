"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { PCard, Blob } from "@/components/landing/poster-ui";

type PosterAuthShellProps = {
  heading: string;
  subheading: string;
  eyebrow?: string;
  children: React.ReactNode;
};

export function PosterAuthShell({
  heading,
  subheading,
  eyebrow = "LudenLab",
  children,
}: PosterAuthShellProps) {
  return (
    <div
      className="poster-scope"
      style={{
        minHeight: "100vh",
        background: "var(--poster-bg)",
        display: "grid",
        gridTemplateColumns: "1fr",
      }}
    >
      <style jsx>{`
        @media (min-width: 1024px) {
          .poster-auth-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .poster-auth-left {
            display: flex !important;
          }
        }
      `}</style>

      <div
        className="poster-auth-grid"
        style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "1fr",
        }}
      >
        {/* LEFT: poster panel — hidden on mobile */}
        <aside
          className="poster-auth-left"
          style={{
            display: "none",
            position: "relative",
            overflow: "hidden",
            padding: "48px",
            background: "var(--poster-bg-2)",
            borderRight: "2px solid var(--poster-ink)",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Decorative blobs */}
          <Blob
            color="var(--poster-yellow)"
            style={{
              position: "absolute",
              top: -120,
              right: -100,
              width: 360,
              height: 360,
              opacity: 0.6,
              pointerEvents: "none",
            }}
          />
          <Blob
            color="var(--poster-pink)"
            style={{
              position: "absolute",
              bottom: -140,
              left: -80,
              width: 320,
              height: 320,
              opacity: 0.45,
              pointerEvents: "none",
            }}
          />

          {/* Top — logo + eyebrow */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center" }}>
              <Image
                src="/logo.svg"
                alt="LudenLab"
                width={200}
                height={72}
                priority
                style={{ height: 56, width: "auto" }}
              />
            </Link>
            <div
              style={{
                marginTop: 18,
                display: "inline-block",
                padding: "5px 12px",
                borderRadius: 999,
                background: "var(--poster-accent)",
                border: "2px solid var(--poster-ink)",
                boxShadow: "0 3px 0 var(--poster-ink)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "#fff",
                fontFamily: "var(--font-display)",
              }}
            >
              {eyebrow}
            </div>
          </div>

          {/* Center — headline + illustration card */}
          <div style={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(32px, 4vw, 44px)",
                letterSpacing: "-.02em",
                lineHeight: 1.08,
                color: "var(--poster-ink)",
                margin: 0,
              }}
            >
              {heading}
            </h2>
            <p
              style={{
                marginTop: 14,
                fontSize: 16,
                lineHeight: 1.55,
                color: "var(--poster-ink-2)",
                fontFamily: "var(--font-display)",
              }}
            >
              {subheading}
            </p>

            <div style={{ marginTop: 36, display: "flex", gap: 16 }}>
              <PCard
                color="#fff"
                rotate={-4}
                rounded={18}
                style={{ padding: "14px 16px", maxWidth: 220 }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--poster-accent)", letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                  Bugün
                </div>
                <div style={{ marginTop: 6, fontSize: 15, fontWeight: 600, color: "var(--poster-ink)", fontFamily: "var(--font-display)" }}>
                  3 öğrenci seansı
                </div>
                <div style={{ marginTop: 2, fontSize: 13, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
                  · 42 kart tamamlandı
                </div>
              </PCard>
              <PCard
                color="var(--poster-green)"
                rotate={3}
                rounded={18}
                style={{ padding: "14px 16px", color: "#fff", maxWidth: 180 }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.9, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                  Gelişim
                </div>
                <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, fontFamily: "var(--font-display)" }}>
                  +18%
                </div>
                <div style={{ marginTop: 2, fontSize: 12, opacity: 0.9, fontFamily: "var(--font-display)" }}>
                  bu hafta
                </div>
              </PCard>
            </div>
          </div>

          {/* Bottom — footnote */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              fontSize: 12,
              color: "var(--poster-ink-3)",
              fontFamily: "var(--font-display)",
            }}
          >
            © {new Date().getFullYear()} LudenLab · Dil, konuşma ve işitme uzmanları için.
          </div>
        </aside>

        {/* RIGHT: form area */}
        <main
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(24px, 6vw, 48px) clamp(16px, 5vw, 24px)",
            background: "var(--poster-bg)",
          }}
        >
          <div style={{ width: "100%", maxWidth: 420 }}>{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ----------------- Poster form primitives ----------------- */

type PosterInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const PosterInput = React.forwardRef<HTMLInputElement, PosterInputProps>(
  function PosterInput({ style, invalid, onFocus, onBlur, ...rest }, ref) {
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
          e.currentTarget.style.boxShadow = "0 3px 0 var(--poster-ink)";
          e.currentTarget.style.borderColor = invalid
            ? "#c53030"
            : "var(--poster-ink)";
          onBlur?.(e);
        }}
        style={{
          width: "100%",
          height: 46,
          padding: "0 14px",
          background: "#fff",
          border: `2px solid ${invalid ? "#c53030" : "var(--poster-ink)"}`,
          borderRadius: 12,
          boxShadow: "0 3px 0 var(--poster-ink)",
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

export function PosterLabel({
  htmlFor,
  children,
  rightSlot,
  required,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
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

type AlertTone = "error" | "success" | "warning";

export function PosterAlert({
  tone,
  children,
}: {
  tone: AlertTone;
  children: React.ReactNode;
}) {
  const palette: Record<AlertTone, { bg: string; border: string; text: string }> = {
    error: { bg: "#ffe9e9", border: "#c53030", text: "#7a1414" },
    success: { bg: "#e4f8ec", border: "var(--poster-green)", text: "#0f4f28" },
    warning: { bg: "#fff3d1", border: "#b7791f", text: "#5a3d05" },
  };
  const p = palette[tone];
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        background: p.bg,
        border: `2px solid ${p.border}`,
        boxShadow: `0 3px 0 ${p.border}`,
        fontSize: 13,
        lineHeight: 1.5,
        color: p.text,
        fontFamily: "var(--font-display)",
      }}
    >
      {children}
    </div>
  );
}
