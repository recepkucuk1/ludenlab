import { normalizeWord } from "./normalize";

export interface CacheKeyInput {
  word: string;
  styleVersion: string;
  model: string;
}

/** Global görsel cache anahtarı. Aynı kelime+stil+model → aynı anahtar. */
export function buildCacheKey(input: CacheKeyInput): string {
  return `${normalizeWord(input.word)}|${input.styleVersion}|${input.model}`;
}
