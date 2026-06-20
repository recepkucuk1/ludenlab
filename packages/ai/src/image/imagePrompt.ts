/**
 * Stil şablonu sürümü (OpenAI varsayılanı). Şablon değişirse artır (eski görseller ayrı
 * cache'lenir, geçersiz kılınmaz). Cache anahtarına dahil edilir.
 * Sağlayıcı-özel sürüm/şablon seçimi için bkz. `imageStyleFor`.
 */
export const STYLE_VERSION = "v2";

/**
 * Sabit çocuk-dostu illüstrasyon stili (OpenAI gpt-image-1). `subject` = Claude'un kelime
 * için yazdığı İngilizce görsel tanımı (disambiguation içerir).
 */
export function buildImagePrompt(subject: string): string {
  const s = subject.trim();
  // DİKKAT: Bu şablon metnini değiştirirsen STYLE_VERSION'ı artır — yoksa cache stale kalır.
  return (
    `Simple friendly flat illustration of a single ${s}, ` +
    `centered, plain white background, bright cheerful colors, ` +
    `clear recognizable shape, children's educational flashcard style, ` +
    `no text, no letters, no words, no labels, no writing on the object.`
  );
}

/**
 * FLUX schnell stil sürümü. POC'ta (2026-06-19) doğrulandı; cache OpenAI'dan modele göre
 * zaten ayrı olduğu için bağımsız sürüm anahtarı kullanır.
 */
export const FLUX_STYLE_VERSION = "fluxv3";

/**
 * FLUX schnell için ayarlanmış şablon (POC ile doğrulandı). OpenAI şablonundan farkları:
 *  - "no face, no eyes" — FLUX kawaii yüz ekleme eğilimindeydi (sabun → gülen yüz).
 *  - "fully colored (not black and white, not line art)" — bazı kelimelerde boyama-kitabı
 *    çizgisine kaçıyordu.
 *  - "filling most of the frame" — nesne kartta çok küçük kalıyordu.
 *  - "sticker"/"vector" İFADELERİ YOK — bunlar metin/logo davet edip sızıntı yapıyordu
 *    (sabun → üstünde "SOAP" yazısı). FLUX'ta ayrı negative-prompt olmadığı için kelime
 *    seçimi kritik.
 */
export function buildFluxImagePrompt(subject: string): string {
  const s = subject.trim();
  // DİKKAT: Bu şablonu değiştirirsen FLUX_STYLE_VERSION'ı artır.
  return (
    `Flat colorful illustration of a single ${s}, ` +
    `centered and large, filling most of the frame, clean bold outline, ` +
    `bright cheerful solid colors, fully colored (not black and white, not line art), ` +
    `simple smooth shapes, plain white background, children's educational flashcard style, ` +
    `no face, no eyes, no text, no letters, no words, no labels, no writing.`
  );
}

/**
 * Sağlayıcı-duyarlı stil seçici: provider model'ine göre doğru şablon + stil sürümünü döndürür.
 * FLUX modelleri (`fal-ai/flux*`) FLUX-ayarlı şablonu, diğerleri (OpenAI) v2 şablonunu alır.
 * Böylece sağlayıcı değiştirmek diğerinin çıktısını/cache'ini etkilemez.
 */
export function imageStyleFor(model: string): {
  buildPrompt: (subject: string) => string;
  styleVersion: string;
} {
  if (model.startsWith("fal-ai/flux")) {
    return { buildPrompt: buildFluxImagePrompt, styleVersion: FLUX_STYLE_VERSION };
  }
  return { buildPrompt: buildImagePrompt, styleVersion: STYLE_VERSION };
}
