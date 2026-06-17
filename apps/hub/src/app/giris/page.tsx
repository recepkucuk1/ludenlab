"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PAlert, PButton, PCard, PField, PInput, PSpinner } from "@ludenlab/ui";
import { Brand } from "@/components/Brand";

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
    // checkout akışı /giris?callbackUrl=/odeme?... ile gelir → oraya dön.
    const cb = new URLSearchParams(window.location.search).get("callbackUrl") || "/";
    router.push(cb);
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 420, margin: "clamp(2rem, 8vh, 5rem) auto", padding: "0 1rem" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <Brand />
        <span className="p-eyebrow">HESABINA GİRİŞ</span>
      </div>

      <PCard>
        <h1 className="p-h3" style={{ margin: "0 0 1.25rem" }}>
          Tekrar hoş geldin
        </h1>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <PField label="E-posta" htmlFor="g-email">
            <PInput id="g-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </PField>
          <PField label="Şifre" htmlFor="g-pass">
            <PInput id="g-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </PField>
          {error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <PAlert tone="error">{error}</PAlert>
              <p style={{ fontSize: "0.85rem", color: "var(--poster-ink-3)", margin: 0 }}>
                E-postanı doğrulamadın mı?{" "}
                <Link href={`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="p-link">
                  Doğrulama linkini tekrar gönder
                </Link>
              </p>
            </div>
          )}
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
