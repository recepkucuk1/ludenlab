// apps/hub/evals/lib/shim.ts
import type Anthropic from "@anthropic-ai/sdk";
import { JUDGE, withBackoff } from "./core";
import { adaptParams, als, runtime, type CaseStore } from "./evalContext";
import { PendingError, estimateTokens, messageFromText, readResponse, writeRequest, type ExchangeRequest, type ExchangeRole } from "./exchange";

/* Tüm model çağrılarının indiği tek nokta.
   api      → gerçek SDK (runtime.client); üretim messages.create, hakem beta.messages.create
   subagent → exchange dosyaları; yanıt yoksa PendingError (route bunu yutar → store.pending bayrağı) */

interface Meta {
  key: string;
  role: ExchangeRole;
  agentModel: "sonnet" | "haiku" | "opus";
}

function systemText(p: Record<string, unknown>): string {
  const s = p.system;
  if (Array.isArray(s)) return s.map((b) => String((b as { text?: string }).text ?? "")).join("\n");
  return typeof s === "string" ? s : "";
}

function userText(p: Record<string, unknown>): string {
  const first = (p.messages as Array<{ content?: unknown }> | undefined)?.[0];
  return typeof first?.content === "string" ? first.content : "";
}

function requireStore(): CaseStore {
  const store = als.getStore();
  if (!store) throw new Error("eval: vaka bağlamı (AsyncLocalStorage) yok");
  return store;
}

async function dispatch(store: CaseStore, p: Record<string, unknown>, meta: Meta): Promise<Anthropic.Message> {
  const sys = systemText(p);
  const usr = userText(p);

  if (runtime.backend === "subagent") {
    const format = (p.output_config as { format?: { schema?: unknown } } | undefined)?.format;
    const req: ExchangeRequest = {
      key: meta.key,
      role: meta.role,
      agentModel: meta.agentModel,
      model: String(p.model),
      system: sys,
      user: usr,
      max_tokens: Number(p.max_tokens ?? 4096),
      ...(format?.schema ? { schema: format.schema } : {}),
    };
    // Yanıt yalnız bu isteğin içerik hash'i tutuyorsa okunur; değilse istek (yeniden) yazılır.
    const text = readResponse(store.exchangeDir, req);
    if (text === null) {
      writeRequest(store.exchangeDir, req);
      store.pending.push(`${meta.key}.${meta.role}`);
      throw new PendingError(meta.key);
    }
    const res = messageFromText(text, String(p.model), estimateTokens(sys + usr));
    store.calls.push({ request: p, response: res, latency_s: 0, backend: "subagent" });
    return res;
  }

  let started = Date.now();
  try {
    const res = await withBackoff(
      () => {
        started = Date.now();
        const c = runtime.client!;
        const call = meta.role === "judge"
          ? c.beta.messages.create(p as never, { timeout: 300_000 })
          : c.messages.create(p as never, { timeout: 300_000 });
        return call as unknown as Promise<Anthropic.Message>;
      },
      store.retries,
      store.deadline,
    );
    store.calls.push({ request: p, response: res, latency_s: (Date.now() - started) / 1000, backend: "api" });
    // Route yanıtın İLK bloğunu metin sayar; düşünme açıkken ilk blok thinking olur → ayıkla.
    const text = res.content.filter((b) => b.type === "text");
    return text.length === res.content.length ? res : { ...res, content: text };
  } catch (e) {
    store.apiError = e;
    throw e;
  }
}

/** Üretim çağrısı. Studio `anthropic.messages.create` ve Atölye `definePrompt().run` buraya iner. */
export async function createMessage(params: Record<string, unknown>): Promise<Anthropic.Message> {
  const store = requireStore();
  const p = structuredClone(params);
  p.model = runtime.variant.model;
  adaptParams(runtime.variant, p);
  return dispatch(store, p, { key: `${store.caseId}_rep${store.rep}`, role: "gen", agentModel: runtime.variant.agentModel });
}

/** Hakem çağrısı. `tag` sırayı adlandırır (ab: aday A'da, ba: aday B'de) → dosya anahtarı deterministik. */
export async function createJudgeMessage(params: Record<string, unknown>, tag: "ab" | "ba"): Promise<Anthropic.Message> {
  const store = requireStore();
  const p = structuredClone(params);
  p.model = JUDGE.model;
  return dispatch(store, p, { key: `${store.caseId}_rep${store.rep}.judge-${tag}`, role: "judge", agentModel: JUDGE.agentModel });
}
