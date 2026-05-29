"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PAlert, PButton, PCard, PField, PInput, PSpinner } from "@ludenlab/ui";

export default function KayitPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Kayıt başarısız.");
        setLoading(false);
        return;
      }
      // Otomatik giriş
      await signIn("credentials", { email, password, redirect: false });
      router.push("/");
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı.");
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "2rem auto" }}>
      <PCard>
        <h1 style={{ fontSize: "1.5rem", margin: "0 0 1.25rem" }}>Kayıt ol</h1>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <PField label="Ad soyad" htmlFor="k-name">
            <PInput id="k-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </PField>
          <PField label="E-posta" htmlFor="k-email">
            <PInput
              id="k-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </PField>
          <PField label="Şifre" hint="en az 8 karakter" htmlFor="k-pass">
            <PInput
              id="k-pass"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </PField>
          {error && <PAlert tone="error">{error}</PAlert>}
          <PButton type="submit" size="lg" disabled={loading}>
            {loading ? (
              <>
                <PSpinner /> Hesap oluşturuluyor…
              </>
            ) : (
              "Kayıt ol"
            )}
          </PButton>
        </form>
        <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--poster-ink-3)" }}>
          Zaten hesabın var mı?{" "}
          <Link href="/giris" style={{ color: "var(--poster-accent)", fontWeight: 700 }}>
            Giriş yap
          </Link>
        </p>
      </PCard>
    </div>
  );
}
