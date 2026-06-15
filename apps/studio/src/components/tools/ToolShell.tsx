"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PCard, PSpinner } from "@/components/poster";

type ToolShellProps = {
  title: string;
  description: string;
  form: React.ReactNode;
  result: React.ReactNode;
  formWidth?: number;
};

export function ToolShell({ title, description, form, result, formWidth = 380 }: ToolShellProps) {
  return (
    <div
      className="poster-scope"
      style={{
        minHeight: "100%",
        background: "var(--poster-bg)",
        padding: "clamp(14px, 3.5vw, 20px) clamp(14px, 3.5vw, 20px) clamp(24px, 5vw, 32px)",
        fontFamily: "var(--font-display)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <ToolHeader title={title} description={description} />

        {/* Two-column layout — collapses to 1 col on mobile */}
        <div
          className="poster-tool-grid"
          style={{
            display: "grid",
            gridTemplateColumns: `minmax(0, ${formWidth}px) minmax(0, 1fr)`,
            gap: 20,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <PCard rounded={18} style={{ padding: 18, background: "var(--poster-panel)" }}>
              {form}
            </PCard>
          </div>
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>{result}</div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .poster-tool-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Shared tool page header — back-link + title + description, with an optional
 * right-aligned actions slot (e.g. Print / PDF). Used by ToolShell and by
 * full-width dashboard tools (goal-tracker) so the page chrome stays consistent.
 */
export function ToolHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  const heading = (
    <div>
      <h1
        style={{
          fontSize: "clamp(18px, 5vw, 22px)",
          fontWeight: 800,
          color: "var(--poster-ink)",
          letterSpacing: "-.02em",
          margin: 0,
        }}
      >
        {title}
      </h1>
      <p style={{ fontSize: 13, color: "var(--poster-ink-2)", margin: "3px 0 0" }}>{description}</p>
    </div>
  );

  return (
    <PCard rounded={14} style={{ padding: "14px 18px", background: "var(--poster-panel)" }}>
      <Link
        href="/tools"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          color: "var(--poster-ink-2)",
          textDecoration: "none",
          marginBottom: 6,
        }}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} />
        Araçlara Dön
      </Link>
      {actions ? (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          {heading}
          <div style={{ display: "flex", gap: 8 }}>{actions}</div>
        </div>
      ) : (
        heading
      )}
    </PCard>
  );
}

/**
 * Standard empty-state card shown in the result panel before anything is generated.
 */
export function ToolEmptyState({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  return (
    <div
      style={{
        minHeight: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--poster-bg-2)",
        border: "2px dashed var(--poster-ink-3)",
        borderRadius: 18,
      }}
    >
      <div style={{ textAlign: "center", padding: "0 32px" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{icon}</div>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--poster-ink-2)", margin: 0 }}>{title}</p>
        <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: "4px 0 0" }}>{hint}</p>
      </div>
    </div>
  );
}

/**
 * Spinner loading card with rotating message slot.
 */
export function ToolLoadingCard({ children }: { children?: React.ReactNode }) {
  return (
    <PCard
      rounded={18}
      style={{
        minHeight: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--poster-panel)",
      }}
    >
      <div style={{ textAlign: "center", padding: "0 32px" }}>
        <PSpinner size={40} style={{ marginBottom: 16 }} />
        {children}
      </div>
    </PCard>
  );
}
