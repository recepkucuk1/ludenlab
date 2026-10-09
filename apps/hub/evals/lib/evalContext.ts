// apps/hub/evals/lib/evalContext.ts
import { AsyncLocalStorage } from "node:async_hooks";
import type Anthropic from "@anthropic-ai/sdk";
import { VARIANTS, type Backend, type Fixture, type Variant } from "./core";

/* Taklit edilen modüllerle koşturucu arasındaki köprü. Vakalar eşzamanlı koştuğu için vaka-başı
   durum AsyncLocalStorage'da taşınır. */

export interface CallRecord {
  request: Record<string, unknown>;
  response: Anthropic.Message;
  latency_s: number;
  backend: Backend;
}

export interface CaseStore {
  caseId: string;
  rep: number;
  fixture: Fixture | null;
  /** Bu varyantın exchange dizini (subagent modunda). */
  exchangeDir: string;
  calls: CallRecord[];
  /** Yanıtı olmayan istekler ("<key>.<role>"). Route hatayı yuttuğu için bayrak buradadır. */
  pending: string[];
  apiError: unknown;
  /** Taklit edilen kayıt (kart ya da belge) — adaptör doğrulaması için. */
  saved: unknown;
  refunded: boolean;
  deadline: number;
  retries: { count: number };
  /** Fikstürdeki gerçek ilk ad (koşturucu koyar). Varsa shim her üretim isteğini ağa/diske çıkmadan buna karşı tarar. */
  piiName?: string;
  /** Shim'in PII kapısı tetiklendiyse eşleşmenin çevresinden ~40 karakterlik kesit. Route hatayı yuttuğu için
      bayrak buradadır (`pending` gibi); koşturucu invoke'tan sonra bakar. */
  piiLeak?: string;
  /** Son üretim isteğinin içerik özeti (`requestHash`; iki arka uçta da shim koyar) — sonuç satırında `gen_hash`. */
  genHash?: string;
  /** Vaka kimliğinden tohumlanmış rastgele üreteç (seed.ts tembel kurar); Math.random yerleştirmesi bunu kullanır. */
  rng?: () => number;
}

export const als = new AsyncLocalStorage<CaseStore>();

export const runtime: { backend: Backend; variant: Variant; client: Anthropic | null } = {
  backend: "subagent",
  variant: VARIANTS.baseline!,
  client: null,
};

/** Yeni nesil model uyarlaması (Haiku 5.5 / Sonnet 5.x). Yalnız thinking/tokenScale/effort taşıyan
    varyantta devreye girer; eski varyantların isteğine dokunulmaz.
    - Haiku 5.5 varsayılan dışı sıcaklık/top_p/top_k'yı 400 ile reddeder → üçü de silinir.
    - `thinking: disabled` Sonnet 5.5/Opus 5.5'te 400 verir; Haiku 5.5'te yalnız effort ≤ high ile geçerlidir.
    - Düşünme token'ları da tavandan yer, yeni tokenizer ~%30 fazla sayar → tavan `tokenScale` ile büyütülür. */
export function adaptParams(v: Variant, p: Record<string, unknown>): void {
  if (!v.thinking && !v.tokenScale && !v.effort) return;
  delete p.temperature;
  delete p.top_p;
  delete p.top_k;
  if (v.thinking === "disabled") p.thinking = { type: "disabled" };
  if (v.thinking === "adaptive") p.thinking = { type: "adaptive" };
  if (v.effort) p.output_config = { ...(p.output_config as object | undefined), effort: v.effort };
  if (v.tokenScale && typeof p.max_tokens === "number") p.max_tokens = Math.ceil(p.max_tokens * v.tokenScale);
}
