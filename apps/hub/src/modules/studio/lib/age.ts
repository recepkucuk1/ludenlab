// apps/hub/src/modules/studio/lib/age.ts
/* Yaş yardımcıları — toolHandler (araç kapısı), kart rotası ve hedef denetçisi aynı yaklaşımı kullanır: yıl farkı. */
export function calcAgeYears(birthDate: Date, now: Date = new Date()): number {
  return now.getFullYear() - new Date(birthDate).getFullYear();
}

export function calcAgeText(birthDate: Date | null, now: Date = new Date()): string {
  if (!birthDate) return "";
  return `${calcAgeYears(birthDate, now)} yaşında`;
}
