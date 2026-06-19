/** Görsel üretimine aday item (artikülasyon drill item'ının alt kümesi). */
export interface PlannableItem {
  word?: string;
  visualPrompt?: string;
  imageUrl?: string;
}

export interface ImageTarget {
  index: number;
  word: string;
  visualPrompt: string;
}

export interface SkippedItem {
  index: number;
  reason: "out_of_range" | "already_has_image" | "no_word";
}

export interface ImagePlan {
  targets: ImageTarget[];
  skipped: SkippedItem[];
}

/**
 * Hangi item'lara görsel üretileceğini saf kurallarla belirler.
 * - requestedIndexes verilmezse tüm item'lar aday.
 * - Zaten imageUrl'i olan → atla (idempotent; "yeniden üret" MVP dışı).
 * - word'ü olmayan → atla.
 * - visualPrompt yoksa word'e düşülür.
 */
export function planImageGeneration(
  items: PlannableItem[],
  requestedIndexes?: number[],
): ImagePlan {
  const indices = requestedIndexes ?? items.map((_, i) => i);
  const targets: ImageTarget[] = [];
  const skipped: SkippedItem[] = [];

  for (const index of indices) {
    const item = items[index];
    if (!item) {
      skipped.push({ index, reason: "out_of_range" });
      continue;
    }
    if (item.imageUrl) {
      skipped.push({ index, reason: "already_has_image" });
      continue;
    }
    if (!item.word) {
      skipped.push({ index, reason: "no_word" });
      continue;
    }
    targets.push({ index, word: item.word, visualPrompt: item.visualPrompt ?? item.word });
  }

  return { targets, skipped };
}
