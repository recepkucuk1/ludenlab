"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PBtn, PCard } from "@/components/poster";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planType = searchParams.get("planType");
  const cycle = searchParams.get("cycle");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const formWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!planType || !cycle) {
      setError("Geçersiz plan veya ödeme periyodu.");
      setLoading(false);
      return;
    }

    async function initializeCheckout() {
      try {
        const res = await fetch("/api/subscription/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planType, cycle }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Ödeme sistemi başlatılamadı.");
        }

        if (data.checkoutFormContent && formWrapperRef.current) {
          formWrapperRef.current.innerHTML = data.checkoutFormContent;

          const scripts = formWrapperRef.current.querySelectorAll("script");
          scripts.forEach((oldScript) => {
            const newScript = document.createElement("script");
            Array.from(oldScript.attributes).forEach((attr) => {
              newScript.setAttribute(attr.name, attr.value);
            });
            const scriptText = document.createTextNode(oldScript.innerHTML);
            newScript.appendChild(scriptText);
            if (oldScript.parentNode) {
              oldScript.parentNode.replaceChild(newScript, oldScript);
            }
          });
        } else {
          throw new Error("Ödeme formu alınamadı.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Bilinmeyen bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }

    initializeCheckout();
  }, [planType, cycle]);

  if (error) {
    return (
      <div
        className="poster-scope"
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
        }}
      >
        <PCard rounded={20} style={{ maxWidth: 440, width: "100%", padding: 32, textAlign: "center" }}>
          <h2
            style={{
              margin: "0 0 10px",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--poster-danger)",
              fontFamily: "var(--font-display)",
            }}
          >
            Ödeme Hatası
          </h2>
          <p
            style={{
              margin: "0 0 22px",
              fontSize: 14,
              lineHeight: 1.55,
              color: "var(--poster-ink-2)",
              fontFamily: "var(--font-display)",
            }}
          >
            {error}
          </p>
          <PBtn onClick={() => router.push("/subscription")} variant="accent" size="md" style={{ width: "100%" }}>
            ← Planlara Dön
          </PBtn>
        </PCard>
      </div>
    );
  }

  return (
    <div className="poster-scope" style={{ maxWidth: 960, margin: "0 auto", padding: "40px 16px" }}>
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <h2
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "var(--poster-ink)",
            margin: 0,
            fontFamily: "var(--font-display)",
            letterSpacing: "-.02em",
          }}
        >
          Güvenli Ödeme
        </h2>
        <p
          style={{
            marginTop: 8,
            fontSize: 14,
            color: "var(--poster-ink-2)",
            fontFamily: "var(--font-display)",
          }}
        >
          Abone planınızı tamamlamak için ödeme bilgilerinizi giriniz.
        </p>
      </div>

      <PCard rounded={20} style={{ padding: 28, position: "relative", minHeight: 400 }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--poster-panel)",
              zIndex: 10,
              borderRadius: 20,
            }}
          >
            <Loader2 style={{ width: 32, height: 32, color: "var(--poster-ink)" }} className="animate-spin" />
            <p
              style={{
                marginTop: 14,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--poster-ink-2)",
                fontFamily: "var(--font-display)",
              }}
            >
              Ödeme formu yükleniyor...
            </p>
          </div>
        )}

        <div ref={formWrapperRef} id="iyzico-wrapper" style={{ width: "100%" }} />
      </PCard>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div
          className="poster-scope"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}
        >
          <Loader2 style={{ width: 32, height: 32, color: "var(--poster-ink-3)" }} className="animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
