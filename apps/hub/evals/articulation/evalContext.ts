import { AsyncLocalStorage } from "node:async_hooks";
import type Anthropic from "@anthropic-ai/sdk";

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
  dry: false | "good" | "bad" | "broken";
  client: Anthropic | null;
} = { model: "claude-sonnet-4-6", dry: false, client: null };

/** Sonnet 5 uyarlaması (kullanıcı onaylı): temperature kabul etmez, düşünme varsayılan açık,
    yeni tokenizer aynı metni ~%30 fazla token sayar → tavan orantılı büyütülür. */
export function adaptParams(model: string, p: Record<string, unknown>): void {
  if (model.startsWith("claude-sonnet-5")) {
    delete p.temperature;
    p.thinking = { type: "disabled" };
    if (typeof p.max_tokens === "number") p.max_tokens = Math.ceil(p.max_tokens * 1.3);
  }
}
