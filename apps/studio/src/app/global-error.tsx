"use client";

// Root layout dahil her şey çöktüğünde Next.js bu dosyaya düşer.
// Kendi <html> ve <body>'sini render etmek zorunda — layout.tsx erişilemez.
// Sentry'nin ErrorBoundary entegrasyonu burada hatayı yakalar.

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#fff8ec",
          color: "#1a1a1a",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            background: "#fffaf0",
            border: "2px solid #1a1a1a",
            borderRadius: 14,
            boxShadow: "0 6px 0 #1a1a1a",
            padding: 28,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              margin: "0 0 8px",
            }}
          >
            Beklenmeyen bir hata oluştu
          </h1>
          <p style={{ fontSize: 15, color: "#555", margin: "0 0 20px", lineHeight: 1.5 }}>
            Uygulama başlatılırken bir sorun yaşandı. Sayfayı yenilemeyi deneyin.
            Sorun devam ederse bize ulaşın.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 12,
                color: "#888",
                fontFamily: "monospace",
                margin: "0 0 20px",
              }}
            >
              Hata kodu: {error.digest}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              background: "#fe703a",
              color: "#fff",
              border: "2px solid #1a1a1a",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "0 3px 0 #1a1a1a",
            }}
          >
            Sayfayı yenile
          </button>
        </div>
      </body>
    </html>
  );
}
