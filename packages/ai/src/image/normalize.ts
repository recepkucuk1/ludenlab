/**
 * Görsel cache'i için kelimeyi tek biçime indirger.
 * Türkçe locale lowercase (İ→i, I→ı), trim, noktalama temizliği, tek boşluk.
 */
export function normalizeWord(word: string): string {
  return word
    .toLocaleLowerCase("tr-TR")
    .replace(/[.,;:!?"'()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
