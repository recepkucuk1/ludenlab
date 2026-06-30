"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Logo, PButton } from "@ludenlab/ui";
import { AuthShell, AuthInput, AuthLabel, AuthAlert, PasswordMeter } from "@/components/auth/AuthShell";

function ResetForm() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
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
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) {
        setError(d.error || "Şifre sıfırlanamadı. Linkin süresi dolmuş olabilir.");
        return;
      }
      setDone(true);
    } catch {
      setError("Bağlantı hatası, tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  const title = (text: string) => (
    <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(24px,6vw,30px)", letterSpacing: "-.02em", color: "var(--poster-ink)", margin: 0 }}>
      {text}
    </h1>
  );

  // Token yoksa: doğrudan/eksik erişim → sıfırlamayı yeniden başlat.
  if (!token) {
    return (
      <AuthShell>
        <div className="auth-mobile-logo" style={{ justifyContent: "center", marginBottom: 24 }}>
          <Link href="/">
            <Logo height={44} />
          </Link>
        </div>
        <div style={{ marginBottom: 20 }}>{title("Geçersiz link")}</div>
        <AuthAlert tone="error">
          Sıfırlama linki eksik ya da geçersiz. Lütfen yeni bir sıfırlama linki talep et.
        </AuthAlert>
        <p style={{ textAlign: "center", fontSize: 14, marginTop: 20, fontFamily: "var(--font-display)" }}>
          <Link href="/sifremi-unuttum" style={{ color: "var(--poster-accent)", fontWeight: 700 }}>
            Yeni link talep et
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="auth-mobile-logo" style={{ justifyContent: "center", marginBottom: 24 }}>
        <Link href="/">
          <Logo height={44} />
        </Link>
      </div>

      {done ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>{title("Şifren güncellendi 🎉")}</div>
          <AuthAlert tone="success">
            Yeni şifren kaydedildi. Artık yeni şifrenle giriş yapabilirsin.
          </AuthAlert>
          <Link href="/giris" style={{ display: "block" }}>
            <PButton size="lg" style={{ width: "100%" }}>
              Giriş yap
            </PButton>
          </Link>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 28 }}>
            {title("Yeni şifre belirle")}
            <p style={{ marginTop: 6, fontSize: 14, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
              Hesabın için yeni bir şifre oluştur.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <AuthLabel htmlFor="r-pass">Yeni şifre</AuthLabel>
              <div style={{ position: "relative" }}>
                <AuthInput
                  id="r-pass"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="En az 8 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--poster-ink-2)", display: "inline-flex", padding: 6 }}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <PasswordMeter password={password} />
            </div>

            <div>
              <AuthLabel htmlFor="r-pass2">Yeni şifre (tekrar)</AuthLabel>
              <AuthInput
                id="r-pass2"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Şifreyi tekrar gir"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                invalid={confirm.length > 0 && confirm !== password}
              />
            </div>

            {error && <AuthAlert tone="error">{error}</AuthAlert>}

            <PButton type="submit" size="lg" disabled={loading || !password || !confirm} style={{ width: "100%", marginTop: 4 }}>
              {loading ? "Kaydediliyor…" : "Şifreyi güncelle"}
            </PButton>

            <p style={{ textAlign: "center", fontSize: 14, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
              <Link href="/giris" style={{ fontWeight: 700, color: "var(--poster-accent)" }}>
                ← Giriş sayfasına dön
              </Link>
            </p>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
