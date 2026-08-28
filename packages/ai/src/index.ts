export { getClaude, runPrompt, DEFAULT_MODEL } from "./client";
export type { RunPromptOptions, RunPromptResult, TokenUsage } from "./client";
export { estimateCostUsd, estimateCredits } from "./usage";
export { definePrompt } from "./prompt";
export type { PromptDef, CompiledPrompt } from "./prompt";
export * as image from "./image";
export * as articulation from "./articulation";
export type {
  ImageProvider,
  ImageGenerateInput,
  ImageGenerateResult,
  ImageCacheStore,
  ImageStorage,
  CachedImage,
  GenerateImageInput,
  GenerateImageOutput,
  GenerateImageDeps,
  PlannableItem,
  ImageTarget,
  SkippedItem,
  ImagePlan,
} from "./image";

// ── Çocuk PII takma-adlaştırma (2026-08 güvenlik denetimi #09) ──
export {
  nameClass,
  pickAlias,
  pseudonymizeText,
  pseudonymizeDeep,
  rehydrateText,
  suffixBearingToken,
} from "./pseudonym";
export type { NameMapping, PickAliasOptions } from "./pseudonym";
