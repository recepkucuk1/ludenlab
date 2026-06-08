"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PAlert, PButton, PCard, PField, PInput, PSpinner } from "@ludenlab/ui";

function Brand() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <svg width={30} height={30} viewBox="0 0 32 32" fill="none" stroke="var(--poster-accent)" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        <ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(34 16 16)" />
        <ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(-34 16 16)" />
      </svg>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 21, color: "var(--poster-deep-teal)", letterSpacing: "-0.02em" }}>
        LudenLab
      </span>
    </span>
  );
}

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
      await signIn("credentials", { email, password, redirect: false }); // otomatik giriş
      const cb = new URLSearchParams(window.location.search).get("callbackUrl") || "/";
      router.push(cb);
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı.");
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 440, margin: "clamp(2rem, 8vh, 5rem) auto", padding: "0 1rem" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <Brand />
        <span className="p-eyebrow">LUDENLAB HESABI</span>
      </div>

      <PCard>
        <h1 className="p-h3" style={{ margin: "0 0 6px" }}>
          Kayıt ol
        </h1>
        <p className="p-body" style={{ margin: "0 0 1.25rem" }}>
          Tek hesapla tüm LudenLab modülleri (Stüdyo · Atölye · BRY Takip).
        </p>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <PField label="Ad soyad" htmlFor="k-name">
            <PInput id="k-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </PField>
          <PField label="E-posta" htmlFor="k-email">
            <PInput id="k-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </PField>
          <PField label="Şifre" hint="en az 8 karakter" htmlFor="k-pass">
            <PInput id="k-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
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
        <p style={{ marginTop: "1.25rem", fontSize: "0.9rem", color: "var(--poster-ink-3)" }}>
          Zaten hesabın var mı?{" "}
          <Link href="/giris" className="p-link">
            Giriş yap
          </Link>
        </p>
      </PCard>
    </div>
  );
}
