"use client";

// Segment seviyesinde hata sınırı. Bir route içinde render hatası olduğunda
// Next.js bu komponenti gösterir + Sentry'ye otomatik raporlar.
// global-error.tsx'in aksine layout.tsx burada hâlâ render edilir.

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          background: "var(--poster-card, #fffaf0)",
          border: "2px solid var(--poster-ink, #1a1a1a)",
          borderRadius: 14,
          boxShadow: "0 6px 0 var(--poster-ink, #1a1a1a)",
          padding: 28,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <h2
          style={{
            fontFamily: "var(--font-space-grotesk, system-ui)",
            fontSize: 22,
            fontWeight: 800,
            margin: "0 0 8px",
          }}
        >
          Bir şeyler ters gitti
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "var(--poster-ink-soft, #555)",
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          Sayfayı yüklerken bir hata oluştu. Tekrar deneyebilir veya ana sayfaya
          dönebilirsiniz. Sorun devam ederse bize ulaşın.
        </p>
        {error.digest && (
          <p
            style={{
              fontSize: 12,
              color: "var(--poster-ink-soft, #888)",
              fontFamily: "monospace",
              margin: "0 0 20px",
            }}
          >
            Hata kodu: {error.digest}
          </p>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              padding: "10px 20px",
              background: "var(--poster-accent, #fe703a)",
              color: "#fff",
              border: "2px solid var(--poster-ink, #1a1a1a)",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "0 3px 0 var(--poster-ink, #1a1a1a)",
            }}
          >
            Tekrar dene
          </button>
          <a
            href="/"
            style={{
              padding: "10px 20px",
              background: "transparent",
              color: "var(--poster-ink, #1a1a1a)",
              border: "2px solid var(--poster-ink, #1a1a1a)",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              display: "inline-block",
              boxShadow: "0 3px 0 var(--poster-ink, #1a1a1a)",
            }}
          >
            Ana sayfa
          </a>
        </div>
      </div>
    </div>
  );
}
