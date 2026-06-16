"use client";

import { XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PBtn, PCard } from "@studio/components/poster";

function ErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const getReasonMessage = () => {
    switch (reason) {
      case "missing_token":
        return "Ödeme işlemi sırasında doğrulama anahtarı alınamadı.";
      case "user_not_found":
        return "Ödeme hesabı bulunamadı. Lütfen giriş yaptığınızı doğrulayın.";
      case "plan_not_found":
        return "Seçilen abonelik planı artık geçerli değil.";
      case "internal_error":
        return "Sistemde bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
      default:
        return reason ? decodeURIComponent(reason) : "Ödeme başarısız oldu veya işlem reddedildi.";
    }
  };

  return (
    <div
      className="poster-scope"
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        textAlign: "center",
      }}
    >
      <PCard rounded={20} style={{ maxWidth: 440, width: "100%", padding: 40, background: "var(--poster-panel)" }}>
        <div
          style={{
            width: 72,
            height: 72,
            margin: "0 auto 20px",
            borderRadius: 18,
            background: "var(--poster-pink)",
            border: "2px solid var(--poster-ink)",
            boxShadow: "0 4px 0 var(--poster-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <XCircle style={{ width: 36, height: 36, color: "#fff" }} />
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "var(--poster-ink)",
            margin: "0 0 10px",
            fontFamily: "var(--font-display)",
            letterSpacing: "-.02em",
          }}
        >
          İşlem Tamamlanamadı
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--poster-ink-2)",
            margin: "0 0 28px",
            fontFamily: "var(--font-display)",
          }}
        >
          {getReasonMessage()}
        </p>

        <PBtn as="a" href="/subscription" variant="white" size="md" style={{ width: "100%" }}>
          Tekrar Dene
        </PBtn>
      </PCard>
    </div>
  );
}

export default function SubscriptionErrorPage() {
  return (
    <Suspense fallback={null}>
      <ErrorContent />
    </Suspense>
  );
}
