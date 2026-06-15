"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { PBtn } from "@/components/landing/poster-ui";
import { PSpinner } from "@/components/poster";
import {
  PosterAuthShell,
  PosterInput,
  PosterLabel,
  PosterAlert,
} from "@/components/auth/PosterAuthShell";
import { PasswordStrengthBar } from "@/components/auth/PasswordStrengthBar";

type TokenStatus = "checking" | "valid" | "invalid" | "expired";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("checking");

  useEffect(() => {
    fetch(`/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setTokenStatus("valid");
        } else if (data.reason === "expired") {
          setTokenStatus("expired");
        } else {
          setTokenStatus("invalid");
        }
      })
      .catch(() => setTokenStatus("invalid"));
  }, [token]);

  const passwordsMismatch =
    passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordsMatch =
    passwordConfirm.length > 0 && password.length > 0 && password === passwordConfirm;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Bir hata oluştu.");
        return;
      }

      router.push("/login?reset=success");
    } catch {
      setError("Bağlantı hatası, tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PosterAuthShell
      heading="Yeni şifre, yeni başlangıç."
      subheading="Hesabına tekrar güvenli erişim için güçlü bir şifre belirle."
      eyebrow="Şifre yenileme"
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

      {tokenStatus === "checking" && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <PSpinner size={36} label="Link doğrulanıyor…" style={{ display: "flex" }} />
        </div>
      )}

      {(tokenStatus === "invalid" || tokenStatus === "expired") && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 56,
              width: 56,
              borderRadius: 16,
              background: "#ffe9e9",
              border: "2px solid #c53030",
              boxShadow: "0 4px 0 #c53030",
              marginBottom: 18,
              color: "#c53030",
            }}
          >
            <X size={28} strokeWidth={2.6} />
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(22px, 5.5vw, 26px)",
              letterSpacing: "-.02em",
              color: "var(--poster-ink)",
              margin: "0 0 8px",
            }}
          >
            {tokenStatus === "expired" ? "Linkin süresi dolmuş" : "Link geçersiz"}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--poster-ink-2)",
              fontFamily: "var(--font-display)",
              marginBottom: 24,
            }}
          >
            {tokenStatus === "expired"
              ? "Güvenlik nedeniyle sıfırlama linkleri 30 dakika sonra geçersiz olur."
              : "Bu link kullanılmış veya hiç oluşturulmamış olabilir."}
          </p>
          <Link href="/forgot-password" style={{ textDecoration: "none" }}>
            <PBtn variant="accent" size="md">
              Yeni Link Talep Et
            </PBtn>
          </Link>
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
        </div>
      )}

      {tokenStatus === "valid" && (
        <>
          <div style={{ marginBottom: 28 }}>
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
              Yeni Şifre Belirle
            </h1>
            <p
              style={{
                marginTop: 6,
                fontSize: 14,
                color: "var(--poster-ink-2)",
                fontFamily: "var(--font-display)",
              }}
            >
              En az 8 karakter kullanın.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <PosterLabel htmlFor="password">Yeni Şifre</PosterLabel>
              <div style={{ position: "relative" }}>
                <PosterInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="En az 8 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                  disabled={loading}
                  autoComplete="new-password"
                  style={{ paddingRight: 44, opacity: loading ? 0.6 : 1 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--poster-ink-2)",
                    display: "inline-flex",
                    padding: 6,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div style={{ marginTop: 8 }}>
                <PasswordStrengthBar password={password} />
              </div>
            </div>

            <div>
              <PosterLabel htmlFor="passwordConfirm">Şifre Tekrar</PosterLabel>
              <div style={{ position: "relative" }}>
                <PosterInput
                  id="passwordConfirm"
                  type={showPasswordConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                  autoComplete="new-password"
                  invalid={passwordsMismatch}
                  style={{ paddingRight: 44, opacity: loading ? 0.6 : 1 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  aria-label={showPasswordConfirm ? "Şifreyi gizle" : "Şifreyi göster"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--poster-ink-2)",
                    display: "inline-flex",
                    padding: 6,
                  }}
                >
                  {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordsMismatch && (
                <p
                  style={{
                    marginTop: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: "#c53030",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  <X size={14} /> Şifreler eşleşmiyor
                </p>
              )}
              {passwordsMatch && (
                <p
                  style={{
                    marginTop: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: "var(--poster-green)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  <Check size={14} /> Şifreler eşleşiyor
                </p>
              )}
            </div>

            {error && <PosterAlert tone="error">{error}</PosterAlert>}

            <PBtn
              type="submit"
              variant="dark"
              size="md"
              disabled={loading || passwordsMismatch || password.length < 8}
              style={{
                width: "100%",
                marginTop: 4,
                opacity: loading || passwordsMismatch || password.length < 8 ? 0.7 : 1,
              }}
            >
              {loading ? "Güncelleniyor…" : "Şifreyi Güncelle"}
            </PBtn>
          </form>

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
        </>
      )}

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
