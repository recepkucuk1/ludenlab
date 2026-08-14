import { PlanType } from "@/generated/studio/client";

export const PLAN_CONFIG: Record<PlanType, {
  studentLimit: number;
  creditAmount: number;
  monthlyPrice: number;
  yearlyPrice: number;
  pdfEnabled: boolean;
}> = {
  // creditAmount = aylık ÜRETİM HAKKI (1 üretim = 1 hak; iyzico uyumu için "kredi" modeli kaldırıldı).
  FREE:       { studentLimit: 2,      creditAmount: 2,   monthlyPrice: 0,      yearlyPrice: 0,       pdfEnabled: false },
  PRO:        { studentLimit: 200,    creditAmount: 100, monthlyPrice: 44900,  yearlyPrice: 457980,  pdfEnabled: true  },
  ADVANCED:   { studentLimit: -1,     creditAmount: 500, monthlyPrice: 199900, yearlyPrice: 2038980, pdfEnabled: true  },
  ENTERPRISE: { studentLimit: -1,     creditAmount: -1,  monthlyPrice: 0,      yearlyPrice: 0,       pdfEnabled: true  },
};

// Her üretim 1 hak düşer (araçtan bağımsız düz maliyet — kullanıcı kararı, 2026-08).
export const CREDIT_COSTS = {
  card_generate: 1,
  ai_profile:    1,
} as const;

export const INITIAL_FREE_CREDITS = 2;
