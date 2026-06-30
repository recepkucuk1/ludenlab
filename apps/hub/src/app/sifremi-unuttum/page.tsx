"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo, PButton } from "@ludenlab/ui";
import { AuthShell, AuthInput, AuthLabel, AuthAlert, type AuthModule } from "@/components/auth/AuthShell";

function ForgotForm() {
  const sp = useSearchParams();
  const m = sp.get("module")?.toLowerCase();
  const module: AuthModule = m === "studio" ? "studio" : m === "atolye" ? "atolye" : "generic";
  const moduleQuery = module === "generic" ? "" : `?module=${module}`;

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Çok fazla istek. Lütfen biraz bekleyin.");
        return;
      }
      if (!res.ok) {
        setError("Bir hata oluştu, lütfen tekrar deneyin.");
        return;
      }
      // Enumeration güvenli: hesap olsa da olmasa da sunucu success döner → aynı mesaj.
      setSent(true);
    } catch {
      setError("Bağlantı hatası, tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell module={module}>
      <div className="auth-mobile-logo" style={{ justifyContent: "center", marginBottom: 24 }}>
        <Link href="/">
          <Logo height={44} />
        </Link>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(24px,6vw,30px)", letterSpacing: "-.02em", color: "var(--poster-ink)", margin: 0 }}>
          Şifreni mi unuttun?
        </h1>
        <p style={{ marginTop: 6, fontSize: 14, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
          Hesabının e-posta adresini gir; sana bir sıfırlama linki gönderelim.
        </p>
      </div>

      {sent ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AuthAlert tone="success">
            Eğer <strong>{email}</strong> bir LudenLab hesabına bağlıysa, şifre sıfırlama linkini
            gönderdik. Gelen kutunu (ve spam klasörünü) kontrol et — link 1 saat geçerlidir.
          </AuthAlert>
          <p style={{ textAlign: "center", fontSize: 14, fontFamily: "var(--font-display)" }}>
            <Link href={`/giris${moduleQuery}`} style={{ color: "var(--poster-accent)", fontWeight: 700 }}>
              ← Giriş sayfasına dön
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <AuthLabel htmlFor="f-email">E-posta</AuthLabel>
            <AuthInput
              id="f-email"
              type="email"
              autoComplete="email"
              placeholder="ad@ornek.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && <AuthAlert tone="error">{error}</AuthAlert>}

          <PButton type="submit" size="lg" disabled={loading || !email} style={{ width: "100%", marginTop: 4 }}>
            {loading ? "Gönderiliyor…" : "Sıfırlama linki gönder"}
          </PButton>

          <p style={{ textAlign: "center", fontSize: 14, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
            Şifreni hatırladın mı?{" "}
            <Link href={`/giris${moduleQuery}`} style={{ fontWeight: 700, color: "var(--poster-accent)" }}>
              Giriş yap
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
