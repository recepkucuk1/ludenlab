import type { ImageProvider } from "./types";
import { buildCacheKey } from "./cacheKey";
import { imageStyleFor } from "./imagePrompt";
import { normalizeWord } from "./normalize";

/** Cache'te bulunan görsel (yalnız tüketicinin ihtiyacı olan alan). */
export interface CachedImage {
  publicUrl: string;
}

/** Görsel cache deposu (app concrete uygular; ör. Prisma). */
export interface ImageCacheStore {
  find(cacheKey: string): Promise<CachedImage | null>;
  save(record: {
    cacheKey: string;
    wordNormalized: string;
    styleVersion: string;
    model: string;
    prompt: string;
    storagePath: string;
    publicUrl: string;
  }): Promise<void>;
}

/** Görsel deposu (app concrete uygular; ör. Supabase Storage). upload → public URL. */
export interface ImageStorage {
  upload(path: string, bytes: Uint8Array, contentType: string): Promise<string>;
}

export interface GenerateImageDeps {
  provider: ImageProvider;
  cache: ImageCacheStore;
  storage: ImageStorage;
}

export interface GenerateImageInput {
  /** Hedef kelime (cache anahtarı bundan türer). */
  word: string;
  /** Claude'un ürettiği İngilizce görsel tanımı (disambiguation). */
  visualPrompt: string;
}

export interface GenerateImageOutput {
  publicUrl: string;
  cacheHit: boolean;
}

/** cacheKey → storage-güvenli dosya yolu (| / \ boşluk nötralize; Türkçe harfler korunur). */
function storagePathFor(cacheKey: string): string {
  // Yalnız storage'da tehlikeli karakterleri (| / \ boşluk) nötralize et.
  // Türkçe harfler (ç ğ ı ş ö ü) KORUNUR — yoksa "çat"/"şat" → aynı yol = cache çakışması.
  return `${cacheKey.replace(/[|/\\\s]+/g, "_")}.png`;
}

/**
 * Kelimeyi kalıcı, global-cache'li bir görsel URL'ine çevirir.
 * Saf orchestration: provider/cache/storage enjekte edilir (test edilebilir).
 */
export async function generateImage(
  input: GenerateImageInput,
  deps: GenerateImageDeps,
): Promise<GenerateImageOutput> {
  const { provider, cache, storage } = deps;
  // Sağlayıcı-duyarlı stil: FLUX ve OpenAI farklı şablon + stil-sürümü kullanır (cache de ayrı).
  const { buildPrompt, styleVersion } = imageStyleFor(provider.model);
  const cacheKey = buildCacheKey({
    word: input.word,
    styleVersion,
    model: provider.model,
  });

  const hit = await cache.find(cacheKey);
  if (hit) {
    return { publicUrl: hit.publicUrl, cacheHit: true };
  }

  const prompt = buildPrompt(input.visualPrompt);
  const { bytes, contentType } = await provider.generate({ prompt });

  const storagePath = storagePathFor(cacheKey);
  const publicUrl = await storage.upload(storagePath, bytes, contentType);

  await cache.save({
    cacheKey,
    wordNormalized: normalizeWord(input.word),
    styleVersion,
    model: provider.model,
    prompt,
    storagePath,
    publicUrl,
  });

  return { publicUrl, cacheHit: false };
}
