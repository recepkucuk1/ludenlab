import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-sonnet-4-6";

/**
 * Sonnet 4.6 — USD per 1M token.
 * Kaynak: Claude docs (Şubat 2026 cache).
 */
export const SONNET_4_6_PRICING = {
  inputPerMTok: 3.0,
  outputPerMTok: 15.0,
  cacheWritePerMTok: 3.75, // 5-min ephemeral = 1.25x input
  cacheReadPerMTok: 0.3, // 0.1x input
} as const;

/**
 * `message.usage` objesinden USD maliyeti hesaplar. Tüm SDK usage alanlarını
 * (cache hariç ham input, cache write, cache read, output) ayrı ayrı fiyatlar.
 */
export function calcCost(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}): {
  inputUsd: number;
  outputUsd: number;
  cacheWriteUsd: number;
  cacheReadUsd: number;
  totalUsd: number;
} {
  const p = SONNET_4_6_PRICING;
  const inputUsd = (usage.input_tokens / 1_000_000) * p.inputPerMTok;
  const outputUsd = (usage.output_tokens / 1_000_000) * p.outputPerMTok;
  const cacheWriteUsd =
    ((usage.cache_creation_input_tokens ?? 0) / 1_000_000) * p.cacheWritePerMTok;
  const cacheReadUsd =
    ((usage.cache_read_input_tokens ?? 0) / 1_000_000) * p.cacheReadPerMTok;
  return {
    inputUsd,
    outputUsd,
    cacheWriteUsd,
    cacheReadUsd,
    totalUsd: inputUsd + outputUsd + cacheWriteUsd + cacheReadUsd,
  };
}
