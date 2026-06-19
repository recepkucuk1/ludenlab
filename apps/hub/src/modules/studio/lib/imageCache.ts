import { prisma } from "@studio/lib/db";
import type { ImageCacheStore } from "@ludenlab/ai";

/** GeneratedImage tablosuyla görsel cache. cacheKey unique → tekil lookup. */
export const prismaImageCache: ImageCacheStore = {
  async find(cacheKey: string) {
    const row = await prisma.generatedImage.findUnique({
      where: { cacheKey },
      select: { publicUrl: true },
    });
    return row ? { publicUrl: row.publicUrl } : null;
  },

  async save(record) {
    // Yarış güvenli: aynı cacheKey paralel üretilirse ikinci create unique
    // ihlali atar; upsert ile no-op'a çeviriyoruz (ilk yazan kazanır).
    await prisma.generatedImage.upsert({
      where: { cacheKey: record.cacheKey },
      create: { ...record },
      update: {},
    });
  },
};
