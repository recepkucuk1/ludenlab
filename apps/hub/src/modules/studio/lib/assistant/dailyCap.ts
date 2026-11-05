// apps/hub/src/modules/studio/lib/assistant/dailyCap.ts

/** Öğrenci başına TR takvim günü başına en çok gözlem (asistan çağrısı) sayısı. */
export const OBSERVATIONS_PER_DAY = 10;

/** Tarih yardımcıları `@/lib/trZaman`'a taşındı (hedef denetçisi de kullanır); eski import yolu korunur. */
export { trAyBaslangici, trGunBaslangici } from "@/lib/trZaman";
