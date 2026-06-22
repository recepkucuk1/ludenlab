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
 * SAHNE stili (sosyal hikaye). Tek-nesne flashcard'tan FARKLI: sosyal hikaye cümleleri bir durumu/
 * davranışı anlatır → insan/çocuk içeren sahne çizilmeli (flashcard'ın "tek nesne, yüz yok" kuralı
 * burada yanlış olur). Yumuşak, sakin, güven verici hikâye-kitabı stili. `subject` = cümlenin
 * İngilizce sahne tanımı. Şablon değişirse SCENE_STYLE_VERSION'ı artır.
 */
export const SCENE_STYLE_VERSION = "scene-v1";

export function buildSceneImagePrompt(subject: string): string {
  const s = subject.trim();
  return (
    `Warm friendly children's storybook illustration showing ${s}, ` +
    `soft rounded shapes, gentle bright colors, simple uncluttered background, ` +
    `calm and reassuring mood, flat vector illustration style, inclusive friendly characters, ` +
    `no text, no letters, no words, no labels, no speech bubbles, no writing.`
  );
}

export const FLUX_SCENE_STYLE_VERSION = "flux-scene-v1";

export function buildFluxSceneImagePrompt(subject: string): string {
  const s = subject.trim();
  return (
    `Warm friendly children's storybook illustration showing ${s}, ` +
    `soft rounded cartoon style, gentle bright solid colors, fully colored (not line art), ` +
    `simple uncluttered background, calm reassuring mood, inclusive friendly characters, ` +
    `no text, no letters, no words, no labels, no speech bubbles, no writing.`
  );
}

/**
 * Sağlayıcı-duyarlı stil seçici: provider model'ine + içerik türüne (`kind`) göre doğru şablon +
 * stil sürümünü döndürür. FLUX modelleri (`fal-ai/flux*`) FLUX-ayarlı şablonu, diğerleri (OpenAI)
 * şablonunu alır. `kind="scene"` sosyal-hikaye sahne stilini seçer (ayrı stil sürümü → ayrı cache,
 * kelime flashcard'larıyla çakışmaz). Varsayılan `kind="word"` (tek-nesne flashcard).
 */
export function imageStyleFor(
  model: string,
  kind: "word" | "scene" = "word",
): {
  buildPrompt: (subject: string) => string;
  styleVersion: string;
} {
  const isFlux = model.startsWith("fal-ai/flux");
  if (kind === "scene") {
    return isFlux
      ? { buildPrompt: buildFluxSceneImagePrompt, styleVersion: FLUX_SCENE_STYLE_VERSION }
      : { buildPrompt: buildSceneImagePrompt, styleVersion: SCENE_STYLE_VERSION };
  }
  return isFlux
    ? { buildPrompt: buildFluxImagePrompt, styleVersion: FLUX_STYLE_VERSION }
    : { buildPrompt: buildImagePrompt, styleVersion: STYLE_VERSION };
}
