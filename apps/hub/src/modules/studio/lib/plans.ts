// Tip-only import: test ve sunucu-dışı çağrılar üretilmiş Prisma istemcisini yüklemesin.
import type { PlanType } from "@/generated/studio/client";

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

/** `studentLimit: -1` SINIRSIZ demektir (ADVANCED/ENTERPRISE). */
export const UNLIMITED_STUDENTS = -1;

/**
 * Öğrenci sınırı doldu mu?
 *
 * Ham `count >= limit` karşılaştırması sınırsızı (`-1`) "0 >= -1 → dolu" diye okuyordu:
 * en pahalı plan İLK öğrenciyi bile ekleyemiyor, kullanıcıya "en fazla -1 öğrenci"
 * yazıyordu (2026-09 denetimi, P0). Sözleşme artık tek yerde.
 */
export function isStudentLimitReached(limit: number, currentCount: number): boolean {
  if (limit === UNLIMITED_STUDENTS) return false;
  return currentCount >= limit;
}
