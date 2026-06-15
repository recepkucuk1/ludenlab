"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { PBtn, PModal } from "@/components/poster";

type Cycle = "monthly" | "yearly";

type Props = {
  open: boolean;
  onClose: () => void;
  planType: string | null; // PRO | ADVANCED — null when modal closed
  cycle: Cycle;
};

/**
 * In-page iyzico Checkout modal.
 *
 * On open we POST to /api/subscription/checkout, get back the iyzico
 * `checkoutFormContent` (HTML + script snippet), and inject it into the
 * modal body. iyzico's script renders the card form inside its own iframe
 * so we never touch card data — PCI-DSS SAQ-A only.
 *
 * After successful payment iyzico POSTs to /api/subscription/callback,
 * which 303-redirects the browser to /subscription/success. The modal
 * itself doesn't need to handle success — the page reloads.
 */
export function SubscriptionCheckoutModal({
  open,
  onClose,
  planType,
  cycle,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const formWrapperRef = useRef<HTMLDivElement>(null);

  // Re-init every time the modal opens with a new plan/cycle. Cleanup clears
  // the iyzico iframe so closing & reopening doesn't show stale content.
  useEffect(() => {
    if (!open || !planType) {
      setLoading(true);
      setError(null);
      if (formWrapperRef.current) formWrapperRef.current.innerHTML = "";
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/subscription/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planType, cycle }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ödeme sistemi başlatılamadı.");
        if (cancelled) return;

        if (data.checkoutFormContent && formWrapperRef.current) {
          formWrapperRef.current.innerHTML = data.checkoutFormContent;

          // iyzico embeds inline <script> tags — `innerHTML` doesn't execute
          // them, so clone-and-replace each script to force execution.
          const scripts = formWrapperRef.current.querySelectorAll("script");
          scripts.forEach((oldScript) => {
            const newScript = document.createElement("script");
            Array.from(oldScript.attributes).forEach((attr) => {
              newScript.setAttribute(attr.name, attr.value);
            });
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            oldScript.parentNode?.replaceChild(newScript, oldScript);
          });
        } else {
          throw new Error("Ödeme formu alınamadı.");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, planType, cycle]);

  return (
    <PModal
      open={open}
      onClose={onClose}
      title={planType ? `${planType} Paketi — ${cycle === "yearly" ? "Yıllık" : "Aylık"}` : ""}
      width={620}
    >
      {error ? (
        <div style={{ textAlign: "center", padding: "32px 8px" }}>
          <h3
            style={{
              margin: "0 0 10px",
              fontSize: 17,
              fontWeight: 700,
              color: "var(--poster-danger)",
              fontFamily: "var(--font-display)",
            }}
          >
            Ödeme Hatası
          </h3>
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
          <PBtn onClick={onClose} variant="white" size="md">
            Kapat
          </PBtn>
        </div>
      ) : (
        <div style={{ position: "relative", minHeight: 460 }}>
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
              }}
            >
              <Loader2
                style={{ width: 32, height: 32, color: "var(--poster-ink)" }}
                className="animate-spin"
              />
              <p
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--poster-ink-2)",
                  fontFamily: "var(--font-display)",
                }}
              >
                Ödeme formu yükleniyor…
              </p>
            </div>
          )}
          <div ref={formWrapperRef} id="iyzico-modal-wrapper" style={{ width: "100%" }} />
        </div>
      )}
    </PModal>
  );
}
