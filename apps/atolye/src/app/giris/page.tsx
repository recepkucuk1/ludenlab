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
    <div style={{ maxWidth: 420, margin: "2rem auto" }}>
      <PCard>
        <h1 style={{ fontSize: "1.5rem", margin: "0 0 1.25rem" }}>Giriş yap</h1>
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
          <Link href="/kayit" style={{ color: "var(--poster-accent)", fontWeight: 700 }}>
            Kayıt ol
          </Link>
        </p>
      </PCard>
    </div>
  );
}
