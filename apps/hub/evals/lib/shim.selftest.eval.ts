// apps/hub/evals/lib/shim.selftest.eval.ts
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { VARIANTS } from "./core";
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

describe("shim (subagent arka ucu)", () => {
  it("yanıt yoksa isteği yazar, pending'e ekler ve PendingError fırlatır", async () => {
    runtime.backend = "subagent";
    runtime.variant = VARIANTS.v2!;
    const dir = mkdtempSync(path.join(tmpdir(), "shim-"));
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
    expect(json.max_tokens).toBe(Math.ceil(4096 * 1.3)); // tokenScale uygulandı
    expect(json.hash).toMatch(/^[0-9a-f]{12}$/);
    const md = readFileSync(p.md, "utf8");
    expect(md).toContain("<system>\nSistem metni\n</system>");
    expect(md).not.toContain("ss-01_rep0"); // körleştirme: anahtar yalnız json'da
  });

  it("yanıt varsa Message döner ve çağrıyı kaydeder", async () => {
    runtime.backend = "subagent";
    runtime.variant = VARIANTS.baseline!;
    const dir = mkdtempSync(path.join(tmpdir(), "shim-"));
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
    const dir = mkdtempSync(path.join(tmpdir(), "shim-"));
    const st = store(dir);
    const judgeParams = { ...params, model: "claude-opus-5", output_config: { format: { type: "json_schema", schema: { type: "object" } } } };
    await expect(als.run(st, () => createJudgeMessage(judgeParams, "ba"))).rejects.toMatchObject({ failureClass: "pending" });
    const p = requestPaths(dir, "ss-01_rep0.judge-ba", "judge");
    expect(existsSync(p.json)).toBe(true);
    expect(JSON.parse(readFileSync(p.json, "utf8")).schema).toEqual({ type: "object" });
    expect(readFileSync(p.md, "utf8")).toContain("<output_schema>");
  });
});
