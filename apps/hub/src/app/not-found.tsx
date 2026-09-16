import Link from "next/link";

/**
 * 404 — markalı Türkçe sayfa. Bu dosya yokken Next'in İngilizce varsayılanı
 * ("404: This page could not be found.") canlıda görünüyordu (2026-09 denetimi).
 * Stiller satır içi: hata yolunda dış CSS'e bağımlı olmasın.
 */
export default function NotFound() {
  return (
    <main style={wrap}>
      <p style={eyebrow}>404</p>
      <h1 style={title}>Bu sayfayı bulamadık</h1>
      <p style={text}>
        Aradığın sayfa taşınmış ya da hiç var olmamış olabilir. Adresi kontrol edebilir
        veya ana sayfadan devam edebilirsin.
      </p>
      <div style={row}>
        <Link href="/" style={primary}>Ana sayfa</Link>
        <Link href="/giris" style={secondary}>Giriş yap</Link>
      </div>
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
  fontWeight: 600, textDecoration: "none",
};
const secondary: React.CSSProperties = {
  border: "1px solid rgba(14,30,38,.25)", padding: "0.6rem 1.25rem", borderRadius: 999,
  fontWeight: 600, textDecoration: "none", color: "inherit",
};
