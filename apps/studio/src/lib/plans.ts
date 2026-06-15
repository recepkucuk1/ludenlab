import { PlanType } from "@/generated/prisma/client";

export const PLAN_CONFIG: Record<PlanType, {
  studentLimit: number;
  creditAmount: number;
  monthlyPrice: number;
  yearlyPrice: number;
  pdfEnabled: boolean;
}> = {
  FREE:       { studentLimit: 2,      creditAmount: 40,    monthlyPrice: 0,      yearlyPrice: 0,       pdfEnabled: false },
  PRO:        { studentLimit: 200,    creditAmount: 2000,  monthlyPrice: 44900,  yearlyPrice: 457980,  pdfEnabled: true  },
  ADVANCED:   { studentLimit: -1,     creditAmount: 10000, monthlyPrice: 199900, yearlyPrice: 2038980, pdfEnabled: true  },
  ENTERPRISE: { studentLimit: -1,     creditAmount: -1,    monthlyPrice: 0,      yearlyPrice: 0,       pdfEnabled: true  },
};

export const CREDIT_COSTS = {
  card_generate: 20,
  ai_profile:    20,
} as const;

export const INITIAL_FREE_CREDITS = 40;
