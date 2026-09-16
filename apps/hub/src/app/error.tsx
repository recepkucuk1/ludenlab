"use client";

import { useEffect } from "react";

/**
 * Sayfa/segment hata sınırı — Next'in gri "Application error" ekranı yerine markalı
 * Türkçe kurtarma (2026-09 denetimi). `reset()` segmenti yeniden dener.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Sunucu tarafı zaten `instrumentation.ts` üzerinden raporlar; burada tarayıcı izi.
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <main style={wrap}>
      <p style={eyebrow}>Bir sorun çıktı</p>
      <h1 style={title}>Bu sayfa yüklenemedi</h1>
      <p style={text}>
        Geçici bir hata olabilir. Tekrar denemek çoğu zaman yeterli oluyor; sürerse
        ana sayfadan devam edebilirsin.
      </p>
      <div style={row}>
        <button type="button" onClick={reset} style={primary}>Tekrar dene</button>
        <a href="/" style={secondary}>Ana sayfa</a>
      </div>
      {error.digest ? <p style={digest}>Hata kodu: {error.digest}</p> : null}
    </main>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "70dvh", display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", gap: "0.75rem", padding: "3rem 1rem", textAlign: "center",
};
const eyebrow: React.CSSProperties = {
  margin: 0, fontSize: "0.75rem", letterSpacing: "0.12em", fontWeight: 600, color: "#c2410c",
};
const title: React.CSSProperties = { margin: 0, fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 800 };
const text: React.CSSProperties = { margin: 0, maxWidth: "46ch", lineHeight: 1.6, opacity: 0.75 };
const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.75rem" };
const primary: React.CSSProperties = {
  background: "#fe703a", color: "#fff", padding: "0.6rem 1.25rem", borderRadius: 999,
  fontWeight: 600, border: "none", cursor: "pointer", font: "inherit",
};
const secondary: React.CSSProperties = {
  border: "1px solid rgba(14,30,38,.25)", padding: "0.6rem 1.25rem", borderRadius: 999,
  fontWeight: 600, textDecoration: "none", color: "inherit",
};
const digest: React.CSSProperties = { margin: 0, fontSize: "0.75rem", opacity: 0.5 };
