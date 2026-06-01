/* Plan tanımları + kredi maliyetleri. CLIENT + SERVER güvenli (sır yok).
   iyzico/abonelik EN SONA bırakıldı; şimdilik FREE plan + kredi defteri + harcama.
   Fiyatlar kuruş cinsinden (terapimat ile hizalı). */

export const PLAN_KEYS = ["FREE", "PRO", "ADVANCED", "ENTERPRISE"] as const;
export type PlanType = (typeof PLAN_KEYS)[number];

export interface PlanConfig {
  label: string;
  credits: number; // dönem başına tanımlı kredi (-1 = sınırsız)
  monthlyKurus: number; // 0 = ücretsiz / özel fiyat
  features: string[];
}

export const PLAN_CONFIG: Record<PlanType, PlanConfig> = {
  FREE: {
    label: "Ücretsiz",
    credits: 100,
    monthlyKurus: 0,
    features: ["100 kredi", "Tüm araçlar", "Öğrenci yönetimi", "Takvim"],
  },
  PRO: {
    label: "Pro",
    credits: 2000,
    monthlyKurus: 44900,
    features: ["2000 kredi / ay", "Tüm araçlar", "PDF dışa aktarma", "Öncelikli üretim"],
  },
  ADVANCED: {
    label: "Gelişmiş",
    credits: 10000,
    monthlyKurus: 199900,
    features: ["10.000 kredi / ay", "Sınırsız öğrenci", "Öncelikli destek"],
  },
  ENTERPRISE: {
    label: "Kurumsal",
    credits: -1,
    monthlyKurus: 0,
    features: ["Sınırsız kredi", "Kurum yönetimi", "Özel fiyat & sözleşme"],
  },
};

/** Her araç üretiminin kredi maliyeti (şimdilik düz; ileride araç-bazlı yapılabilir). */
export const COST_PER_GENERATION = 10;

export const FREE_CREDITS = PLAN_CONFIG.FREE.credits;

export function planLabel(p: string): string {
  return (PLAN_CONFIG as Record<string, PlanConfig>)[p]?.label ?? p;
}

export function formatKurus(k: number): string {
  return k <= 0 ? "—" : `${(k / 100).toLocaleString("tr-TR")} ₺`;
}
