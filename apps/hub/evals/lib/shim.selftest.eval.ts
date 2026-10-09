// apps/hub/evals/lib/shim.selftest.eval.ts
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JUDGE, VARIANTS } from "./core";
import { als, runtime, type CaseStore } from "./evalContext";
import { requestPaths } from "./exchange";
import { createJudgeMessage, createMessage, piiKesit } from "./shim";

function store(dir: string): CaseStore {
  return {
    caseId: "ss-01",
    rep: 0,
    fixture: null,
    exchangeDir: dir,
    calls: [],
    pending: [],
    apiError: null,
    saved: null,
    refunded: false,
    deadline: Date.now() + 60_000,
    retries: { count: 0 },
  };
}

const params = {
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  temperature: 0.5,
  system: [{ type: "text", text: "Sistem metni", cache_control: { type: "ephemeral" } }],
  messages: [{ role: "user", content: "Kullanıcı metni" }],
};

const judgeParams = { ...params, model: "claude-opus-5", output_config: { format: { type: "json_schema", schema: { type: "object" } } } };

const tmp = () => mkdtempSync(path.join(tmpdir(), "shim-"));

/** Vaka kimliği "c1" olan boş store (araç taklidi testleri). */
const makeStore = (dir: string): CaseStore => ({ ...store(dir), caseId: "c1" });

beforeEach(() => {
  runtime.backend = "subagent";
  runtime.variant = VARIANTS.baseline!;
  runtime.client = null;
});

describe("shim (subagent arka ucu)", () => {
  it("yanıt yoksa isteği yazar, pending'e ekler ve PendingError fırlatır", async () => {
    runtime.backend = "subagent";
    runtime.variant = VARIANTS.v2!;
    const dir = tmp();
    const st = store(dir);
    await expect(als.run(st, () => createMessage(params))).rejects.toMatchObject({ failureClass: "pending" });
    expect(st.pending).toEqual(["ss-01_rep0.gen"]);
    expect(st.apiError).toBeNull(); // bekleyen istek hata değil
    const p = requestPaths(dir, "ss-01_rep0", "gen");
    expect(existsSync(p.md)).toBe(true);
    const json = JSON.parse(readFileSync(p.json, "utf8"));
    expect(json.model).toBe("claude-haiku-5-5"); // varyantın modeli
    expect(json.agentModel).toBe("haiku");
    expect(json.system).toBe("Sistem metni");
    expect(json.user).toBe("Kullanıcı metni");
    expect(json.max_tokens).toBe(Math.ceil(4096 * 1.6)); // tokenScale uygulandı
    expect(json.hash).toMatch(/^[0-9a-f]{12}$/);
    const md = readFileSync(p.md, "utf8");
    expect(md).toContain("<system>\nSistem metni\n</system>");
    expect(md).not.toContain("ss-01_rep0"); // körleştirme: anahtar yalnız json'da
  });

  it("yanıt varsa Message döner ve çağrıyı kaydeder", async () => {
    runtime.backend = "subagent";
    runtime.variant = VARIANTS.baseline!;
    const dir = tmp();
    const st = store(dir);
    // Önce istek yazılmalı (json'daki hash yanıtı bu isteğe bağlar), sonra yanıt.
    await expect(als.run(st, () => createMessage(params))).rejects.toMatchObject({ failureClass: "pending" });
    writeFileSync(requestPaths(dir, "ss-01_rep0", "gen").response, '{"title":"Deneme"}');
    const res = await als.run(st, () => createMessage(params));
    expect(res.model).toBe("sonnet@subagent"); // yanıtı veren alt-ajan: `<takma ad>@subagent`, API kimliği değil
    expect(res.content[0]).toMatchObject({ type: "text", text: '{"title":"Deneme"}' });
    expect(st.calls).toHaveLength(1);
    expect(st.calls[0]!.backend).toBe("subagent");
    expect(st.pending).toEqual(["ss-01_rep0.gen"]); // yalnız ilk (bekleyen) çağrının kaydı; ikinci çağrı eklemedi
  });

  it("hakem anahtarı sırayı taşır ve şemayı isteğe yazar", async () => {
    runtime.backend = "subagent";
    const dir = tmp();
    const st = store(dir);
    await expect(als.run(st, () => createJudgeMessage(judgeParams, "ba"))).rejects.toMatchObject({ failureClass: "pending" });
    const p = requestPaths(dir, "ss-01_rep0.judge-ba", "judge");
    expect(existsSync(p.json)).toBe(true);
    expect(JSON.parse(readFileSync(p.json, "utf8")).schema).toEqual({ type: "object" });
    expect(readFileSync(p.md, "utf8")).toContain("<output_schema>");
  });

  it("hakem yanıtının modeli `opus@subagent` (JUDGE.model değil)", async () => {
    runtime.backend = "subagent";
    const dir = tmp();
    const st = store(dir);
    await expect(als.run(st, () => createJudgeMessage(judgeParams, "ab"))).rejects.toMatchObject({ failureClass: "pending" });
    writeFileSync(requestPaths(dir, "ss-01_rep0.judge-ab", "judge").response, "{}");
    const res = await als.run(st, () => createJudgeMessage(judgeParams, "ab"));
    expect(res.model).toBe("opus@subagent");
  });

  it("tek metin mesajı dışındaki istek harness_error verir; hiçbir dosya yazılmaz", async () => {
    const bad: Array<Record<string, unknown>> = [
      { ...params, messages: [{ role: "user", content: "a" }, { role: "assistant", content: "b" }] },
      { ...params, messages: [{ role: "user", content: [{ type: "text", text: "a" }] }] },
      { ...params, tools: [{ name: "x", input_schema: { type: "object" } }] },
    ];
    for (const b of bad) {
      const dir = tmp();
      const st = store(dir);
      await expect(als.run(st, () => createMessage(b))).rejects.toMatchObject({ failureClass: "harness_error" });
      expect(readdirSync(dir)).toEqual([]);
      expect(st.pending).toEqual([]);
      expect(st.apiError).toMatchObject({ failureClass: "harness_error" }); // koşturucu sınıfı buradan okur
    }
  });
});

describe("tool_use taklidi (alt-ajan)", () => {
  const TOOL = { name: "emit_card", description: "kart", input_schema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] } };
  const toolParams = () => ({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: "S",
    tools: [TOOL],
    tool_choice: { type: "tool", name: "emit_card" },
    messages: [{ role: "user", content: "U" }],
  });

  it("istek şemayla yazılır; JSON yanıt tool_use bloğu olur", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "shim-tool-"));
    const st = makeStore(dir);
    await expect(als.run(st, () => createMessage(toolParams()))).rejects.toMatchObject({ failureClass: "pending" });
    const md = readFileSync(path.join(dir, "c1_rep0.gen.request.md"), "utf8");
    expect(md).toContain("<output_schema>");
    expect(md).toContain('"title"'); // şema metni
    writeFileSync(path.join(dir, "c1_rep0.gen.response.txt"), '```json\n{"title":"Kart"}\n```');
    const st2 = makeStore(dir);
    const res = await als.run(st2, () => createMessage(toolParams()));
    expect(res.stop_reason).toBe("tool_use");
    expect(res.content).toHaveLength(1);
    expect(res.content[0]).toMatchObject({ type: "tool_use", name: "emit_card", input: { title: "Kart" } });
    expect(res.model).toBe("sonnet@subagent");
    expect(st2.calls).toHaveLength(1);
    expect(st2.calls[0]!.response).toBe(res);
  });

  it("bozuk JSON: yanıt kenara alınır, istek yeniden listelenir, tool_parse fırlar", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "shim-tool-"));
    await expect(als.run(makeStore(dir), () => createMessage(toolParams()))).rejects.toMatchObject({ failureClass: "pending" });
    writeFileSync(path.join(dir, "c1_rep0.gen.response.txt"), "bu json değil");
    const st = makeStore(dir);
    await expect(als.run(st, () => createMessage(toolParams()))).rejects.toMatchObject({ failureClass: "tool_parse" });
    expect(existsSync(path.join(dir, "c1_rep0.gen.response.rejected.txt"))).toBe(true);
    expect(existsSync(path.join(dir, "c1_rep0.gen.response.txt"))).toBe(false); // yeniden dağıtılabilir
    expect(st.pending).toEqual(["c1_rep0.gen"]);
    expect(st.calls).toEqual([]);
    expect(st.apiError).toMatchObject({ failureClass: "tool_parse" });
  });

  it("yapısı yanlış girdi tool_parse: zorunlu alan eksik, sarmalayıcı nesne, dizi", async () => {
    const bad = ["{}", '{"name":"emit_card","input":{"title":"Kart"}}', '[{"title":"x"}]', '```json\n[{"title":"x"}]\n```', '"Kart"'];
    for (const text of bad) {
      const dir = mkdtempSync(path.join(tmpdir(), "shim-tool-"));
      await expect(als.run(makeStore(dir), () => createMessage(toolParams()))).rejects.toMatchObject({ failureClass: "pending" });
      writeFileSync(path.join(dir, "c1_rep0.gen.response.txt"), text);
      const st = makeStore(dir);
      await expect(als.run(st, () => createMessage(toolParams())), text).rejects.toMatchObject({ failureClass: "tool_parse" });
      expect(st.pending, text).toEqual(["c1_rep0.gen"]);
      expect(existsSync(path.join(dir, "c1_rep0.gen.response.rejected.txt")), text).toBe(true);
    }
    // Eksik zorunlu alan hata mesajında adıyla geçer.
    const dir = mkdtempSync(path.join(tmpdir(), "shim-tool-"));
    await expect(als.run(makeStore(dir), () => createMessage(toolParams()))).rejects.toMatchObject({ failureClass: "pending" });
    writeFileSync(path.join(dir, "c1_rep0.gen.response.txt"), '{"baslik":"Kart"}');
    await expect(als.run(makeStore(dir), () => createMessage(toolParams()))).rejects.toThrow(/zorunlu alan eksik: title/);
  });

  it("birden çok araç, serbest/başka araca seçim, seçimsiz araç ya da araç + çıktı şeması desteklenmez", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "shim-tool-"));
    const { tool_choice: _omit, ...noChoice } = toolParams();
    const bad: Array<Record<string, unknown>> = [
      { ...toolParams(), tools: [TOOL, { ...TOOL, name: "x" }] },
      { ...toolParams(), tool_choice: { type: "auto" } },
      { ...toolParams(), tool_choice: { type: "tool", name: "other" } },
      noChoice,
      // Exchange isteği tek şema taşır: hangisinin geçerli olduğunu sessizce seçmek yanlış isteği yanıtlatırdı.
      { ...toolParams(), output_config: { format: { type: "json_schema", schema: { type: "object" } } } },
    ];
    for (const p of bad) {
      const st = makeStore(dir);
      await expect(als.run(st, () => createMessage(p)), JSON.stringify(p.tool_choice)).rejects.toMatchObject({ failureClass: "harness_error" });
      expect(st.pending).toEqual([]);
    }
    expect(readdirSync(dir)).toEqual([]);
  });

  it("tool_choice any (tek araç) kabul edilir", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "shim-tool-"));
    const p = { ...toolParams(), tool_choice: { type: "any" } };
    await expect(als.run(makeStore(dir), () => createMessage(p))).rejects.toMatchObject({ failureClass: "pending" });
    writeFileSync(path.join(dir, "c1_rep0.gen.response.txt"), '{"title":"Kart"}');
    const res = await als.run(makeStore(dir), () => createMessage(p));
    expect(res.content[0]).toMatchObject({ type: "tool_use", name: "emit_card", input: { title: "Kart" } });
  });

  it("araç koruması PII kapısından sonra: sızıntılı + desteklenmeyen araçlı istek pii_leak verir", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "shim-tool-"));
    const st = { ...makeStore(dir), piiName: "Ela" };
    const p = { ...toolParams(), tool_choice: { type: "auto" }, messages: [{ role: "user", content: "Elanın kartı" }] };
    await expect(als.run(st, () => createMessage(p))).rejects.toMatchObject({ failureClass: "pii_leak" });
    expect(readdirSync(dir)).toEqual([]);
  });

  it("içerik özeti aracın şemasını, adını ve açıklamasını kapsar ve iki arka uçta aynıdır", async () => {
    const subDir = tmp();
    const sub = makeStore(subDir);
    await expect(als.run(sub, () => createMessage(toolParams()))).rejects.toMatchObject({ failureClass: "pending" });
    const schema = JSON.parse(readFileSync(requestPaths(subDir, "c1_rep0", "gen").json, "utf8")).schema;
    expect(schema).toEqual({ title: "emit_card", description: "kart", ...TOOL.input_schema }); // alt-ajan şemanın kimin girdisi olduğunu görür
    const hashOf = async (tool: Record<string, unknown>) => {
      const st = makeStore(tmp());
      const p = { ...toolParams(), tools: [tool], tool_choice: { type: "tool", name: tool.name } };
      await expect(als.run(st, () => createMessage(p))).rejects.toMatchObject({ failureClass: "pending" });
      return st.genHash;
    };
    expect(await hashOf({ ...TOOL, input_schema: { type: "object", properties: { baslik: { type: "string" } } } })).not.toBe(sub.genHash);
    expect(await hashOf({ ...TOOL, description: "başka açıklama" })).not.toBe(sub.genHash);
    expect(await hashOf({ ...TOOL, name: "emit_other" })).not.toBe(sub.genHash);
    expect(await hashOf({ ...TOOL })).toBe(sub.genHash);

    runtime.backend = "api";
    stubClient(async () => apiMessage([{ type: "tool_use", id: "tu_1", name: "emit_card", input: { title: "K" } }]));
    const api = makeStore(tmp());
    await als.run(api, () => createMessage(toolParams()));
    expect(api.genHash).toBe(sub.genHash);
    const apiDesc = makeStore(tmp());
    await als.run(apiDesc, () => createMessage({ ...toolParams(), tools: [{ ...TOOL, description: "başka açıklama" }] }));
    expect(apiDesc.genHash).not.toBe(api.genHash);
  });

  it("api arka ucu araç biçimini kısıtlamaz (serbest seçim / çok araç gerçek API'ye gider)", async () => {
    runtime.backend = "api";
    const { create } = stubClient(async () => apiMessage([{ type: "text", text: "a" }]));
    const free = { ...toolParams(), tools: [TOOL, { ...TOOL, name: "x" }], tool_choice: { type: "auto" } };
    const st = makeStore(tmp());
    await als.run(st, () => createMessage(free));
    expect(create).toHaveBeenCalledTimes(1);
    expect(st.apiError).toBeNull();
  });
});

/* ── api arka ucu: SDK yerine taklit istemci ── */

type CreateFn = (p: Record<string, unknown>, o?: unknown) => Promise<unknown>;

function apiMessage(content: unknown[]) {
  return {
    id: "msg_api",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-6",
    content,
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5 },
  };
}

function stubClient(impl: CreateFn) {
  const create = vi.fn<CreateFn>(impl);
  const betaCreate = vi.fn<CreateFn>(impl);
  runtime.client = { messages: { create }, beta: { messages: { create: betaCreate } } } as never;
  return { create, betaCreate };
}

describe("shim (api arka ucu)", () => {
  it("düşünme blokları dönen mesajdan ayıklanır; kayıttaki yanıt özgün kalır", async () => {
    runtime.backend = "api";
    const original = apiMessage([
      { type: "thinking", thinking: "düşünce", signature: "sig" },
      { type: "redacted_thinking", data: "gizli" },
      { type: "text", text: "merhaba" },
    ]);
    const { create, betaCreate } = stubClient(async () => original);
    const st = store(tmp());
    const res = await als.run(st, () => createMessage(params));
    expect(create).toHaveBeenCalledTimes(1);
    expect(betaCreate).not.toHaveBeenCalled();
    expect(res.content).toEqual([{ type: "text", text: "merhaba" }]);
    expect(st.calls).toHaveLength(1);
    expect(st.calls[0]!.backend).toBe("api");
    expect(st.calls[0]!.response).toBe(original);
    expect(st.calls[0]!.response.content).toHaveLength(3);
  });

  it("tool_use bloğu korunur; düşünme bloğu yoksa aynı nesne döner", async () => {
    runtime.backend = "api";
    const withTool = apiMessage([
      { type: "thinking", thinking: "düşünce", signature: "sig" },
      { type: "text", text: "a" },
      { type: "tool_use", id: "tu_1", name: "kaydet", input: {} },
    ]);
    stubClient(async () => withTool);
    const res = await als.run(store(tmp()), () => createMessage(params));
    expect(res.content.map((b) => b.type)).toEqual(["text", "tool_use"]);

    const plain = apiMessage([{ type: "text", text: "a" }, { type: "tool_use", id: "tu_2", name: "kaydet", input: {} }]);
    stubClient(async () => plain);
    expect(await als.run(store(tmp()), () => createMessage(params))).toBe(plain);
  });

  it("hakem beta.messages.create'e gider; opts.deadline vakanınkinin yerine geçer", async () => {
    runtime.backend = "api";
    const { create, betaCreate } = stubClient(async () => apiMessage([{ type: "text", text: "{}" }]));
    const st = store(tmp());
    await als.run(st, () => createJudgeMessage(judgeParams, "ab"));
    expect(betaCreate).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
    expect(betaCreate.mock.calls[0]![0].model).toBe(JUDGE.model);

    // Vakanın tavanı ileride ama çağrının tavanı geçmişte → hiç çağırmadan timeout.
    await expect(
      als.run(st, () => createJudgeMessage(judgeParams, "ab", { retry: { count: 0 }, deadline: Date.now() - 1 })),
    ).rejects.toMatchObject({ failureClass: "timeout" });
    expect(betaCreate).toHaveBeenCalledTimes(1);
  });

  it("istemci hatası store.apiError'a yazılır ve yeniden fırlatılır (400 yeniden denenmez)", async () => {
    runtime.backend = "api";
    const err = Object.assign(new Error("geçersiz istek"), { status: 400 });
    const { create } = stubClient(async () => {
      throw err;
    });
    const st = store(tmp());
    await expect(als.run(st, () => createMessage(params))).rejects.toBe(err);
    expect(st.apiError).toBe(err);
    expect(create).toHaveBeenCalledTimes(1);
    expect(st.retries.count).toBe(0);
    expect(st.calls).toEqual([]);
  });

  it("istemci yoksa harness_error (apiError'a da yazılır)", async () => {
    runtime.backend = "api";
    const st = store(tmp());
    await expect(als.run(st, () => createMessage(params))).rejects.toMatchObject({ failureClass: "harness_error" });
    expect(st.apiError).toMatchObject({ failureClass: "harness_error" });
  });

  it("v2 varyantında istek uyarlanır; çağıranın params nesnesi değişmez", async () => {
    runtime.backend = "api";
    runtime.variant = VARIANTS.v2!;
    const { create } = stubClient(async () => apiMessage([{ type: "text", text: "a" }]));
    const callerParams = { ...params, top_p: 0.9, top_k: 40 };
    const before = structuredClone(callerParams);
    const st = store(tmp());
    await als.run(st, () => createMessage(callerParams));
    const req = st.calls[0]!.request;
    expect(create.mock.calls[0]![0]).toBe(req);
    expect(req.model).toBe("claude-haiku-5-5");
    expect(req).not.toHaveProperty("temperature");
    expect(req).not.toHaveProperty("top_p");
    expect(req).not.toHaveProperty("top_k");
    expect(req.thinking).toEqual({ type: "adaptive" });
    expect((req.output_config as { effort?: string }).effort).toBe("medium");
    expect(req.max_tokens).toBe(Math.ceil(4096 * 1.6));
    expect(callerParams).toEqual(before);
  });
});

/* ── ÇOCUK PII KAPISI (birincil ağ): üretim isteği ağa/diske çıkmadan ── */

describe("shim PII kapısı", () => {
  const leaky = { ...params, messages: [{ role: "user", content: "Durum: Elanın tablet hikâyesi" }] };

  it("subagent: gerçek ad geçen üretim isteği diske yazılmaz; pii_leak + store.piiLeak kesiti", async () => {
    const dir = tmp();
    const st = { ...store(dir), piiName: "Ela" };
    await expect(als.run(st, () => createMessage(leaky))).rejects.toMatchObject({ failureClass: "pii_leak", message: "gerçek ad istekte" });
    expect(readdirSync(dir)).toEqual([]);
    expect(st.pending).toEqual([]);
    expect(st.piiLeak).toContain("Elanın tablet hikâyesi");
    expect(st.apiError).toMatchObject({ failureClass: "pii_leak" });
  });

  it("api: istemci hiç çağrılmaz; sistem metnindeki büyük harf/aksansız biçim de yakalanır", async () => {
    runtime.backend = "api";
    const { create } = stubClient(async () => apiMessage([{ type: "text", text: "a" }]));
    const st = { ...store(tmp()), piiName: "Gökçe" };
    const sys = { ...params, system: [{ type: "text", text: "Öğrenci notu:\nGOKCE'NIN dikkat süresi kısa." }] };
    await expect(als.run(st, () => createMessage(sys))).rejects.toMatchObject({ failureClass: "pii_leak" });
    expect(create).not.toHaveBeenCalled();
    expect(st.calls).toEqual([]);
    expect(st.piiLeak).toContain("GOKCE'NIN");

    // Metin blokları dizisi olarak gelen kullanıcı içeriği de taranır.
    const blocks = { ...params, messages: [{ role: "user", content: [{ type: "text", text: "gökçe ile çalış" }] }] };
    await expect(als.run({ ...store(tmp()), piiName: "Gökçe" }, () => createMessage(blocks))).rejects.toMatchObject({ failureClass: "pii_leak" });
    expect(create).not.toHaveBeenCalled();
  });

  it("piiName yoksa ya da ad yalnız kelime ortasında geçiyorsa kapı açık; hakem isteği kapıdan geçmez", async () => {
    runtime.backend = "api";
    const { create, betaCreate } = stubClient(async () => apiMessage([{ type: "text", text: "a" }]));
    await als.run(store(tmp()), () => createMessage(leaky));
    await als.run({ ...store(tmp()), piiName: "Ela" }, () =>
      createMessage({ ...params, messages: [{ role: "user", content: "Nela ile kelaynak" }] }),
    );
    expect(create).toHaveBeenCalledTimes(2);
    await als.run({ ...store(tmp()), piiName: "Ela" }, () => createJudgeMessage({ ...judgeParams, messages: leaky.messages }, "ab"));
    expect(betaCreate).toHaveBeenCalledTimes(1);
  });

  it("piiKesit: eşleşmenin çevresinden ~40 karakter, aksan katlamalı konum özgün metne eşlenir", () => {
    const text = `${"ğ".repeat(30)} Öğretmen: gokce bugün yorgun ${"ş".repeat(30)}`;
    const k = piiKesit(text, "Gökçe")!;
    expect(k).toContain("gokce bugün");
    expect(k.length).toBeLessThanOrEqual(45);
    expect(piiKesit("Nela ile kelaynak", "Ela")).toBeNull();
    expect(piiKesit("Elastik bant", "Ela")).toBe("Elastik bant"); // bilerek geniş: kelime BAŞI öneki de sayılır
    expect(piiKesit("a\n\nELA'NIN", "Ela")).toBe("a ELA'NIN");
    expect(piiKesit("metin", "  ")).toBeNull();
  });
});

describe("shim genHash", () => {
  it("üretim isteğinin içerik özeti iki arka uçta da store.genHash'e yazılır ve aynıdır; hakem yazmaz", async () => {
    const dir = tmp();
    const sub = store(dir);
    await expect(als.run(sub, () => createMessage(params))).rejects.toMatchObject({ failureClass: "pending" });
    const json = JSON.parse(readFileSync(requestPaths(dir, "ss-01_rep0", "gen").json, "utf8"));
    expect(sub.genHash).toBe(json.hash);

    runtime.backend = "api";
    stubClient(async () => apiMessage([{ type: "text", text: "a" }]));
    const api = store(tmp());
    await als.run(api, () => createMessage(params));
    expect(api.genHash).toBe(sub.genHash);

    const judged = store(tmp());
    await als.run(judged, () => createJudgeMessage(judgeParams, "ab"));
    expect(judged.genHash).toBeUndefined();
  });
});
