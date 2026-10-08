// apps/hub/evals/lib/shim.ts
import type Anthropic from "@anthropic-ai/sdk";
import { HarnessError, JUDGE, withBackoff, type AgentModel } from "./core";
import { adaptParams, als, runtime, type CaseStore } from "./evalContext";
import { PendingError, estimateTokens, messageFromText, readResponse, writeRequest, type ExchangeRequest, type ExchangeRole } from "./exchange";

/* Tüm model çağrılarının indiği tek nokta.
   api      → gerçek SDK (runtime.client); üretim messages.create, hakem beta.messages.create
   subagent → exchange dosyaları; yanıt yoksa PendingError (route bunu yutar → store.pending bayrağı) */

interface Meta {
  key: string;
  role: ExchangeRole;
  agentModel: AgentModel;
}

/** Çağrı başına yeniden deneme sayacı ve süre tavanı; verilmezse vakanınkiler (store) kullanılır. */
export interface CallOpts {
  retry?: { count: number };
  deadline?: number;
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

async function dispatch(store: CaseStore, p: Record<string, unknown>, meta: Meta, opts: CallOpts = {}): Promise<Anthropic.Message> {
  if (runtime.backend === "subagent") {
    // Exchange dosyası yalnız tek bir düz metin kullanıcı mesajını taşıyabilir; geri kalanı sessizce
    // düşürmek yerine (yanlış isteği yanıtlatmak yerine) sert hata.
    const msgs = p.messages;
    if (!Array.isArray(msgs) || msgs.length !== 1 || typeof (msgs[0] as { content?: unknown })?.content !== "string" || p.tools) {
      throw new HarnessError("alt-ajan modu yalnız tek metin mesajı destekler (araç tanımı / çok parçalı içerik yok)", "harness_error");
    }
    const sys = systemText(p);
    const usr = userText(p);
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
    const c = runtime.client;
    if (!c) throw new HarnessError("api arka ucu: istemci yok", "harness_error");
    const res = await withBackoff(
      () => {
        started = Date.now();
        const call = meta.role === "judge"
          ? c.beta.messages.create(p as never, { timeout: 300_000 })
          : c.messages.create(p as never, { timeout: 300_000 });
        return call as unknown as Promise<Anthropic.Message>;
      },
      opts.retry ?? store.retries,
      opts.deadline ?? store.deadline,
    );
    store.calls.push({ request: p, response: res, latency_s: (Date.now() - started) / 1000, backend: "api" });
    // Route yanıtın İLK bloğunu metin sayar; düşünme açıkken ilk blok thinking olur → yalnız düşünme
    // bloklarını ayıkla (tool_use vb. kalır). Kayıttaki yanıt (store.calls) özgün hâliyle durur.
    const kept = res.content.filter((b) => b.type !== "thinking" && b.type !== "redacted_thinking");
    return kept.length === res.content.length ? res : { ...res, content: kept };
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

/** Hakem çağrısı. `tag` sırayı adlandırır (ab: aday A'da, ba: aday B'de) → dosya anahtarı deterministik.
    `opts` verilirse yeniden deneme sayacı / süre tavanı vakanınki yerine bunlar olur. */
export async function createJudgeMessage(
  params: Record<string, unknown>,
  tag: "ab" | "ba",
  opts?: CallOpts,
): Promise<Anthropic.Message> {
  const store = requireStore();
  const p = structuredClone(params);
  p.model = JUDGE.model;
  return dispatch(store, p, { key: `${store.caseId}_rep${store.rep}.judge-${tag}`, role: "judge", agentModel: JUDGE.agentModel }, opts);
}
