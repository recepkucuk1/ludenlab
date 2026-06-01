"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PAlert, PButton, PCard, PField, PInput, PSpinner } from "@ludenlab/ui";

export default function GirisPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (!res || res.error) {
      setError("E-posta veya şifre hatalı.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 420, margin: "3rem auto", padding: "0 1rem" }}>
      {/* Marka */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
          <svg
            width={30}
            height={30}
            viewBox="0 0 32 32"
            fill="none"
            stroke="var(--poster-accent)"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden
          >
            <ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(34 16 16)" />
            <ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(-34 16 16)" />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 21,
              color: "var(--poster-deep-teal)",
              letterSpacing: "-0.02em",
            }}
          >
            LudenLab Atölye
          </span>
        </span>
      </div>

      <PCard>
        <span className="p-eyebrow">HESABINA GİRİŞ</span>
        <h1 className="p-h3" style={{ margin: "8px 0 1.25rem" }}>
          Tekrar hoş geldin
        </h1>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <PField label="E-posta" htmlFor="g-email">
            <PInput
              id="g-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </PField>
          <PField label="Şifre" htmlFor="g-pass">
            <PInput
              id="g-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </PField>
          {error && <PAlert tone="error">{error}</PAlert>}
          <PButton type="submit" size="lg" disabled={loading}>
            {loading ? (
              <>
                <PSpinner /> Giriş yapılıyor…
              </>
            ) : (
              "Giriş yap"
            )}
          </PButton>
        </form>
        <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--poster-ink-3)" }}>
          Hesabın yok mu?{" "}
          <Link href="/kayit" className="p-link">
            Kayıt ol
          </Link>
        </p>
      </PCard>
    </div>
  );
}
