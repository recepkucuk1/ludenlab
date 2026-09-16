"use client";

import { useEffect } from "react";

/**
 * Kök layout'un kendisi patlarsa devreye girer — bu durumda uygulama CSS'i YÜKLENMEZ,
 * bu yüzden kendi <html>/<body>'sini ve tüm stillerini satır içi taşır. Bu dosya yokken
 * kök hata boş beyaz sayfa olarak görünüyordu (2026-09 denetimi).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="tr">
      <body style={{ margin: 0, background: "#fff8ec", color: "#0e1e26", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <main
          style={{
            minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "0.75rem", padding: "3rem 1rem", textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.75rem", letterSpacing: "0.12em", fontWeight: 600, color: "#c2410c" }}>
            LudenLab
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 800 }}>
            Uygulama açılamadı
          </h1>
          <p style={{ margin: 0, maxWidth: "46ch", lineHeight: 1.6, opacity: 0.75 }}>
            Beklenmedik bir hata oluştu. Sayfayı yenilemeyi deneyebilirsin; sorun sürerse
            birazdan tekrar dene.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "0.75rem", background: "#fe703a", color: "#fff", padding: "0.6rem 1.25rem",
              borderRadius: 999, fontWeight: 600, border: "none", cursor: "pointer", font: "inherit",
            }}
          >
            Tekrar dene
          </button>
          {error.digest ? (
            <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.5 }}>Hata kodu: {error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
