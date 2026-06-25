"use client";

import { Logo } from "@ludenlab/ui";
import { PaymentBadge } from "@/components/PaymentBadge";

const FOOTER_LINKS = [
  { href: "/kayit?module=studio", label: "Kayıt Ol" },
  { href: "/giris", label: "Giriş Yap" },
  { href: "/studio#features", label: "Nasıl Çalışır" },
  { href: "/studio#pricing", label: "Fiyatlandırma" },
  { href: "/studio#faq", label: "SSS" },
  { href: "/gizlilik", label: "Gizlilik & Çerez Politikası" },
  { href: "/kosullar", label: "Kullanım Koşulları & İade" },
  { href: "/kvkk", label: "KVKK Aydınlatma Metni" },
];

export function PosterFooter() {
  return (
    <footer
      style={{
        background: "var(--poster-bg-2)",
        borderTop: "2px solid var(--poster-ink)",
        padding: "48px 24px",
        color: "var(--poster-ink)",
        fontFamily: "var(--font-display)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 32,
          }}
        >
          {/* Brand */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <Logo product="Studio" height={46} />
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--poster-ink-2)",
                lineHeight: 1.55,
                maxWidth: 260,
              }}
            >
              Dil, konuşma ve işitme uzmanları için AI destekli öğrenme kartı platformu.
            </p>
          </div>

          {/* Links */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 16,
                color: "var(--poster-ink)",
              }}
            >
              Platform
            </p>
            <ul
              style={{
                display: "grid",
                gridTemplateRows: "repeat(5, auto)",
                gridAutoFlow: "column",
                gap: "8px 16px",
                padding: 0,
                margin: 0,
                listStyle: "none",
              }}
            >
              {FOOTER_LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    style={{
                      fontSize: 13,
                      color: "var(--poster-ink-2)",
                      transition: "color .15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--poster-accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--poster-ink-2)")}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 16,
                color: "var(--poster-ink)",
              }}
            >
              İletişim
            </p>
            <a
              href="mailto:info@ludenlab.com"
              style={{
                fontSize: 13,
                color: "var(--poster-ink-2)",
                display: "block",
                marginBottom: 16,
              }}
            >
              info@ludenlab.com
            </a>
            <div style={{ display: "flex", gap: 10 }}>
              <a
                href="https://www.instagram.com/ludenlabcom"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 36,
                  width: 36,
                  borderRadius: 10,
                  border: "2px solid var(--poster-ink)",
                  boxShadow: "0 3px 0 var(--poster-ink)",
                  background: "var(--poster-panel)",
                  color: "var(--poster-ink)",
                }}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <PaymentBadge style={{ paddingTop: 28, paddingBottom: 4 }} />

        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--poster-ink-3)",
            paddingTop: 12,
          }}
        >
          © {new Date().getFullYear()} LudenLab. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
