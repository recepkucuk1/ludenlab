// apps/hub/evals/lib/shim.ts
import type Anthropic from "@anthropic-ai/sdk";
import { HarnessError, JUDGE, isPending, withBackoff, type AgentModel } from "./core";
import { adaptParams, als, runtime, type CaseStore } from "./evalContext";
import {
  PendingError,
  estimateTokens,
  exchangeKey,
  extractJsonObject,
  messageFromText,
  readResponse,
  rejectAndRelist,
  requestHash,
  writeRequest,
  type ExchangeRequest,
  type ExchangeRole,
} from "./exchange";
import { maskStatic } from "./piiMask";
import { adIziKonum } from "./sharedChecks";

/* Tüm model çağrılarının indiği tek nokta.
   api      → gerçek SDK (runtime.client); üretim messages.create, hakem beta.messages.create
   subagent → exchange dosyaları; yanıt yoksa PendingError (route bunu yutar → store.pending bayrağı).
              Tek araç + zorunlu seçim (kart üreticisi) taklit edilir: aracın şeması `<output_schema>` olur,
              JSON yanıt `tool_use` bloğuna çevrilir (`subagentTool`, `toolUseMessage`).

   ÇOCUK PII KAPISI (birincil): üretim isteği, iki arka uçta da ağa ya da diske çıkmadan ÖNCE burada
   taranır (`store.piiName`); ürün prompt'unun sabit ad-benzeri örnekleri (`piiMask`) yalnız SİSTEM metninde
   maskelenir, kullanıcı metni asla. Tetiklenirse `store.piiLeak`'e kesit yazılır ve `pii_leak` fırlar; route
   hatayı yutar, koşturucu bayrağa bakar. Bekleyen dışındaki her hata `store.apiError`'a yazılır.
   Üretim isteğinin içerik özeti (`requestHash`) iki arka uçta da `store.genHash`'e yazılır. */

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

/** Tüm mesajların metni (düz metin içerik ya da metin blokları). Tek düz metin mesajda içeriğin kendisi. */
function messagesText(p: Record<string, unknown>): string {
  const msgs = Array.isArray(p.messages) ? (p.messages as Array<{ content?: unknown }>) : [];
  return msgs
    .map((m) => {
      const c = m?.content;
      if (typeof c === "string") return c;
      if (!Array.isArray(c)) return "";
      return c.map((b) => (typeof (b as { text?: unknown })?.text === "string" ? (b as { text: string }).text : "")).join("\n");
    })
    .join("\n");
}

/** `adIziKonum` (tuzak teli) eşleşiyorsa eşleşmenin çevresinden ~40 karakterlik kesit (boşluklar teke indirilmiş),
    eşleşmiyorsa null. */
export function piiKesit(text: string, ad: string): string | null {
  const start = adIziKonum(text, ad);
  if (start < 0) return null;
  return text
    .slice(Math.max(0, start - 15), start + ad.trim().length + 20)
    .replace(/\s+/g, " ")
    .trim();
}

function piiGate(store: CaseStore, p: Record<string, unknown>): void {
  if (!store.piiName) return;
  // Yalnız SİSTEM metni maskelenir (sabit prompt örnekleri); kullanıcı metni olduğu gibi taranır.
  const kesit = piiKesit(`${maskStatic(systemText(p))}\n${messagesText(p)}`, store.piiName);
  if (kesit === null) return;
  store.piiLeak = kesit;
  throw new HarnessError("gerçek ad istekte", "pii_leak");
}

function requireStore(): CaseStore {
  const store = als.getStore();
  if (!store) throw new Error("eval: vaka bağlamı (AsyncLocalStorage) yok");
  return store;
}

interface ForcedTool {
  name: string;
  /** Aracın `input_schema`'sı; başlık aracın adı, açıklama aracın açıklaması (alt-ajan şemanın kimin girdisi
      olduğunu görür; ad/açıklama değişince içerik özeti de değişir). */
  schema: Record<string, unknown>;
}

function formatSchema(p: Record<string, unknown>): unknown {
  return (p.output_config as { format?: { schema?: unknown } } | undefined)?.format?.schema;
}

/** Tek araç + zorunlu seçim (tool_choice tool/any; kart üreticisi) ise aracın adı ve şeması, değilse null.
    Hata vermez: içerik özeti iki arka uçta da bundan kurulur. Alt-ajan koruması `subagentTool`'dadır. */
function forcedToolOrNull(p: Record<string, unknown>): ForcedTool | null {
  if (!Array.isArray(p.tools) || p.tools.length !== 1) return null;
  const t = p.tools[0] as { name: string; description?: string; input_schema?: Record<string, unknown> };
  const choice = p.tool_choice as { type?: string; name?: string } | undefined;
  if (!(choice?.type === "any" || (choice?.type === "tool" && choice.name === t.name))) return null;
  return { name: t.name, schema: { title: t.name, ...(t.description ? { description: t.description } : {}), ...t.input_schema } };
}

/** Alt-ajan modunun araç koruması (viaExchange başında, yani PII kapısından sonra). Araç yoksa null.
    - Tek araç + zorunlu seçim değilse harness_error (çok araç / serbest seçim taklit edilemez).
    - Zorunlu araç ile `output_config.format` şeması birlikteyse harness_error: exchange isteği tek şema taşır,
      birini sessizce seçmek yanlış isteği yanıtlatırdı. */
function subagentTool(p: Record<string, unknown>): ForcedTool | null {
  if (!p.tools) return null;
  const tool = forcedToolOrNull(p);
  if (!tool) throw new HarnessError("alt-ajan modu yalnız tek araç + zorunlu seçimi (tool_choice tool/any) destekler", "harness_error");
  if (formatSchema(p)) throw new HarnessError("alt-ajan modu araç ile yapılandırılmış çıktı şemasını (output_config.format) birlikte desteklemez", "harness_error");
  return tool;
}

/** İsteğin exchange biçimi: alt-ajan dosyası ve (iki arka uçta da) içerik özeti bundan kurulur. Zorunlu aracın
    şeması (adı/açıklamasıyla) özete iki arka uçta da girer; yoksa `output_config.format` şeması. */
function toExchangeRequest(p: Record<string, unknown>, meta: Meta): ExchangeRequest {
  const schema = forcedToolOrNull(p)?.schema ?? formatSchema(p);
  return {
    key: meta.key,
    role: meta.role,
    agentModel: meta.agentModel,
    model: String(p.model),
    system: systemText(p),
    user: messagesText(p),
    max_tokens: Number(p.max_tokens ?? 4096),
    ...(schema ? { schema } : {}),
  };
}

function viaExchange(store: CaseStore, p: Record<string, unknown>, req: ExchangeRequest): Anthropic.Message {
  // Exchange dosyası yalnız tek bir düz metin kullanıcı mesajını taşıyabilir; geri kalanı sessizce
  // düşürmek yerine (yanlış isteği yanıtlatmak yerine) sert hata.
  const msgs = p.messages;
  if (!Array.isArray(msgs) || msgs.length !== 1 || typeof (msgs[0] as { content?: unknown })?.content !== "string") {
    throw new HarnessError("alt-ajan modu yalnız tek metin mesajı destekler (çok mesaj / çok parçalı içerik yok)", "harness_error");
  }
  const tool = subagentTool(p);
  // Yanıt yalnız bu isteğin içerik hash'i tutuyorsa okunur; değilse istek (yeniden) yazılır.
  const text = readResponse(store.exchangeDir, req);
  if (text === null) {
    writeRequest(store.exchangeDir, req);
    store.pending.push(`${req.key}.${req.role}`);
    throw new PendingError(req.key);
  }
  // Yanıtı veren gerçek model değil alt-ajandır: etiket `<takma ad>@subagent` (runner'ın `served_model`'i ve
  // hakemin `judge_model`'i buradan okunur). Sunulan-model denetimi (`servedModelMatches`) yalnız api'dedir.
  const base = messageFromText(text, `${req.agentModel}@subagent`, estimateTokens(req.system + req.user));
  const res = tool ? toolUseMessage(store, req, base, tool, text) : base;
  store.calls.push({ request: p, response: res, latency_s: 0, backend: "subagent" });
  return res;
}

/** Araç girdisinin yapı sorunu: nesne değilse ya da şemanın üst düzey `required` alanlarından biri yoksa. */
function toolInputProblem(input: unknown, schema: Record<string, unknown>): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "JSON nesnesi değil";
  const required = Array.isArray(schema.required) ? schema.required.filter((k): k is string => typeof k === "string") : [];
  const missing = required.filter((k) => !Object.hasOwn(input, k));
  return missing.length ? `zorunlu alan eksik: ${missing.join(", ")}` : null;
}

/** Alt-ajanın JSON yanıtını (kod çitli ya da çıplak) `tool_use` bloğuna çevirir. Çözülemez ya da yapısı yanlışsa
    (nesne değil, zorunlu alan eksik, üst düzey dizi) yanıt kenara alınır, istek aynı koşuda yeniden listelenir ve
    `tool_parse` fırlar (hakemdeki `judge_parse` deseni). */
function toolUseMessage(store: CaseStore, req: ExchangeRequest, base: Anthropic.Message, tool: ForcedTool, text: string): Anthropic.Message {
  let input: unknown;
  let problem: string | null;
  try {
    input = extractJsonObject(text);
    problem = toolInputProblem(input, tool.schema);
  } catch {
    problem = "JSON olarak çözülemedi";
  }
  if (problem) {
    rejectAndRelist(store, req.key, req.role);
    throw new HarnessError(`araç girdisi (tool_use) geçersiz: ${problem}`, "tool_parse");
  }
  return {
    ...base,
    stop_reason: "tool_use",
    content: [{ type: "tool_use", id: "toolu_subagent", name: tool.name, input }],
  } as unknown as Anthropic.Message;
}

async function viaApi(store: CaseStore, p: Record<string, unknown>, meta: Meta, opts: CallOpts): Promise<Anthropic.Message> {
  const c = runtime.client;
  if (!c) throw new HarnessError("api arka ucu: istemci yok", "harness_error");
  let started = Date.now();
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
}

async function dispatch(store: CaseStore, p: Record<string, unknown>, meta: Meta, opts: CallOpts = {}): Promise<Anthropic.Message> {
  try {
    const req = toExchangeRequest(p, meta);
    if (meta.role === "gen") {
      piiGate(store, p);
      store.genHash = requestHash(req);
    }
    return runtime.backend === "subagent" ? viaExchange(store, p, req) : await viaApi(store, p, meta, opts);
  } catch (e) {
    // Route hatayı yutar; koşturucu sınıfını (koruma, PII, zaman aşımı, API) buradan okur. Bekleyen istek hata değildir.
    if (!isPending(e)) store.apiError = e;
    throw e;
  }
}

/** Üretim çağrısı. Studio `anthropic.messages.create` ve Atölye `definePrompt().run` buraya iner. */
export async function createMessage(params: Record<string, unknown>): Promise<Anthropic.Message> {
  const store = requireStore();
  const p = structuredClone(params);
  p.model = runtime.variant.model;
  adaptParams(runtime.variant, p);
  return dispatch(store, p, { key: exchangeKey(store.caseId, store.rep), role: "gen", agentModel: runtime.variant.agentModel });
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
  return dispatch(store, p, { key: exchangeKey(store.caseId, store.rep, tag), role: "judge", agentModel: JUDGE.agentModel }, opts);
}
