/* Plan tanımları + üretim hakkı maliyetleri. CLIENT + SERVER güvenli (sır yok).
   Model: 1 üretim = 1 hak (iyzico uyumu için "kredi" dili kaldırıldı, 2026-08).
   Fiyatlar kuruş cinsinden. */

export const PLAN_KEYS = ["FREE", "PRO", "ADVANCED", "ENTERPRISE"] as const;
export type PlanType = (typeof PLAN_KEYS)[number];

/** Yıllık abonelik indirimi: yıllık = aylık × 12 × (1 − %15). */
export const YEARLY_DISCOUNT_PCT = 15;

export interface PlanConfig {
  label: string;
  credits: number; // dönem başına ÜRETİM HAKKI (-1 = sınırsız; 1 üretim = 1 hak)
  monthlyKurus: number; // 0 = ücretsiz / özel fiyat
  yearlyKurus: number; // yıllık (aylık×12×0.85); 0 = yıllık yok
  features: string[];
}

export const PLAN_CONFIG: Record<PlanType, PlanConfig> = {
  FREE: {
    label: "Ücretsiz",
    credits: 2,
    monthlyKurus: 0,
    yearlyKurus: 0,
    features: ["Ayda 2 üretim hakkı", "Tüm araçlar", "Öğrenci yönetimi", "Takvim"],
  },
  PRO: {
    label: "Pro",
    credits: 100,
    monthlyKurus: 44900,
    yearlyKurus: 457980, // 449×12×0.85 = 4.579,80 ₺
    features: ["Aylık 100 üretim hakkı", "Tüm araçlar", "PDF dışa aktarma", "Öncelikli üretim"],
  },
  ADVANCED: {
    label: "Gelişmiş",
    credits: 500,
    monthlyKurus: 199900,
    yearlyKurus: 2038980, // 1999×12×0.85 = 20.389,80 ₺
    features: ["Aylık 500 üretim hakkı", "Sınırsız öğrenci", "Öncelikli destek"],
  },
  ENTERPRISE: {
    label: "Kurumsal",
    credits: -1,
    monthlyKurus: 0,
    yearlyKurus: 0,
    features: ["Sınırsız üretim", "Kurum yönetimi", "Özel fiyat & sözleşme"],
  },
};

/** Her üretim 1 hak düşer (araçtan bağımsız düz maliyet). */
export const COST_PER_GENERATION = 1;

export const FREE_CREDITS = PLAN_CONFIG.FREE.credits;

export function planLabel(p: string): string {
  return (PLAN_CONFIG as Record<string, PlanConfig>)[p]?.label ?? p;
}

export function formatKurus(k: number): string {
  return k <= 0 ? "—" : `${(k / 100).toLocaleString("tr-TR")} ₺`;
}
