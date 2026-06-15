"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PBtn } from "@/components/landing/poster-ui";
import {
  PosterAuthShell,
  PosterInput,
  PosterLabel,
  PosterAlert,
} from "@/components/auth/PosterAuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTryAnotherEmail() {
    setSent(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Bir hata oluştu.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Bağlantı hatası, tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PosterAuthShell
      heading="Şifreni mi unuttun?"
      subheading="Endişelenme, email adresine güvenli bir sıfırlama linki gönderelim."
      eyebrow="Şifre sıfırlama"
    >
      <div style={{ textAlign: "center", marginBottom: 24 }} className="poster-mobile-logo">
        <Link href="/">
          <Image
            src="/logo.svg"
            alt="LudenLab"
            width={200}
            height={72}
            style={{ height: 48, width: "auto", margin: "0 auto" }}
          />
        </Link>
      </div>

      <div style={{ marginBottom: 28 }}>
        {!sent ? (
          <>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(24px, 6vw, 30px)",
                letterSpacing: "-.02em",
                color: "var(--poster-ink)",
                margin: 0,
              }}
            >
              Şifremi Unuttum
            </h1>
            <p
              style={{
                marginTop: 6,
                fontSize: 14,
                color: "var(--poster-ink-2)",
                fontFamily: "var(--font-display)",
              }}
            >
              Email adresinizi girin, sıfırlama linki gönderelim.
            </p>
          </>
        ) : (
          <>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 56,
                width: 56,
                borderRadius: 16,
                background: "var(--poster-green)",
                border: "2px solid var(--poster-ink)",
                boxShadow: "0 4px 0 var(--poster-ink)",
                marginBottom: 16,
                color: "#fff",
              }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(22px, 5.5vw, 26px)",
                letterSpacing: "-.02em",
                color: "var(--poster-ink)",
                margin: 0,
              }}
            >
              E-postanızı kontrol edin
            </h1>
            <p
              style={{
                marginTop: 8,
                fontSize: 14,
                color: "var(--poster-ink-2)",
                fontFamily: "var(--font-display)",
              }}
            >
              Eğer <strong style={{ color: "var(--poster-ink)" }}>{email}</strong> ile kayıtlı bir hesap varsa, şifre sıfırlama linki gönderildi.
            </p>
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "var(--poster-ink-3)",
                fontFamily: "var(--font-display)",
              }}
            >
              Email gelmezse spam klasörünü kontrol edin.
            </p>
          </>
        )}
      </div>

      {!sent ? (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <PosterLabel htmlFor="email">Email</PosterLabel>
            <PosterInput
              id="email"
              type="email"
              placeholder="ad@klinik.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          {error && <PosterAlert tone="error">{error}</PosterAlert>}

          <PBtn
            type="submit"
            variant="dark"
            size="md"
            disabled={loading}
            style={{ width: "100%", marginTop: 4, opacity: loading ? 0.8 : 1 }}
          >
            {loading ? "Gönderiliyor…" : "Sıfırlama Linki Gönder"}
          </PBtn>
        </form>
      ) : (
        <PBtn
          type="button"
          variant="white"
          size="md"
          onClick={handleTryAnotherEmail}
          style={{ width: "100%" }}
        >
          Farklı bir email dene
        </PBtn>
      )}

      <p
        style={{
          marginTop: 24,
          textAlign: "center",
          fontSize: 14,
          color: "var(--poster-ink-2)",
          fontFamily: "var(--font-display)",
        }}
      >
        <Link
          href="/login"
          style={{ fontWeight: 700, color: "var(--poster-accent)", textDecoration: "underline" }}
        >
          ← Giriş sayfasına dön
        </Link>
      </p>

      <style>{`
        @media (min-width: 1024px) {
          .poster-mobile-logo {
            display: none !important;
          }
        }
      `}</style>
    </PosterAuthShell>
  );
}
