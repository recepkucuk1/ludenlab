"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { PBtn } from "@/components/landing/poster-ui";
import {
  PosterAuthShell,
  PosterInput,
  PosterLabel,
  PosterAlert,
} from "@/components/auth/PosterAuthShell";
import { PFieldHint } from "@/components/poster";

type LoginErrorCode =
  | "INVALID_CREDENTIALS"
  | "RATE_LIMIT"
  | "EMAIL_NOT_VERIFIED"
  | "SUSPENDED"
  | "UNKNOWN";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const verifiedSuccess = searchParams.get("verified") === "1";

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [errorCode, setErrorCode] = useState<LoginErrorCode | null>(null);
  const [loading, setLoading] = useState(false);

  const emailFieldError = !email
    ? "Email gerekli"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? "Geçerli bir email adresi girin"
    : null;
  const passwordFieldError = !password ? "Şifre gerekli" : null;
  const showEmailError = emailTouched && emailFieldError;
  const showPasswordError = passwordTouched && passwordFieldError;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    if (emailFieldError || passwordFieldError) return;
    setErrorCode(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      const code = (result.code ?? "").toUpperCase();
      if (
        code === "RATE_LIMIT" ||
        code === "EMAIL_NOT_VERIFIED" ||
        code === "SUSPENDED" ||
        code === "INVALID_CREDENTIALS"
      ) {
        setErrorCode(code);
      } else {
        setErrorCode("UNKNOWN");
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <PosterAuthShell
      heading="Tekrar hoş geldin."
      subheading="Öğrencilerine ait çalışmalara ve raporlara bir adım uzaktasın."
      eyebrow="Giriş"
    >
      {/* Mobile logo */}
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
          Giriş Yap
        </h1>
        <p
          style={{
            marginTop: 6,
            fontSize: 14,
            color: "var(--poster-ink-2)",
            fontFamily: "var(--font-display)",
          }}
        >
          Hesabınla devam et
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <PosterLabel htmlFor="email" required>Email</PosterLabel>
          <PosterInput
            id="email"
            type="email"
            placeholder="ad@klinik.com"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            invalid={!!showEmailError}
            aria-invalid={!!showEmailError}
            aria-describedby={showEmailError ? "email-error" : undefined}
          />
          {showEmailError && (
            <PFieldHint tone="error" style={{ marginTop: 6 }}>
              <span id="email-error">{emailFieldError}</span>
            </PFieldHint>
          )}
        </div>

        <div>
          <PosterLabel
            htmlFor="password"
            required
            rightSlot={
              <Link
                href="/forgot-password"
                style={{
                  fontSize: 12,
                  color: "var(--poster-accent)",
                  fontWeight: 600,
                  fontFamily: "var(--font-display)",
                }}
              >
                Şifremi unuttum
              </Link>
            }
          >
            Şifre
          </PosterLabel>
          <div style={{ position: "relative" }}>
            <PosterInput
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              autoComplete="current-password"
              invalid={!!showPasswordError}
              aria-invalid={!!showPasswordError}
              aria-describedby={showPasswordError ? "password-error" : undefined}
              style={{ paddingRight: 44 }}
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
          {showPasswordError && (
            <PFieldHint tone="error" style={{ marginTop: 6 }}>
              <span id="password-error">{passwordFieldError}</span>
            </PFieldHint>
          )}
        </div>

        {verifiedSuccess && (
          <PosterAlert tone="success">
            Email adresiniz doğrulandı. Giriş yapabilirsiniz.
          </PosterAlert>
        )}

        {resetSuccess && (
          <PosterAlert tone="success">
            Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
          </PosterAlert>
        )}

        {errorCode === "INVALID_CREDENTIALS" && (
          <PosterAlert tone="error">Email veya şifre hatalı.</PosterAlert>
        )}

        {errorCode === "RATE_LIMIT" && (
          <PosterAlert tone="error">
            Çok fazla başarısız deneme. Lütfen 15 dakika sonra tekrar deneyin.
          </PosterAlert>
        )}

        {errorCode === "EMAIL_NOT_VERIFIED" && (
          <PosterAlert tone="warning">
            Email adresiniz henüz doğrulanmamış.{" "}
            <Link
              href={`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              style={{ fontWeight: 700, textDecoration: "underline" }}
            >
              Doğrulama linkini tekrar gönder
            </Link>
          </PosterAlert>
        )}

        {errorCode === "SUSPENDED" && (
          <PosterAlert tone="error">
            Hesabınız askıya alınmış. Destek ekibiyle iletişime geçin.
          </PosterAlert>
        )}

        {errorCode === "UNKNOWN" && (
          <PosterAlert tone="error">Bir hata oluştu. Lütfen tekrar deneyin.</PosterAlert>
        )}

        <PBtn
          type="submit"
          variant="dark"
          size="md"
          disabled={loading}
          style={{ width: "100%", marginTop: 4, opacity: loading ? 0.8 : 1 }}
        >
          {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
        </PBtn>
      </form>

      <div
        style={{
          textAlign: "center",
          fontSize: 14,
          color: "var(--poster-ink-2)",
          marginTop: 24,
          fontFamily: "var(--font-display)",
        }}
      >
        Hesabın yok mu?{" "}
        <Link
          href="/register"
          style={{ fontWeight: 700, color: "var(--poster-accent)", textDecoration: "underline" }}
        >
          Kayıt ol
        </Link>
      </div>

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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
