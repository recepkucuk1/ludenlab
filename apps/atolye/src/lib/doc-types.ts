/** Üretilen doküman tipleri için etiketler (client + server güvenli). */
export const DOC_TYPE_LABEL: Record<string, string> = {
  bep_hedef: "BEP hedef taslağı",
  ilerleme_raporu: "İlerleme raporu",
  aile_ozeti: "Aile özeti",
  seans_plani: "Seans planı",
};

export function docTypeLabel(type: string): string {
  return DOC_TYPE_LABEL[type] ?? type;
}
