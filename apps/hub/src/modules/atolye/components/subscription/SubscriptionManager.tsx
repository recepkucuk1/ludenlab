"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PBadge, PButton, toast } from "@ludenlab/ui";

type Props = {
  status: "ACTIVE" | "CANCELED" | "PAST_DUE";
  planType: string;
  billingCycle: "MONTHLY" | "YEARLY";
  currentPeriodEnd: string; // ISO
};

/** /abonelik üstünde aktif abonelik yönetimi: iptal et / devam ettir.
    Mevcut route'ları çağırır (deferred cancel — dönem sonuna kadar erişim sürer). */
export function SubscriptionManager({ status, planType, billingCycle, currentPeriodEnd }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const periodEnd = new Date(currentPeriodEnd);
  const periodEndStr = periodEnd.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const cycleStr = billingCycle === "YEARLY" ? "Yıllık" : "Aylık";
  const isCancelScheduled = status === "CANCELED" && periodEnd.getTime() > Date.now();

  async function call(path: string, fallbackMsg: string) {
    setLoading(true);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "İşlem başarısız.");
      toast.success(data.message || fallbackMsg);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  function onCancel() {
    if (
      confirm(
        "Aboneliği iptal etmek istediğine emin misin? Dönem sonuna kadar mevcut planın açık kalır.",
      )
    ) {
      call("/api/subscription/cancel", "Aboneliğin iptal edildi.");
    }
  }

  return (
    <section style={{ marginBottom: "1.8rem" }}>
      <span className="p-eyebrow">ABONELİĞİN</span>
      <div
        className="p-card"
        style={{
          marginTop: 6,
          padding: "1.1rem 1.3rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          border: isCancelScheduled ? "2px solid var(--poster-danger)" : "2px solid var(--poster-accent)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span className="p-h4" style={{ fontSize: "1.05rem" }}>
              {planType} · {cycleStr}
            </span>
            {isCancelScheduled ? (
              <PBadge tone="danger">İptal edildi</PBadge>
            ) : status === "PAST_DUE" ? (
              <PBadge tone="blue">Ödeme bekliyor</PBadge>
            ) : (
              <PBadge tone="green">Aktif</PBadge>
            )}
          </div>
          <p className="p-small" style={{ margin: 0, color: "var(--poster-ink-3)" }}>
            {isCancelScheduled
              ? `${periodEndStr} tarihine kadar erişimin sürer; sonra Ücretsiz plana geçilir.`
              : status === "PAST_DUE"
                ? "Son ödeme alınamadı — yenileme tekrar denenecek."
                : `Sonraki yenileme: ${periodEndStr}`}
          </p>
        </div>

        <div>
          {isCancelScheduled ? (
            <PButton
              size="sm"
              variant="accent"
              disabled={loading}
              onClick={() => call("/api/subscription/resume", "Aboneliğin devam ediyor.")}
            >
              Aboneliği devam ettir
            </PButton>
          ) : status === "ACTIVE" ? (
            <PButton size="sm" variant="ghost" disabled={loading} onClick={onCancel}>
              Aboneliği iptal et
            </PButton>
          ) : null}
        </div>
      </div>
    </section>
  );
}
