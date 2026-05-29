import { type TokenUsage } from "./client";

interface ModelPricing {
  /** USD / 1M token */
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

/**
 * Yaklaşık fiyatlandırma (USD / 1M token). Placeholder — Faz 5'te Studio'nun
 * gerçek kredi tablosuyla birleşecek (bkz. ROADMAP.md).
 */
const PRICING: Record<string, ModelPricing> = {
  "claude-sonnet-4-6": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-opus-4-8": { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
};

export function estimateCostUsd(model: string, u: TokenUsage): number {
  const p = PRICING[model] ?? PRICING["claude-sonnet-4-6"]!;
  return (
    (u.inputTokens * p.input +
      u.outputTokens * p.output +
      u.cacheCreationTokens * p.cacheWrite +
      u.cacheReadTokens * p.cacheRead) /
    1_000_000
  );
}

/** Basit kredi dönüşümü (1 kredi ≈ 0.01 USD). Faz 5'te netleşecek. */
export function estimateCredits(model: string, u: TokenUsage): number {
  return Math.max(1, Math.ceil(estimateCostUsd(model, u) * 100));
}
