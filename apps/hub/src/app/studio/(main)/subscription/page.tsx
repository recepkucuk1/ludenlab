"use client";

import { Pricing } from "@studio/components/poster/pricing";
import { PLAN_CONFIG } from "@studio/lib/plans";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { PBtn, PCard, PModal, PSpinner } from "@studio/components/poster";

// Merkezi apex billing kalıcı: plan seçimi her zaman apex /odeme checkout'una gider.
const APEX_BASE = (process.env.NEXT_PUBLIC_APEX_URL || "https://ludenlab.com").replace(/\/$/, "");

type SubscriptionInfo = {
  id: string;
  status: "ACTIVE" | "CANCELLED" | "PENDING" | "EXPIRED";
  billingCycle: "MONTHLY" | "YEARLY";
  currentPeriodEnd: string;
  cancelledAt: string | null;
  plan: { type: string };
};

export default function SubscriptionPage() {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Cancel modal state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Resume in-flight state
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    fetch("/studio/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.therapist) setCurrentPlan(data.therapist.planType);
        setSubscription(data.subscription ?? null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSelectPlan = (planType: string) => (cycle: "monthly" | "yearly") => {
    // Merkezi apex checkout'a yönlen (modül-tarafı iyzico yüzeyi kaldırıldı).
    const interval = cycle === "yearly" ? "YEARLY" : "MONTHLY";
    const q = new URLSearchParams({ module: "STUDIO", code: planType, interval });
    window.location.href = `${APEX_BASE}/odeme?${q.toString()}`;
  };

  const handleCancelConfirm = async () => {
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch("/studio/api/subscription/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İptal işlemi başarısız oldu.");
      setCancelOpen(false);
      refresh();
    } catch (err: unknown) {
      setCancelError(
        err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.",
      );
    } finally {
      setCancelLoading(false);
    }
  };

  const handleResume = async () => {
    setResumeLoading(true);
    setResumeError(null);
    try {
      const res = await fetch("/studio/api/subscription/resume", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İşlem başarısız oldu.");
      refresh();
    } catch (err: unknown) {
      setResumeError(
        err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.",
      );
    } finally {
      setResumeLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="poster-scope">
        <PSpinner fullPanel style={{ minHeight: "60vh" }} />
      </main>
    );
  }

  const plans = [
    {
      name: "FREE",
      price: PLAN_CONFIG.FREE.monthlyPrice / 100,
      yearlyPrice: PLAN_CONFIG.FREE.yearlyPrice / 100,
      period: "ay",
      yearlyPeriod: "yıl",
      features: [
        "2 öğrenciye kadar kayıt",
        "40 ücretsiz aylık kredi",
        "Temel özelliklere erişim",
      ],
      description: "Platformu ücretsiz test edin",
      buttonText: currentPlan === "FREE" ? "Mevcut Planınız" : "Ücretsiz Başla",
      href: null,
      isPopular: false,
    },
    {
      name: "PRO",
      price: PLAN_CONFIG.PRO.monthlyPrice / 100,
      yearlyPrice: PLAN_CONFIG.PRO.yearlyPrice / 100,
      period: "ay",
      yearlyPeriod: "yıl",
      features: [
        "200 öğrenciye kadar kayıt",
        "2000 kredi / yenileme",
        "Gelişmiş AI Analizleri",
        "PDF çıktı alma",
      ],
      description: "Bireysel çalışan uzmanlar için",
      buttonText: currentPlan === "PRO" ? "Mevcut Planınız" : "Pro'ya Geç",
      href: null,
      onSelect: currentPlan === "PRO" ? undefined : handleSelectPlan("PRO"),
      isPopular: true,
    },
    {
      name: "ADVANCED",
      price: PLAN_CONFIG.ADVANCED.monthlyPrice / 100,
      yearlyPrice: PLAN_CONFIG.ADVANCED.yearlyPrice / 100,
      period: "ay",
      yearlyPeriod: "yıl",
      features: [
        "Sınırsız öğrenci kaydı",
        "10000 kredi / yenileme",
        "Tüm premium özellikler",
        "Öncelikli destek",
      ],
      description: "Büyük merkezler ve yoğun klinik uzmanlar için",
      buttonText: currentPlan === "ADVANCED" ? "Mevcut Planınız" : "Advanced'a Geç",
      href: null,
      onSelect: currentPlan === "ADVANCED" ? undefined : handleSelectPlan("ADVANCED"),
      isPopular: false,
    },
    {
      name: "ENTERPRISE",
      price: null,
      yearlyPrice: null,
      period: "ay",
      features: [
        "Sınırsız öğrenci",
        "Sınırsız kredi kullanımı",
        "Kuruma özel entegrasyon",
        "7/24 Özel Destek Uzmanı",
      ],
      description: "Büyük kurumlar için tam donanımlı paket.",
      buttonText: "İletişime Geçin",
      href: "mailto:merhaba@ludenlab.com",
      isPopular: false,
      customPriceLabel: "Özel",
    },
  ];

  const periodEndDate = subscription
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="poster-scope" style={{ minHeight: "100vh", background: "var(--poster-bg)" }}>
      {/* Active subscription notice — shown above pricing grid */}
      {subscription && periodEndDate && (
        <div style={{ maxWidth: 880, margin: "32px auto 0", padding: "0 24px" }}>
          <PCard
            rounded={16}
            style={{
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              background:
                subscription.status === "CANCELLED"
                  ? "var(--poster-yellow)"
                  : "var(--poster-panel)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: 12,
                  background:
                    subscription.status === "CANCELLED"
                      ? "var(--poster-ink)"
                      : "var(--poster-green)",
                  border: "2px solid var(--poster-ink)",
                  boxShadow: "0 3px 0 var(--poster-ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {subscription.status === "CANCELLED" ? (
                  <AlertCircle style={{ width: 22, height: 22, color: "#fff" }} />
                ) : (
                  <CheckCircle2 style={{ width: 22, height: 22, color: "#fff" }} />
                )}
              </div>
              <div style={{ flex: 1, fontFamily: "var(--font-display)" }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--poster-ink)",
                    marginBottom: 4,
                  }}
                >
                  {subscription.status === "CANCELLED"
                    ? `Aboneliğiniz iptal edildi`
                    : `${subscription.plan.type} aboneliğiniz aktif`}
                </div>
                <div style={{ fontSize: 13, color: "var(--poster-ink-2)", lineHeight: 1.5 }}>
                  {subscription.status === "CANCELLED" ? (
                    <>
                      <strong>{periodEndDate}</strong> tarihine kadar {subscription.plan.type}{" "}
                      özelliklerini kullanmaya devam edeceksiniz. Bu tarihten sonra hesabınız FREE
                      plana geçer.
                    </>
                  ) : (
                    <>
                      Sonraki yenileme: <strong>{periodEndDate}</strong> (
                      {subscription.billingCycle === "YEARLY" ? "yıllık" : "aylık"})
                    </>
                  )}
                </div>
              </div>
            </div>
            {subscription.status === "ACTIVE" && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <PBtn
                  variant="white"
                  size="sm"
                  onClick={() => {
                    setCancelError(null);
                    setCancelOpen(true);
                  }}
                >
                  Aboneliği İptal Et
                </PBtn>
              </div>
            )}
            {subscription.status === "CANCELLED" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                {resumeError && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--poster-danger)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {resumeError}
                  </span>
                )}
                <PBtn
                  variant="accent"
                  size="sm"
                  onClick={handleResume}
                  disabled={resumeLoading}
                >
                  {resumeLoading ? "Devam ettiriliyor…" : "Aboneliği Devam Ettir"}
                </PBtn>
              </div>
            )}
          </PCard>
        </div>
      )}

      <Pricing
        plans={plans}
        title="Gücünüzü Zirveye Taşıyın"
        description={
          currentPlan
            ? `Şu anki planınız: ${currentPlan}. İhtiyacınıza uygun plana geçiş yapın.`
            : "İhtiyacınıza uygun planı seçin. Yıllık alımlarda indirim avantajını kaçırmayın."
        }
      />

      {/* Cancel confirmation modal */}
      <PModal
        open={cancelOpen}
        onClose={() => !cancelLoading && setCancelOpen(false)}
        title="Aboneliği İptal Et"
        width={460}
        persistent={cancelLoading}
        footer={
          <>
            <PBtn
              variant="white"
              size="md"
              onClick={() => setCancelOpen(false)}
              disabled={cancelLoading}
            >
              Vazgeç
            </PBtn>
            <PBtn variant="accent" size="md" onClick={handleCancelConfirm} disabled={cancelLoading}>
              {cancelLoading ? "İptal ediliyor…" : "Evet, iptal et"}
            </PBtn>
          </>
        }
      >
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--poster-ink-2)",
            fontFamily: "var(--font-display)",
          }}
        >
          Aboneliğinizi iptal etmek istediğinize emin misiniz?
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--poster-ink-2)",
            fontFamily: "var(--font-display)",
          }}
        >
          {periodEndDate ? (
            <>
              <strong>{periodEndDate}</strong> tarihine kadar mevcut planınızın tüm özelliklerini
              kullanmaya devam edebilirsiniz. Bu tarihten sonra otomatik olarak ücretsiz plana
              geçeceksiniz. Fikrinizi değiştirirseniz dönem bitmeden &ldquo;Aboneliği Devam
              Ettir&rdquo; ile iptal kararınızı geri alabilirsiniz.
            </>
          ) : (
            "Mevcut faturalandırma döneminizin sonuna kadar planınız aktif kalacak. İptal kararınızı dönem bitmeden istediğiniz zaman geri alabilirsiniz."
          )}
        </p>
        {cancelError && (
          <p
            style={{
              marginTop: 14,
              padding: "10px 12px",
              fontSize: 13,
              borderRadius: 8,
              border: "2px solid var(--poster-danger)",
              background: "var(--poster-pink)",
              color: "var(--poster-ink)",
              fontFamily: "var(--font-display)",
            }}
          >
            {cancelError}
          </p>
        )}
      </PModal>
    </div>
  );
}
