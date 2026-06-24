"use client";

import React, { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@ludenlab/ui";
import Link from "next/link";
import { PBtn } from "./poster-ui";

const NAV_LINKS = [
  { href: "/studio#features", label: "Nasıl Çalışır" },
  { href: "/studio#pricing", label: "Fiyatlandırma" },
  { href: "/studio#faq", label: "SSS" },
];

export function PosterHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "var(--poster-bg)",
        borderBottom: "2px solid var(--poster-ink)",
        boxShadow: scrolled ? "0 4px 0 var(--poster-ink)" : "none",
        transition: "box-shadow .2s cubic-bezier(.16,1,.3,1), padding .2s cubic-bezier(.16,1,.3,1)",
        padding: scrolled ? "10px clamp(14px, 4vw, 24px)" : "14px clamp(14px, 4vw, 24px)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link href="/studio/" style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
          <Logo height={scrolled ? 36 : 44} className="poster-logo-img" />
        </Link>

        <nav className="poster-nav-desktop" style={{ display: "none", gap: 4 }}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                color: "var(--poster-ink-2)",
                fontFamily: "var(--font-display)",
                transition: "background .15s, color .15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(14,30,38,.06)";
                e.currentTarget.style.color = "var(--poster-ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "";
                e.currentTarget.style.color = "var(--poster-ink-2)";
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/giris"
            className="poster-login-link"
            style={{
              display: "none",
              padding: "8px 14px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--poster-ink)",
              fontFamily: "var(--font-display)",
            }}
          >
            Giriş Yap
          </Link>
          <Link href="/kayit?module=studio" style={{ textDecoration: "none" }}>
            <PBtn variant="accent" size="sm">
              Ücretsiz Başla →
            </PBtn>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="poster-mobile-toggle"
            aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileMenuOpen}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 44,
              width: 44,
              borderRadius: 10,
              border: "2px solid var(--poster-ink)",
              background: "transparent",
              color: "var(--poster-ink)",
              cursor: "pointer",
            }}
          >
            {mobileMenuOpen ? <X size={18} strokeWidth={2.5} /> : <Menu size={18} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          className="poster-nav-mobile"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "12px 24px 8px",
            borderTop: "2px solid var(--poster-ink)",
            marginTop: 12,
            maxWidth: 1200,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                color: "var(--poster-ink-2)",
                fontFamily: "var(--font-display)",
              }}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/giris"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: "var(--poster-ink)",
              fontFamily: "var(--font-display)",
            }}
          >
            Giriş Yap
          </Link>
        </nav>
      )}

      <style jsx>{`
        @media (min-width: 768px) {
          :global(.poster-nav-desktop) {
            display: flex !important;
          }
          :global(.poster-mobile-toggle) {
            display: none !important;
          }
          :global(.poster-logo-img) {
            height: ${scrolled ? "44px" : "56px"} !important;
            width: auto !important;
          }
        }
        @media (min-width: 640px) {
          :global(.poster-login-link) {
            display: inline-flex !important;
          }
        }
      `}</style>
    </header>
  );
}
