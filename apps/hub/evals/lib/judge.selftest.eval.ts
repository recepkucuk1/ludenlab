// apps/hub/evals/lib/judge.selftest.eval.ts
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ORTAK_OLCUTLER, type CriterionDef } from "./core";
import { als, runtime, type CaseStore } from "./evalContext";
import { requestPaths } from "./exchange";
import { buildJudgeSystem, judgePair, verdictSchema } from "./judge";

const criteria: CriterionDef[] = [...ORTAK_OLCUTLER, { key: "gray_oranlari", question: "Tanımlayıcı cümleler çoğunlukta mı?" }];

function store(dir: string): CaseStore {
  return { caseId: "ss-01", rep: 0, fixture: null, exchangeDir: dir, calls: [], pending: [], apiError: null, saved: null, refunded: false, deadline: Date.now() + 60_000, retries: { count: 0 } };
}

function verdict(overall: "A" | "B" | "tie", winner: "A" | "B" | "tie") {
  return JSON.stringify({
    criteria: Object.fromEntries(criteria.map((c) => [c.key, { winner, note: "n" }])),
    critical_errors: { A: [], B: ["eksik alan"] },
    overall,
    reason: "Gerekçe.",
  });
}

describe("hakem", () => {
  it("sistem prompt'u ölçütleri, şema anahtarları içerir", () => {
    const sys = buildJudgeSystem("Sosyal hikâye", criteria);
    expect(sys).toContain("- gray_oranlari:");
    expect(sys).toContain("<aday_A>");
    const schema = verdictSchema(criteria) as { properties: { criteria: { required: string[] } } };
    expect(schema.properties.criteria.required).toContain("gray_oranlari");
  });

  it("tek sıra, aday A'da: A kazanınca win=1, hatalar doğru tarafa yazılır", async () => {
    runtime.backend = "subagent";
    const dir = mkdtempSync(path.join(tmpdir(), "judge-"));
    const opts = { toolLabel: "Sosyal hikâye", criteria, task: "görev", cand: "aday", ref: "ref", orders: 1 as const, candFirst: true, retry: { count: 0 }, deadline: Date.now() + 60_000 };
    // Önce istek yazılır (bekler), sonra hakem yanıtı o isteğin yanıt yoluna konur.
    await expect(als.run(store(dir), () => judgePair(opts))).rejects.toMatchObject({ failureClass: "pending" });
    writeFileSync(requestPaths(dir, "ss-01_rep0.judge-ab", "judge").response, verdict("A", "A"));
    const r = await als.run(store(dir), () => judgePair(opts));
    expect(r.win).toBe(1);
    expect(r.criteria.ozgulluk).toBe(1);
    expect(r.candErrors).toEqual([]);
    expect(r.refErrors).toEqual(["eksik alan"]);
    expect(r.orders).toBe(1);
  });

  it("tek sıra, aday B'de: B kazanınca win=1", async () => {
    runtime.backend = "subagent";
    const dir = mkdtempSync(path.join(tmpdir(), "judge-"));
    const opts = { toolLabel: "x", criteria, task: "görev", cand: "aday", ref: "ref", orders: 1 as const, candFirst: false, retry: { count: 0 }, deadline: Date.now() + 60_000 };
    await expect(als.run(store(dir), () => judgePair(opts))).rejects.toMatchObject({ failureClass: "pending" });
    writeFileSync(requestPaths(dir, "ss-01_rep0.judge-ba", "judge").response, verdict("B", "B"));
    const r = await als.run(store(dir), () => judgePair(opts));
    expect(r.win).toBe(1);
  });

  it("yanıt yoksa PendingError yayar ve istek dosyası oluşur", async () => {
    runtime.backend = "subagent";
    const dir = mkdtempSync(path.join(tmpdir(), "judge-"));
    const st = store(dir);
    await expect(
      als.run(st, () => judgePair({ toolLabel: "x", criteria, task: "görev", cand: "aday", ref: "ref", orders: 1, candFirst: true, retry: { count: 0 }, deadline: Date.now() + 60_000 })),
    ).rejects.toMatchObject({ failureClass: "pending" });
    expect(st.pending).toEqual(["ss-01_rep0.judge-ab.judge"]);
  });
});
