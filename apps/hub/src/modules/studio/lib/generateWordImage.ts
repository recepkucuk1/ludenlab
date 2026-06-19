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
