// apps/hub/evals/lib/judge.selftest.eval.ts
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ORTAK_OLCUTLER, VARIANTS, type CriterionDef } from "./core";
import { als, runtime, type CaseStore } from "./evalContext";
import { requestPaths } from "./exchange";
import { buildJudgeSystem, judgePair, verdictSchema } from "./judge";

const criteria: CriterionDef[] = [...ORTAK_OLCUTLER, { key: "gray_oranlari", question: "Tanımlayıcı cümleler çoğunlukta mı?" }];

function store(dir: string): CaseStore {
  return { caseId: "ss-01", rep: 0, fixture: null, exchangeDir: dir, calls: [], pending: [], apiError: null, saved: null, refunded: false, deadline: Date.now() + 60_000, retries: { count: 0 } };
}

function verdict(overall: string, winner: "A" | "B" | "tie") {
  return JSON.stringify({
    criteria: Object.fromEntries(criteria.map((c) => [c.key, { winner, note: "n" }])),
    critical_errors: { A: [], B: ["eksik alan"] },
    overall,
    reason: "Gerekçe.",
  });
}

function pairOpts(over: { orders?: 1 | 2; candFirst?: boolean } = {}) {
  return {
    toolLabel: "Sosyal hikâye",
    criteria,
    task: "görev",
    cand: "aday",
    ref: "ref",
    orders: over.orders ?? 1,
    candFirst: over.candFirst ?? true,
    retry: { count: 0 },
    deadline: Date.now() + 60_000,
  };
}

const judgePath = (dir: string, tag: "ab" | "ba") => requestPaths(dir, `ss-01_rep0.judge-${tag}`, "judge");

beforeEach(() => {
  runtime.backend = "subagent";
  runtime.variant = VARIANTS.baseline!;
  runtime.client = null;
});

describe("hakem", () => {
  it("sistem prompt'u ölçütleri, şema anahtarları içerir", () => {
    const sys = buildJudgeSystem("Sosyal hikâye", criteria);
    expect(sys).toContain("- gray_oranlari:");
    expect(sys).toContain("<aday_A>");
    const schema = verdictSchema(criteria) as { properties: { criteria: { required: string[] } } };
    expect(schema.properties.criteria.required).toContain("gray_oranlari");
  });

  it("tek sıra, aday A'da: A kazanınca win=1, hatalar doğru tarafa yazılır", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "judge-"));
    const opts = pairOpts({ candFirst: true });
    // Önce istek yazılır (bekler), sonra hakem yanıtı o isteğin yanıt yoluna konur.
    await expect(als.run(store(dir), () => judgePair(opts))).rejects.toMatchObject({ failureClass: "pending" });
    writeFileSync(judgePath(dir, "ab").response, verdict("A", "A"));
    const r = await als.run(store(dir), () => judgePair(opts));
    expect(r.win).toBe(1);
    expect(r.criteria.ozgulluk).toBe(1);
    expect(r.candErrors).toEqual([]);
    expect(r.refErrors).toEqual(["eksik alan"]);
    expect(r.orders).toBe(1);
    expect(r.perOrder).toEqual([{ candSide: "A", overall: "A" }]);
  });

  it("tek sıra, aday B'de: B kazanınca win=1, B'nin hataları adaya yazılır", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "judge-"));
    const opts = pairOpts({ candFirst: false });
    await expect(als.run(store(dir), () => judgePair(opts))).rejects.toMatchObject({ failureClass: "pending" });
    writeFileSync(judgePath(dir, "ba").response, verdict("B", "B"));
    const r = await als.run(store(dir), () => judgePair(opts));
    expect(r.win).toBe(1);
    expect(r.criteria.ozgulluk).toBe(1);
    expect(r.candErrors).toEqual(["eksik alan"]);
    expect(r.refErrors).toEqual([]);
    expect(r.perOrder).toEqual([{ candSide: "B", overall: "B" }]);
  });

  it("yanıt yoksa PendingError yayar ve istek dosyası (md + şemalı json) oluşur", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "judge-"));
    const st = store(dir);
    await expect(als.run(st, () => judgePair(pairOpts()))).rejects.toMatchObject({ failureClass: "pending" });
    expect(st.pending).toEqual(["ss-01_rep0.judge-ab.judge"]);
    const p = judgePath(dir, "ab");
    expect(existsSync(p.md)).toBe(true);
    expect(readFileSync(p.md, "utf8")).toContain("<istek>\ngörev\n</istek>");
    const json = JSON.parse(readFileSync(p.json, "utf8"));
    expect(json.schema).toEqual(verdictSchema(criteria));
  });

  it("iki sıra: ikisi de bekler; aynı karar (A) iki sırada ortalanır", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "judge-"));
    const opts = pairOpts({ orders: 2 });
    const st = store(dir);
    await expect(als.run(st, () => judgePair(opts))).rejects.toMatchObject({ failureClass: "pending" });
    expect([...st.pending].sort()).toEqual(["ss-01_rep0.judge-ab.judge", "ss-01_rep0.judge-ba.judge"]);
    writeFileSync(judgePath(dir, "ab").response, verdict("A", "A"));
    writeFileSync(judgePath(dir, "ba").response, verdict("A", "A"));
    const r = await als.run(store(dir), () => judgePair(opts));
    expect(r.orders).toBe(2);
    expect(r.win).toBe(0.5); // ab: aday kazandı (1), ba: referans kazandı (0)
    expect(r.criteria.ozgulluk).toBe(0.5);
    expect(r.candErrors).toEqual(["eksik alan"]); // ba'da aday B
    expect(r.refErrors).toEqual(["eksik alan"]); // ab'de referans B
    expect(r.transcript).toHaveLength(4);
    expect(r.perOrder).toEqual([
      { candSide: "A", overall: "A" },
      { candSide: "B", overall: "A" },
    ]);
  });

  it("both_bad: win=0.5, both_bad=1", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "judge-"));
    const opts = pairOpts();
    await expect(als.run(store(dir), () => judgePair(opts))).rejects.toMatchObject({ failureClass: "pending" });
    writeFileSync(judgePath(dir, "ab").response, verdict("both_bad", "tie"));
    const r = await als.run(store(dir), () => judgePair(opts));
    expect(r.win).toBe(0.5);
    expect(r.both_bad).toBe(1);
    expect(r.criteria.ozgulluk).toBe(0.5);
  });

  it("şemaya uymayan karar judge_parse verir, yanıt .response.rejected.txt olur ve istek yeniden sorulur", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "judge-"));
    const opts = pairOpts();
    await expect(als.run(store(dir), () => judgePair(opts))).rejects.toMatchObject({ failureClass: "pending" });
    const p = judgePath(dir, "ab");
    const bad = verdict("berabere", "A");
    writeFileSync(p.response, bad);
    const failing = store(dir);
    await expect(als.run(failing, () => judgePair(opts))).rejects.toMatchObject({
      failureClass: "judge_parse",
      message: expect.stringContaining("şemaya uymuyor"),
    });
    expect(existsSync(p.response)).toBe(false);
    expect(readFileSync(p.response.replace(/\.response\.txt$/, ".response.rejected.txt"), "utf8")).toBe(bad);
    // Kenara alınan yanıtın isteği AYNI koşuda yeniden listelenir (ek koşu gerekmez).
    expect(failing.pending).toEqual(["ss-01_rep0.judge-ab.judge"]);
    // Sonraki koşu aynı isteği yeniden sorar.
    const st = store(dir);
    await expect(als.run(st, () => judgePair(opts))).rejects.toMatchObject({ failureClass: "pending" });
    expect(st.pending).toEqual(["ss-01_rep0.judge-ab.judge"]);
  });

  it("diğer şema ihlalleri ve çözülemeyen JSON da judge_parse + kenara alma", async () => {
    const ok = JSON.parse(verdict("A", "A")) as Record<string, unknown>;
    const criteriaMissing = { ...(ok.criteria as Record<string, unknown>) };
    delete criteriaMissing.gray_oranlari;
    const cases = [
      JSON.stringify({ ...ok, criteria: criteriaMissing }),
      JSON.stringify({ ...ok, criteria: { ...(ok.criteria as object), ozgulluk: { winner: "C", note: "n" } } }),
      JSON.stringify({ ...ok, critical_errors: { A: "yok", B: [] } }),
      JSON.stringify({ ...ok, reason: undefined }),
      "karar: A",
    ];
    for (const text of cases) {
      const dir = mkdtempSync(path.join(tmpdir(), "judge-"));
      const opts = pairOpts();
      await expect(als.run(store(dir), () => judgePair(opts))).rejects.toMatchObject({ failureClass: "pending" });
      const p = judgePath(dir, "ab");
      writeFileSync(p.response, text);
      const failing = store(dir);
      await expect(als.run(failing, () => judgePair(opts))).rejects.toMatchObject({ failureClass: "judge_parse" });
      expect(failing.pending).toEqual(["ss-01_rep0.judge-ab.judge"]);
      expect(existsSync(p.response)).toBe(false);
      expect(existsSync(p.response.replace(/\.response\.txt$/, ".response.rejected.txt"))).toBe(true);
    }
  });
});
