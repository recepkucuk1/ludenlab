import { image } from "@ludenlab/ai";
import { prismaImageCache } from "./imageCache";
import { supabaseToolImageStorage } from "@/lib/storage/toolImages";

/**
 * Bir kelimeyi (Claude'un İngilizce görsel-tanımıyla) kalıcı, cache'li görsel
 * URL'ine çevirir. Provider env'den seçilir; cache + storage concrete'leri burada bağlanır.
 */
export function generateWordImage(input: { word: string; visualPrompt: string }) {
  return image.generateImage(input, {
    provider: image.selectProvider(),
    cache: prismaImageCache,
    storage: supabaseToolImageStorage,
  });
}

/**
 * Üretmeden YALNIZCA cache'e bakar: kelimenin görseli varsa publicUrl, yoksa null.
 * Banka kelimeleri ön-üretildiği için drill'e ücretsiz görsel iliştirmede kullanılır (kredi YOK).
 */
export function lookupCachedWordImage(word: string): Promise<string | null> {
  return image.lookupCachedImage(word, {
    provider: image.selectProvider(),
    cache: prismaImageCache,
  });
}
