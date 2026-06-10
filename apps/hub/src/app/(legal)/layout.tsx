import type { ReactNode } from "react";
import Link from "next/link";
import { COMPANY } from "./_legal-ui";

const NAV = [
  { href: "/gizlilik", label: "Gizlilik" },
  { href: "/kosullar", label: "Kullanım Koşulları" },
  { href: "/kvkk", label: "KVKK" },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "var(--poster-bg)", minHeight: "100vh", color: "var(--poster-ink)" }}>
      <header
        style={{
          borderBottom: "var(--poster-border)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 9 }}>
          <img src="/luden-logo-mark.png" alt="" style={{ height: 26, width: "auto" }} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, letterSpacing: "-0.025em", color: "var(--poster-ink)" }}>
            LudenLab
          </span>
        </Link>
        <Link href="/" className="p-small" style={{ color: "var(--poster-ink-2)", textDecoration: "none", fontWeight: 600 }}>
          ← Ana sayfa
        </Link>
      </header>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "44px 24px 56px" }}>{children}</main>

      <footer style={{ borderTop: "var(--poster-border)", maxWidth: 820, margin: "0 auto", padding: "24px" }}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 16 }}>
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className="p-small" style={{ color: "var(--poster-ink-2)", textDecoration: "none", fontWeight: 600 }}>
              {l.label}
            </Link>
          ))}
        </div>
        <p className="p-small" style={{ color: "var(--poster-ink-3)", margin: 0 }}>
          © {new Date().getFullYear()} {COMPANY.shortName} · {COMPANY.platform}
        </p>
      </footer>
    </div>
  );
}
