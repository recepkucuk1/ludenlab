// apps/hub/evals/lib/shim.selftest.eval.ts
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JUDGE, VARIANTS } from "./core";
import { als, runtime, type CaseStore } from "./evalContext";
import { requestPaths } from "./exchange";
import { createJudgeMessage, createMessage } from "./shim";

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
    expect(res.model).toBe("claude-sonnet-4-6");
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
    }
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
