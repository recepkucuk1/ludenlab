"use client";

import { useEffect, useRef, useState } from "react";
import { PCard, PSpinner } from "@ludenlab/ui";
import { PaymentBadge } from "@/components/PaymentBadge";
import { BillingProfileForm } from "@/components/BillingProfileForm";

export default function CheckoutClient({
  module,
  code,
  interval,
  planName,
  price,
}: {
  module: string;
  code: string;
  interval: string;
  planName: string;
  price: number;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ title: string; message: string } | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  // Fatura profili kaydedilince init'i yeniden tetikler (ödemeye kaldığı yerden devam).
  const [attempt, setAttempt] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/odeme/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module, code, interval }),
        });
        const data = (await res.json()) as {
          checkoutFormContent?: string;
          token?: string;
          error?: string;
          downgradeScheduled?: boolean;
          alreadyActive?: boolean;
          downgradeCancelled?: boolean;
          upgraded?: boolean;
          billingProfileRequired?: boolean;
          message?: string;
        };
        // Fatura profili eksik (428) → ödeme yerine fatura formunu göster.
        if (data.billingProfileRequired) {
          if (!cancelled) {
            setNeedsProfile(true);
            setLoading(false);
          }
          return;
        }
        if (!res.ok) throw new Error(data.error || "Ödeme sistemi başlatılamadı.");
        if (cancelled) return;
        // Downgrade / aynı plan / anında upgrade: ödeme formu YOK → bilgi mesajı göster.
        if (data.downgradeScheduled || data.alreadyActive || data.upgraded) {
          setInfo({
            title: data.downgradeScheduled
              ? "Plan değişikliği zamanlandı"
              : data.upgraded
                ? "Planınız yükseltildi 🎉"
                : data.downgradeCancelled
                  ? "Plan değişikliği iptal edildi"
                  : "Bu plan zaten aktif",
            message: data.message ?? "",
          });
          setLoading(false);
          return;
        }
        if (!data.checkoutFormContent || !wrapRef.current) throw new Error("Ödeme formu alınamadı.");

        // iyzico checkoutFormContent içindeki <script>'ler innerHTML ile çalışmaz →
        // her birini yeniden oluştur (atolye'nin kanıtlı yöntemi).
        wrapRef.current.innerHTML = data.checkoutFormContent;
        wrapRef.current.querySelectorAll("script").forEach((oldScript) => {
          const s = document.createElement("script");
          for (const attr of Array.from(oldScript.attributes)) s.setAttribute(attr.name, attr.value);
          s.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode?.replaceChild(s, oldScript);
        });
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Bilinmeyen hata.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [module, code, interval, attempt]);

  const intervalTr = interval === "YEARLY" ? "Yıllık" : "Aylık";
  const returnHref = module === "STUDIO" ? "/studio/subscription" : "/atolye/abonelik";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 16px" }}>
      <div style={{ marginBottom: 20, textAlign: "center" }}>
        <span className="p-eyebrow">GÜVENLİ ÖDEME</span>
        <h1 className="p-h3" style={{ margin: "8px 0 4px" }}>
          {planName}
        </h1>
        <p className="p-body" style={{ color: "var(--poster-ink-3)" }}>
          {price.toLocaleString("tr-TR")} ₺ · {intervalTr} abonelik
        </p>
      </div>

      <PCard style={{ position: "relative", minHeight: 420, padding: 24 }}>
        {error ? (
          <div style={{ textAlign: "center", padding: "40px 8px" }}>
            <h2 style={{ color: "var(--poster-danger)", fontFamily: "var(--font-display)", margin: "0 0 8px" }}>
              Ödeme başlatılamadı
            </h2>
            <p className="p-body" style={{ color: "var(--poster-ink-2)" }}>{error}</p>
          </div>
        ) : info ? (
          <div style={{ textAlign: "center", padding: "48px 16px" }}>
            <h2 style={{ color: "var(--poster-accent)", fontFamily: "var(--font-display)", margin: "0 0 12px" }}>
              {info.title}
            </h2>
            <p className="p-body" style={{ color: "var(--poster-ink-2)", maxWidth: 460, margin: "0 auto 24px", lineHeight: 1.6 }}>
              {info.message}
            </p>
            <a href={returnHref} style={{ ...legalLink, fontSize: 15 }}>
              ← Aboneliğime dön
            </a>
          </div>
        ) : needsProfile ? (
          <div style={{ padding: "8px 4px" }}>
            <h2 className="p-h3" style={{ margin: "0 0 6px", fontSize: "1.2rem" }}>
              Fatura bilgileri
            </h2>
            <p className="p-small" style={{ color: "var(--poster-ink-3)", margin: "0 0 16px", lineHeight: 1.5 }}>
              Ödemene fatura kesebilmemiz için gerekli. Bir kez doldurulur; sonraki ödemelerde ve
              yenilemelerde otomatik kullanılır.
            </p>
            <BillingProfileForm
              saveLabel="Kaydet ve ödemeye geç"
              onSaved={() => {
                setNeedsProfile(false);
                setLoading(true);
                setAttempt((a) => a + 1); // init'i yeniden çağır → iyzico formu
              }}
            />
          </div>
        ) : (
          <>
            {loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  background: "var(--poster-panel)",
                  borderRadius: "inherit",
                  zIndex: 1,
                }}
              >
                <PSpinner />
                <span className="p-body" style={{ color: "var(--poster-ink-3)" }}>
                  Ödeme formu yükleniyor…
                </span>
              </div>
            )}
            {/* iyzico checkout formu buraya enjekte edilir */}
            <div ref={wrapRef} id="iyzipay-checkout-form" className="responsive" />
          </>
        )}
      </PCard>

      <PaymentBadge variant="checkout" style={{ marginTop: 20 }} />

      <p
        className="p-small"
        style={{ textAlign: "center", margin: "16px auto 0", maxWidth: 560, color: "var(--poster-ink-3)", lineHeight: 1.6 }}
      >
        Ödemeye devam ederek{" "}
        <a href="/kosullar" target="_blank" rel="noopener" style={legalLink}>
          Kullanım Koşulları ve Mesafeli Satış Sözleşmesi
        </a>
        ,{" "}
        <a href="/gizlilik" target="_blank" rel="noopener" style={legalLink}>
          Gizlilik Politikası
        </a>{" "}
        ve{" "}
        <a href="/kvkk" target="_blank" rel="noopener" style={legalLink}>
          KVKK Aydınlatma Metni
        </a>
        &rsquo;ni okuduğunuzu ve kabul ettiğinizi onaylarsınız.
      </p>
    </div>
  );
}

const legalLink = { color: "var(--poster-accent)", fontWeight: 600, textDecoration: "none" } as const;
