"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Logo, PButton } from "@ludenlab/ui";
import { AuthShell, AuthInput, AuthLabel, AuthAlert, type AuthModule } from "@/components/auth/AuthShell";

function GirisForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const m = sp.get("module")?.toLowerCase();
  const module: AuthModule = m === "studio" ? "studio" : m === "atolye" ? "atolye" : "generic";
  const moduleQuery = module === "generic" ? "" : `?module=${module}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    const cb = sp.get("callbackUrl") || "/hesap";
    router.push(cb);
    router.refresh();
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
          Giriş Yap
        </h1>
        <p style={{ marginTop: 6, fontSize: 14, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
          Hesabınla devam et
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <AuthLabel htmlFor="g-email">E-posta</AuthLabel>
          <AuthInput id="g-email" type="email" autoComplete="email" placeholder="ad@ornek.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <AuthLabel
            htmlFor="g-pass"
            rightSlot={
              <Link
                href={`/sifremi-unuttum${moduleQuery}`}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--poster-accent)", fontFamily: "var(--font-display)" }}
              >
                Şifremi unuttum?
              </Link>
            }
          >
            Şifre
          </AuthLabel>
          <div style={{ position: "relative" }}>
            <AuthInput
              id="g-pass"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--poster-ink-2)", display: "inline-flex", padding: 6 }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <AuthAlert tone="error">{error}</AuthAlert>
            <p style={{ fontSize: "0.85rem", color: "var(--poster-ink-3)", margin: 0, fontFamily: "var(--font-display)" }}>
              E-postanı doğrulamadın mı?{" "}
              <Link href={`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`} style={{ color: "var(--poster-accent)", fontWeight: 700 }}>
                Doğrulama linkini tekrar gönder
              </Link>
            </p>
          </div>
        )}

        <PButton type="submit" size="lg" disabled={loading} style={{ width: "100%", marginTop: 4 }}>
          {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
        </PButton>
      </form>

      <p style={{ textAlign: "center", fontSize: 14, color: "var(--poster-ink-2)", marginTop: 24, fontFamily: "var(--font-display)" }}>
        Hesabın yok mu?{" "}
        <Link href={`/kayit${moduleQuery}`} style={{ fontWeight: 700, color: "var(--poster-accent)" }}>
          Kayıt ol
        </Link>
      </p>
    </AuthShell>
  );
}

export default function GirisPage() {
  return (
    <Suspense>
      <GirisForm />
    </Suspense>
  );
}
