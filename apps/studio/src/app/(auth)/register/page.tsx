"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { PBtn } from "@/components/landing/poster-ui";
import {
  PosterAuthShell,
  PosterInput,
  PosterLabel,
  PosterAlert,
} from "@/components/auth/PosterAuthShell";
import { PasswordStrengthBar } from "@/components/auth/PasswordStrengthBar";
import { PFieldHint } from "@/components/poster";

// CAPTCHA geçici olarak kapalı; tekrar açmak için .env'de NEXT_PUBLIC_CAPTCHA_ENABLED=true.
const captchaEnabled = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === "true";

export default function RegisterPage() {
  const router = useRouter();
  const captchaRef = useRef<HCaptcha>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const nameFieldError = !name.trim() ? "Ad Soyad gerekli" : null;
  const emailFieldError = !email
    ? "Email gerekli"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? "Geçerli bir email adresi girin"
    : null;
  const passwordFieldError = !password
    ? "Şifre gerekli"
    : password.length < 8
    ? "En az 8 karakter olmalı"
    : null;

  const showNameError = nameTouched && nameFieldError;
  const showEmailError = emailTouched && emailFieldError;
  const showPasswordError = passwordTouched && passwordFieldError;

  const passwordsMismatch =
    passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordsMatch =
    passwordConfirm.length > 0 && password.length > 0 && password === passwordConfirm;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNameTouched(true);
    setEmailTouched(true);
    setPasswordTouched(true);

    if (nameFieldError || emailFieldError || passwordFieldError) {
      return;
    }

    setError(null);
    setLoading(true);

    if (password !== passwordConfirm) {
      setError("Şifreler eşleşmiyor.");
      setLoading(false);
      return;
    }

    if (captchaEnabled && !captchaToken) {
      setError("Lütfen CAPTCHA doğrulamasını tamamlayın.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, captchaToken }),
    });

    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Kayıt sırasında hata oluştu.");
      setLoading(false);
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <PosterAuthShell
      heading="Aramıza katıl."
      subheading="Ücretsiz hesap oluştur, öğrenci takibi ve kişiselleştirilmiş materyaller üretmeye başla."
      eyebrow="Kayıt"
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
          Hesap Oluştur
        </h1>
        <p
          style={{
            marginTop: 6,
            fontSize: 14,
            color: "var(--poster-ink-2)",
            fontFamily: "var(--font-display)",
          }}
        >
          LudenLab&apos;a ücretsiz kaydol
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <PosterLabel htmlFor="name" required>Ad Soyad</PosterLabel>
          <PosterInput
            id="name"
            name="name"
            type="text"
            placeholder="Dr. Ayşe Yılmaz"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            autoComplete="name"
            invalid={!!showNameError}
            aria-invalid={!!showNameError}
            aria-describedby={showNameError ? "name-error" : undefined}
          />
          {showNameError && (
            <PFieldHint tone="error" style={{ marginTop: 6 }}>
              <span id="name-error">{nameFieldError}</span>
            </PFieldHint>
          )}
        </div>

        <div>
          <PosterLabel htmlFor="email" required>Email</PosterLabel>
          <PosterInput
            id="email"
            name="email"
            type="email"
            placeholder="ad@klinik.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            autoComplete="email"
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
          <PosterLabel htmlFor="password" required>Şifre</PosterLabel>
          <div style={{ position: "relative" }}>
            <PosterInput
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="En az 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              minLength={8}
              autoComplete="new-password"
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
          {showPasswordError ? (
            <PFieldHint tone="error" style={{ marginTop: 6 }}>
              <span id="password-error">{passwordFieldError}</span>
            </PFieldHint>
          ) : (
            <div style={{ marginTop: 8 }}>
              <PasswordStrengthBar password={password} />
            </div>
          )}
        </div>

        <div>
          <PosterLabel htmlFor="passwordConfirm" required>Şifre Tekrar</PosterLabel>
          <div style={{ position: "relative" }}>
            <PosterInput
              id="passwordConfirm"
              name="passwordConfirm"
              type={showPasswordConfirm ? "text" : "password"}
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              invalid={passwordsMismatch}
              style={{ paddingRight: 44 }}
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

        {captchaEnabled && (
          <HCaptcha
            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? ""}
            onVerify={setCaptchaToken}
            onError={(err) => console.error("[hCaptcha] error:", err)}
            onExpire={() => {
              console.warn("[hCaptcha] expired");
              setCaptchaToken(null);
            }}
            ref={captchaRef}
            theme="light"
          />
        )}

        {error && <PosterAlert tone="error">{error}</PosterAlert>}

        <PBtn
          type="submit"
          variant="dark"
          size="md"
          disabled={loading || (captchaEnabled && !captchaToken)}
          style={{
            width: "100%",
            marginTop: 4,
            opacity: loading || (captchaEnabled && !captchaToken) ? 0.7 : 1,
          }}
        >
          {loading ? "Hesap oluşturuluyor…" : "Kayıt Ol"}
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
        Zaten hesabın var mı?{" "}
        <Link
          href="/login"
          style={{ fontWeight: 700, color: "var(--poster-accent)", textDecoration: "underline" }}
        >
          Giriş yap
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
