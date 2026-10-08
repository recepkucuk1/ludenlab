import { AsyncLocalStorage } from "node:async_hooks";
import type Anthropic from "@anthropic-ai/sdk";
import type { Variant } from "./lib";

/* Taklit edilen modüllerle çalıştırıcı arasındaki köprü. Vakalar eşzamanlı koştuğu için
   vaka-başı durum AsyncLocalStorage'da taşınır (global değişken karışırdı). */

export interface FixtureStudent {
  id: string;
  name: string;
  birthDate: Date;
  workArea: string;
  diagnosis: string | null;
}

export interface CallRecord {
  request: Record<string, unknown>;
  response: Anthropic.Message;
  latency_s: number;
}

export interface CaseStore {
  student: FixtureStudent | null;
  calls: CallRecord[];
  apiError: unknown;
  savedCard: unknown;
  refunded: boolean;
  deadline: number;
  retries: { count: number };
}

export const als = new AsyncLocalStorage<CaseStore>();

export const runtime: {
  model: string;
  variant: Variant;
  dry: false | "good" | "bad" | "broken";
  client: Anthropic | null;
} = { model: "claude-sonnet-4-6", variant: { model: "claude-sonnet-4-6", label: "" }, dry: false, client: null };

/** Yeni nesil model uyarlaması (Sonnet 5 / Haiku 5.5): varsayılan dışı temperature 400 verir,
    düşünme varsayılan açık (route yanıtın ilk bloğunu okur → şim düşünme bloklarını ayıklar),
    yeni tokenizer aynı metni ~%30 fazla token sayar → tavan orantılı büyütülür. */
export function adaptParams(v: Variant, p: Record<string, unknown>): void {
  if (!v.thinking && !v.tokenScale) return;
  delete p.temperature;
  if (v.thinking === "disabled") p.thinking = { type: "disabled" };
  if (v.thinking === "adaptive") p.thinking = { type: "adaptive" };
  if (v.effort) p.output_config = { ...(p.output_config as object | undefined), effort: v.effort };
  if (v.tokenScale && typeof p.max_tokens === "number") p.max_tokens = Math.ceil(p.max_tokens * v.tokenScale);
}
