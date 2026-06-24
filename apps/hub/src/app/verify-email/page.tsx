"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo, PAlert, PButton, PCard, PField, PInput, PSpinner } from "@ludenlab/ui";

type Status = "pending" | "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailFromUrl = searchParams.get("email");

  const [status, setStatus] = useState<Status>(token ? "loading" : "pending");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState(emailFromUrl ?? "");
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  // token varsa: doğrulama ucunu çağır.
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
  }, [token]);

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
        const d = await res.json().catch(() => ({}));
        setResendError(d.error || "Bir hata oluştu, tekrar deneyin.");
        return;
      }
      setResendSent(true);
    } catch {
      setResendError("Bağlantı hatası, tekrar deneyin.");
    } finally {
      setResendLoading(false);
    }
  }

  const showResend = status === "pending" || status === "error";

  return (
    <div style={{ maxWidth: 440, margin: "clamp(2rem, 8vh, 5rem) auto", padding: "0 1rem" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <Logo height={34} />
        <span className="p-eyebrow">E-POSTA DOĞRULAMA</span>
      </div>

      <PCard>
        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <PSpinner />
            <p className="p-body" style={{ marginTop: 12, color: "var(--poster-ink-3)" }}>
              E-posta doğrulanıyor…
            </p>
          </div>
        )}

        {status === "success" && (
          <div style={{ textAlign: "center" }}>
            <h1 className="p-h3" style={{ margin: "0 0 8px" }}>
              E-postan doğrulandı 🎉
            </h1>
            <p className="p-body" style={{ color: "var(--poster-ink-3)", margin: "0 0 20px" }}>
              Hesabın aktif. Artık giriş yapabilirsin.
            </p>
            <Link href="/giris" style={{ display: "block" }}>
              <PButton size="lg" style={{ width: "100%" }}>
                Giriş yap
              </PButton>
            </Link>
          </div>
        )}

        {status === "pending" && (
          <>
            <h1 className="p-h3" style={{ margin: "0 0 6px" }}>
              E-postanı kontrol et
            </h1>
            <p className="p-body" style={{ color: "var(--poster-ink-3)", margin: "0 0 4px" }}>
              {emailFromUrl ? (
                <>
                  <strong style={{ color: "var(--poster-ink)" }}>{emailFromUrl}</strong> adresine bir
                  doğrulama linki gönderdik.
                </>
              ) : (
                "E-posta adresine bir doğrulama linki gönderdik."
              )}{" "}
              Linke tıklayarak hesabını aktifleştir.
            </p>
            <p style={{ fontSize: "0.82rem", color: "var(--poster-ink-3)", margin: "0 0 16px" }}>
              Link 24 saat geçerlidir. Gelmezse spam klasörünü kontrol et.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="p-h3" style={{ margin: "0 0 10px" }}>
              Doğrulanamadı
            </h1>
            <PAlert tone="error">{message}</PAlert>
            <p className="p-body" style={{ color: "var(--poster-ink-3)", margin: "16px 0 8px" }}>
              Yeni bir doğrulama linki gönderelim:
            </p>
          </>
        )}

        {showResend && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
            <PField label="E-posta" htmlFor="resend-email">
              <PInput
                id="resend-email"
                type="email"
                autoComplete="email"
                placeholder="ad@ornek.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
              />
            </PField>
            {resendSent ? (
              <PAlert tone="success">
                Yeni doğrulama linki gönderildi. Gelen kutunu (ve spam&apos;i) kontrol et.
              </PAlert>
            ) : (
              <>
                {resendError && <PAlert tone="error">{resendError}</PAlert>}
                <PButton type="button" onClick={handleResend} disabled={resendLoading || !resendEmail}>
                  {resendLoading ? "Gönderiliyor…" : "Doğrulama linkini tekrar gönder"}
                </PButton>
              </>
            )}
            <p style={{ textAlign: "center", marginTop: 4, fontSize: "0.9rem" }}>
              <Link href="/giris" className="p-link">
                ← Giriş sayfasına dön
              </Link>
            </p>
          </div>
        )}
      </PCard>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
