import { createHash } from "node:crypto";
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
  /** Cache anahtarının türediği metin (kelime flashcard'ında kelime; sahnede sahne-tanımı). */
  word: string;
  /** Claude'un ürettiği İngilizce görsel tanımı (disambiguation / sahne). */
  visualPrompt: string;
  /** Stil türü: "word" = tek-nesne flashcard (varsayılan), "scene" = sosyal-hikaye sahnesi. */
  kind?: "word" | "scene";
}

export interface GenerateImageOutput {
  publicUrl: string;
  cacheHit: boolean;
}

/**
 * cacheKey → Supabase storage object key. SAĞIR (opak) ve DETERMİNİSTİK.
 *
 * SORUN (2026-08 güvenlik denetimi #31): eski sürüm cacheKey'in ilk 80 karakterini
 * slug'a çevirip object key'e gömüyordu. Kelime flashcard'ında bu zararsızdı ("kedi-x9.png"),
 * ama SOSYAL HİKÂYE sahnelerinde `word` = Claude'un ürettiği TAM SAHNE TANIMI'dır ve bucket
 * PUBLIC'tir. Sonuç: klinik bağlam taşıyan cümleler tahmin edilebilir bir public URL'e
 * yazılıyordu — ör. `a_young_boy_standing_in_a_kitchen_mouth_open_as_if_speaking-...png`.
 * Rumuz kapısı (#09) gerçek adı prompt'tan çıkarıyor, ama bu MEKANİZMA açık kaldığı sürece
 * prompt'a sızacak herhangi bir ad doğrudan public bir dosya adına düşerdi.
 *
 * ÇÖZÜM: object key = cacheKey'in SHA-256'sının ilk 32 hex hanesi. Hiçbir metin taşımaz,
 * ASCII'dir (Türkçe harf "Invalid key" sorunu da kökten biter — eski kodun translit
 * katmanına gerek kalmaz), deterministiktir (aynı girdi → aynı yol, tekrar üretim
 * yinelenen nesne bırakmaz) ve girdiyi bilmeden tahmin edilemez.
 *
 * GERİYE UYUMLULUK: eski nesneler yerinde kalır — `publicUrl` DB'de saklandığı için mevcut
 * görseller çalışmaya devam eder; yalnız YENİ üretimler opak yola yazılır.
 */
function storagePathFor(cacheKey: string, contentType: string): string {
  const ext = contentType === "image/jpeg" ? "jpg" : "png";
  return `${createHash("sha256").update(cacheKey).digest("hex").slice(0, 32)}.${ext}`;
}

/**
 * Sahne prompt'u global cache tablosuna YAZILMAZ (denetim #31).
 *
 * `GeneratedImage.prompt` sütunu uygulamada hiç OKUNMUYOR (yalnız `publicUrl` okunur) —
 * yani sahne için orada tutulan klinik metin sıfır fayda, gerçek sorumluluk demek. Kelime
 * görsellerinde prompt jenerik ("a simple flashcard of a cat…") ve operasyonel olarak
 * yararlı olduğu için korunur.
 */
const SCENE_PROMPT_PLACEHOLDER = "[sahne prompt'u saklanmaz — klinik metin (denetim #31)]";

/**
 * Kelimeyi kalıcı, global-cache'li bir görsel URL'ine çevirir.
 * Saf orchestration: provider/cache/storage enjekte edilir (test edilebilir).
 */
export async function generateImage(
  input: GenerateImageInput,
  deps: GenerateImageDeps,
): Promise<GenerateImageOutput> {
  const { provider, cache, storage } = deps;
  // Sağlayıcı + içerik-türü duyarlı stil: FLUX/OpenAI ve word/scene farklı şablon + stil-sürümü
  // kullanır (cache de ayrı — sahne görselleri kelime flashcard'larıyla çakışmaz).
  const { buildPrompt, styleVersion } = imageStyleFor(provider.model, input.kind);
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

  const storagePath = storagePathFor(cacheKey, contentType);
  const publicUrl = await storage.upload(storagePath, bytes, contentType);

  await cache.save({
    cacheKey,
    wordNormalized: normalizeWord(input.word),
    styleVersion,
    model: provider.model,
    prompt: input.kind === "scene" ? SCENE_PROMPT_PLACEHOLDER : prompt,
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
  kind: "word" | "scene" = "word",
): Promise<string | null> {
  const { styleVersion } = imageStyleFor(deps.provider.model, kind);
  const cacheKey = buildCacheKey({ word, styleVersion, model: deps.provider.model });
  const hit = await deps.cache.find(cacheKey);
  return hit ? hit.publicUrl : null;
}
