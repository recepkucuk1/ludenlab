"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Pricing, type PricingPlan } from "@studio/components/poster/pricing";
import { IyzicoBadge } from "@/components/IyzicoBadge";

export type ModuleKey = "STUDIO" | "ATOLYE";

export interface ModuleAbonelik {
  key: ModuleKey;
  name: string;
  /** Bölüm vurgu rengi (poster token). */
  accent: string;
  active: boolean;
  /** Aktif aboneliğin sonraki yenileme tarihi (ISO) — yoksa null. */
  periodEnd: string | null;
}

/**
 * Fiyatlar `apps/hub/scripts/bootstrap-iyzico.mjs` (= billing.BillingPlan, otorite) ile hizalı.
 * PRO: 449 ₺/ay · 4.579,80 ₺/yıl — ADVANCED: 1.999 ₺/ay · 20.389,80 ₺/yıl.
 * Yalnız PRO + ADVANCED'in checkout planı var; FREE ücretsiz, ENTERPRISE iletişim.
 */
const PRICE = {
  PRO: { monthly: 449, yearly: 4579.8 },
  ADVANCED: { monthly: 1999, yearly: 20389.8 },
} as const;

/** Plan butonuna tıklayınca apex checkout'a (/odeme) yönlen — /hesap zaten apex'te. */
function goCheckout(module: ModuleKey, code: "PRO" | "ADVANCED") {
  return (cycle: "monthly" | "yearly") => {
    const interval = cycle === "yearly" ? "YEARLY" : "MONTHLY";
    const q = new URLSearchParams({ module, code, interval });
    window.location.href = `/odeme?${q.toString()}`;
  };
}

const ENTERPRISE_HREF = "mailto:merhaba@ludenlab.com";

const STUDIO_PLANS: PricingPlan[] = [
  {
    name: "FREE",
    price: 0,
    yearlyPrice: 0,
    period: "ay",
    yearlyPeriod: "yıl",
    features: ["2 öğrenciye kadar kayıt", "40 ücretsiz aylık kredi", "Temel özelliklere erişim"],
    description: "Platformu ücretsiz test edin",
    buttonText: "Ücretsiz plan",
    href: null,
    isPopular: false,
  },
  {
    name: "PRO",
    price: PRICE.PRO.monthly,
    yearlyPrice: PRICE.PRO.yearly,
    period: "ay",
    yearlyPeriod: "yıl",
    features: ["200 öğrenciye kadar kayıt", "2000 kredi / yenileme", "Gelişmiş AI Analizleri", "PDF çıktı alma"],
    description: "Bireysel çalışan uzmanlar için",
    buttonText: "Pro'ya Geç",
    href: null,
    onSelect: goCheckout("STUDIO", "PRO"),
    isPopular: true,
  },
  {
    name: "ADVANCED",
    price: PRICE.ADVANCED.monthly,
    yearlyPrice: PRICE.ADVANCED.yearly,
    period: "ay",
    yearlyPeriod: "yıl",
    features: ["Sınırsız öğrenci kaydı", "10000 kredi / yenileme", "Tüm premium özellikler", "Öncelikli destek"],
    description: "Büyük merkezler ve yoğun klinik uzmanlar için",
    buttonText: "Advanced'a Geç",
    href: null,
    onSelect: goCheckout("STUDIO", "ADVANCED"),
    isPopular: false,
  },
  {
    name: "ENTERPRISE",
    price: null,
    yearlyPrice: null,
    period: "ay",
    features: ["Sınırsız öğrenci", "Sınırsız kredi kullanımı", "Kuruma özel entegrasyon", "7/24 Özel Destek Uzmanı"],
    description: "Büyük kurumlar için tam donanımlı paket.",
    buttonText: "İletişime Geçin",
    href: ENTERPRISE_HREF,
    isPopular: false,
    customPriceLabel: "Özel",
  },
];

const ATOLYE_PLANS: PricingPlan[] = [
  {
    name: "FREE",
    price: 0,
    yearlyPrice: 0,
    period: "ay",
    yearlyPeriod: "yıl",
    features: ["100 kredi", "Tüm araçlar", "Öğrenci yönetimi", "Takvim"],
    description: "Atölye'yi ücretsiz keşfedin",
    buttonText: "Ücretsiz plan",
    href: null,
    isPopular: false,
  },
  {
    name: "PRO",
    price: PRICE.PRO.monthly,
    yearlyPrice: PRICE.PRO.yearly,
    period: "ay",
    yearlyPeriod: "yıl",
    features: ["2000 kredi / ay", "Tüm araçlar", "PDF dışa aktarma", "Öncelikli üretim"],
    description: "Aktif çalışan uzmanlar için",
    buttonText: "Pro'ya Geç",
    href: null,
    onSelect: goCheckout("ATOLYE", "PRO"),
    isPopular: true,
  },
  {
    name: "ADVANCED",
    price: PRICE.ADVANCED.monthly,
    yearlyPrice: PRICE.ADVANCED.yearly,
    period: "ay",
    yearlyPeriod: "yıl",
    features: ["10.000 kredi / ay", "Sınırsız öğrenci", "Öncelikli destek"],
    description: "Yoğun klinik uzmanlar ve merkezler için",
    buttonText: "Advanced'a Geç",
    href: null,
    onSelect: goCheckout("ATOLYE", "ADVANCED"),
    isPopular: false,
  },
  {
    name: "ENTERPRISE",
    price: null,
    yearlyPrice: null,
    period: "ay",
    features: ["Sınırsız kredi", "Kurum yönetimi", "Özel fiyat & sözleşme"],
    description: "Kurumlar için tam donanımlı paket.",
    buttonText: "İletişime Geçin",
    href: ENTERPRISE_HREF,
    isPopular: false,
    customPriceLabel: "Özel",
  },
];

const PLANS: Record<ModuleKey, PricingPlan[]> = {
  STUDIO: STUDIO_PLANS,
  ATOLYE: ATOLYE_PLANS,
};

/** Aktif aboneliği yönetme (iptal/devam) ilgili modülün kendi abonelik sayfasında. */
const MANAGE_HREF: Record<ModuleKey, string> = {
  STUDIO: "/studio/subscription",
  ATOLYE: "/atolye/abonelik",
};

function ActiveBanner({ m, periodEndDate }: { m: ModuleAbonelik; periodEndDate: string | null }) {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          padding: 18,
          borderRadius: 16,
          background: "var(--poster-panel)",
          border: "2px solid var(--poster-ink)",
          boxShadow: "0 4px 0 var(--poster-ink)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 12,
            background: "var(--poster-green)",
            border: "2px solid var(--poster-ink)",
            boxShadow: "0 3px 0 var(--poster-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckCircle2 style={{ width: 20, height: 20, color: "#fff" }} />
        </div>
        <div style={{ flex: 1, fontFamily: "var(--font-display)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--poster-ink)", marginBottom: 3 }}>
            {m.name} aboneliğin aktif
          </div>
          <div style={{ fontSize: 13, color: "var(--poster-ink-2)", lineHeight: 1.5 }}>
            {periodEndDate ? (
              <>
                Sonraki yenileme: <strong>{periodEndDate}</strong>.{" "}
              </>
            ) : null}
            İptal veya plan değişikliği için{" "}
            <Link href={MANAGE_HREF[m.key]} style={{ color: m.accent, fontWeight: 700 }}>
              {m.name} abonelik sayfası
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}

export function AbonelikGrid({ modules }: { modules: ModuleAbonelik[] }) {
  return (
    <div style={{ marginTop: 8 }}>
      {modules.map((m) => {
        const periodEndDate = m.periodEnd
          ? new Date(m.periodEnd).toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : null;
        return (
          <section key={m.key} style={{ borderTop: `3px solid ${m.accent}` }}>
            {m.active && <ActiveBanner m={m} periodEndDate={periodEndDate} />}
            <Pricing
              plans={PLANS[m.key]}
              title={`${m.name} planları`}
              description={
                m.active
                  ? `${m.name} aboneliğin aktif — dilersen planını yükselt veya değiştir. Yıllıkta %15 indirim.`
                  : `${m.name} için ihtiyacına uygun planı seç. Yıllık alımlarda %15 indirim avantajını kaçırma.`
              }
            />
          </section>
        );
      })}
      <IyzicoBadge style={{ marginTop: 4, paddingBottom: 32 }} />
    </div>
  );
}
