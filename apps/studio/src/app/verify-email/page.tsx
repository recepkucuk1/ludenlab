"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Check, X, Mail } from "lucide-react";
import { ForceLightTheme } from "@/components/ForceLightTheme";
import { PosterAuthShell, PBtn, PInput, PLabel, PAlert, PSpinner } from "@/components/poster";

type Status = "pending" | "loading" | "success" | "error" | "signing-in";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const emailFromUrl = searchParams.get("email");

  const [status, setStatus] = useState<Status>(token ? "loading" : "pending");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState(emailFromUrl ?? "");
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const emailLocked = Boolean(emailFromUrl);

  async function handleResend() {
    if (!resendEmail) return;
    setResendLoading(true);
    setResendError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      if (!res.ok) {
        const data = await res.json();
        setResendError(data.error || "Bir hata oluştu, tekrar deneyin.");
        return;
      }
      setResendSent(true);
    } catch {
      setResendError("Bağlantı hatası, tekrar deneyin.");
    } finally {
      setResendLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled) return;

        if (!data.success) {
          setStatus("error");
          setMessage(data.error ?? "Doğrulama başarısız oldu.");
          return;
        }

        if (data.alreadyVerified) {
          setStatus("success");
          return;
        }

        if (data.autoLoginToken) {
          setStatus("signing-in");
          const result = await signIn("credentials", {
            autoLoginToken: data.autoLoginToken,
            redirect: false,
          });
          if (cancelled) return;
          if (result?.error) {
            setStatus("success");
            return;
          }
          router.push("/dashboard");
          router.refresh();
          return;
        }

        setStatus("success");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Bir hata oluştu. Lütfen tekrar deneyin.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <PosterAuthShell
      heading="Son bir adım kaldı"
      subheading="Email adresini doğrulayıp hesabını aktifleştirelim."
    >
      {/* PENDING — inbox check */}
      {status === "pending" && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 16px",
              borderRadius: 16,
              background: "var(--poster-yellow)",
              border: "2px solid var(--poster-ink)",
              boxShadow: "0 4px 0 var(--poster-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Mail style={{ width: 28, height: 28, color: "var(--poster-ink)" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--poster-ink)", margin: "0 0 8px", fontFamily: "var(--font-display)" }}>
            Email adresini doğrula
          </h1>
          <p style={{ fontSize: 14, color: "var(--poster-ink-2)", lineHeight: 1.55, margin: "0 0 8px", fontFamily: "var(--font-display)" }}>
            {emailFromUrl ? (
              <>
                <strong style={{ color: "var(--poster-ink)" }}>{emailFromUrl}</strong> adresine bir doğrulama linki gönderdik.
              </>
            ) : (
              "Email adresine bir doğrulama linki gönderdik."
            )}{" "}
            Linke tıklayarak hesabını aktifleştir.
          </p>
          <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: "0 0 24px", fontFamily: "var(--font-display)" }}>
            Link 24 saat süreyle geçerlidir.
          </p>

          <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <PLabel htmlFor="resendEmail">Email</PLabel>
              <PInput
                id="resendEmail"
                type="email"
                placeholder="ad@klinik.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                readOnly={emailLocked}
                style={emailLocked ? { background: "var(--poster-bg-2)", cursor: "not-allowed" } : undefined}
              />
            </div>

            {resendSent ? (
              <PAlert tone="success">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Check size={16} /> Yeni link gönderildi
                </span>
              </PAlert>
            ) : (
              <>
                {resendError && <PAlert tone="error">{resendError}</PAlert>}
                <PBtn
                  type="button"
                  variant="dark"
                  size="md"
                  onClick={handleResend}
                  disabled={resendLoading || !resendEmail}
                  style={{ width: "100%" }}
                >
                  {resendLoading ? "Gönderiliyor…" : "Linki tekrar gönder"}
                </PBtn>
              </>
            )}
          </div>

          <p style={{ marginTop: 24, fontSize: 12, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
            Email gelmezse spam klasörünü kontrol edin.
          </p>
          <p style={{ marginTop: 16, fontSize: 14, fontFamily: "var(--font-display)" }}>
            <Link href="/login" style={{ color: "var(--poster-accent)", fontWeight: 700, textDecoration: "none" }}>
              ← Giriş sayfasına dön
            </Link>
          </p>
        </div>
      )}

      {/* LOADING */}
      {status === "loading" && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <PSpinner size={40} label="Email doğrulanıyor…" style={{ display: "flex" }} />
        </div>
      )}

      {/* SIGNING-IN */}
      {status === "signing-in" && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <PSpinner size={40} label="Giriş yapılıyor…" style={{ display: "flex" }} />
          <p style={{ marginTop: 4, fontSize: 12, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
            Seni yönlendiriyoruz.
          </p>
        </div>
      )}

      {/* SUCCESS */}
      {status === "success" && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 16px",
              borderRadius: 16,
              background: "var(--poster-green)",
              border: "2px solid var(--poster-ink)",
              boxShadow: "0 4px 0 var(--poster-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check style={{ width: 28, height: 28, color: "#fff" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--poster-ink)", margin: "0 0 8px", fontFamily: "var(--font-display)" }}>
            Email doğrulandı!
          </h1>
          <p style={{ fontSize: 14, color: "var(--poster-ink-2)", margin: "0 0 24px", fontFamily: "var(--font-display)" }}>
            Hesabın aktif. Artık giriş yapabilirsin.
          </p>
          <PBtn as="a" href="/login?verified=1" variant="accent" size="md">
            Giriş Yap
          </PBtn>
        </div>
      )}

      {/* ERROR */}
      {status === "error" && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 16px",
              borderRadius: 16,
              background: "var(--poster-pink)",
              border: "2px solid var(--poster-ink)",
              boxShadow: "0 4px 0 var(--poster-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X style={{ width: 28, height: 28, color: "#fff" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--poster-ink)", margin: "0 0 8px", fontFamily: "var(--font-display)" }}>
            Doğrulama başarısız
          </h1>
          <p style={{ fontSize: 14, color: "var(--poster-ink-2)", margin: "0 0 20px", fontFamily: "var(--font-display)" }}>
            {message}
          </p>

          {resendSent ? (
            <div style={{ marginBottom: 16 }}>
              <PAlert tone="success">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Check size={16} /> Yeni doğrulama emaili gönderildi
                </span>
              </PAlert>
            </div>
          ) : (
            <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <div>
                <PLabel htmlFor="resendEmailError">Email</PLabel>
                <PInput
                  id="resendEmailError"
                  type="email"
                  placeholder="ad@klinik.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  readOnly={emailLocked}
                  style={emailLocked ? { background: "var(--poster-bg-2)", cursor: "not-allowed" } : undefined}
                />
              </div>
              {resendError && <PAlert tone="error">{resendError}</PAlert>}
              <PBtn
                type="button"
                variant="accent"
                size="md"
                onClick={handleResend}
                disabled={resendLoading || !resendEmail}
                style={{ width: "100%" }}
              >
                {resendLoading ? "Gönderiliyor…" : "Yeni doğrulama emaili gönder"}
              </PBtn>
            </div>
          )}

          <p style={{ fontSize: 14, fontFamily: "var(--font-display)" }}>
            <Link href="/login" style={{ color: "var(--poster-ink-3)", fontWeight: 600, textDecoration: "none" }}>
              ← Giriş sayfasına dön
            </Link>
          </p>
        </div>
      )}
    </PosterAuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <ForceLightTheme />
      <Suspense
        fallback={
          <div className="poster-scope">
            <PSpinner fullPanel style={{ minHeight: "100vh" }} />
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </>
  );
}
