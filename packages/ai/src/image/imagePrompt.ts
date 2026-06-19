/**
 * Stil şablonu sürümü. Şablon değişirse artır (eski görseller ayrı cache'lenir,
 * geçersiz kılınmaz). Cache anahtarına dahil edilir.
 */
export const STYLE_VERSION = "v1";

/**
 * Sabit çocuk-dostu illüstrasyon stili. `subject` = Claude'un kelime için
 * yazdığı İngilizce görsel tanımı (disambiguation içerir).
 */
export function buildImagePrompt(subject: string): string {
  const s = subject.trim();
  return (
    `Simple friendly flat illustration of a single ${s}, ` +
    `centered, plain white background, bright cheerful colors, ` +
    `clear recognizable shape, no text, children's educational flashcard style.`
  );
}
