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

/** Türkçe → ASCII harita (Supabase storage object key'i ASCII olmalı). */
const TR_TO_ASCII: Record<string, string> = {
  "ç": "c", "ğ": "g", "ı": "i", "ş": "s", "ü": "u", "ö": "o", "â": "a", "î": "i", "û": "u",
};

/**
 * cacheKey → Supabase-güvenli storage yolu.
 * KRİTİK: Supabase Storage object key'i ASCII olmalı — Türkçe harf (ı ş ğ ü ö ç) içeren key
 * "Invalid key" hatası verir → görsel yüklenemez → düşer. (Eski "Türkçe koru" sürümü tüm
 * Türkçe-karakterli kelimelerin görselini sessizce düşürüyordu.) Türkçe translit edilir, kalan
 * güvensiz karakter "_" olur. Çakışma güvencesi: orijinal cacheKey'in kısa hash'i eklenir
 * (translit "çat"→"cat" ile gerçek "cat" ayrı kalır). Deterministik → aynı kelime hep aynı yol.
 */
function storagePathFor(cacheKey: string): string {
  const slug = cacheKey
    .replace(/[çğışüöâîû]/g, (c) => TR_TO_ASCII[c] ?? "_")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80)
    .toLowerCase();
  let h = 5381;
  for (let i = 0; i < cacheKey.length; i++) h = ((h * 33) ^ cacheKey.charCodeAt(i)) >>> 0;
  return `${slug}-${h.toString(36)}.png`;
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

/**
 * Üretmeden YALNIZCA cache'e bakar: kelimenin görseli varsa publicUrl, yoksa null.
 * `generateImage` ile AYNI cache anahtarını kullanır (sağlayıcı-stil duyarlı) → üretim, yükleme,
 * KAYIT ve KREDİ yok. Banka kelimeleri zaten ön-üretildiği için drill'e ücretsiz görsel iliştirmede
 * kullanılır (DB'den gelir). Cache'te yoksa null döner (çağıran isterse asıl üretime düşer).
 */
export async function lookupCachedImage(
  word: string,
  deps: { provider: Pick<ImageProvider, "model">; cache: Pick<ImageCacheStore, "find"> },
): Promise<string | null> {
  const { styleVersion } = imageStyleFor(deps.provider.model);
  const cacheKey = buildCacheKey({ word, styleVersion, model: deps.provider.model });
  const hit = await deps.cache.find(cacheKey);
  return hit ? hit.publicUrl : null;
}
