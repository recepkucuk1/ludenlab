import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-sonnet-4-6";

// Model fiyatlandırması TEK KAYNAK: @ludenlab/ai (estimateCostUsd/estimateCredits).
// Eski yerel SONNET_4_6_PRICING + calcCost kaldırıldı (drift riski); bkz. lib/usage.ts.
