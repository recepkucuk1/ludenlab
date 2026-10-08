// apps/hub/evals/judgeControls.eval.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { FLOW_DIR, JUDGE, isPending, loadApiKey, type CaseDef } from "./lib/core";
import { als, runtime, type CaseStore } from "./lib/evalContext";
import { requestPaths } from "./lib/exchange";
import { resolveFixture } from "./lib/fixtures";
import { judgePair, type PairResult } from "./lib/judge";
import { loadAdapter } from "./tools/registry";

/*
 *   EVAL_TOOL=studio/social-story [EVAL_CASES=ss-01] [EVAL_BACKEND=subagent|api] [EVAL_FLOW=…]
 *   node_modules/.bin/vitest run --config vitest.eval.config.ts evals/judgeControls.eval.ts
 * Çıktı: <flow>/<tool>/controls/{judge_controls.json, pending.json, exchange/}
 *
 * Referans çıktıyı (baseline/ref/<vaka>, koşturucunun dondurduğu) iki bilinen adayla karşılaştırır:
 *   - jenerik aday kaybetmeli (win ≤ 0,25);
 *   - özdeş aday berabere kalmalı: iki sırada da "tie" (win = 0,5 tek başına yetmez — hep A diyen
 *     hakem de 0,5 verir).
 * Route çalıştırmaz; yalnız shim + hakem. subagent modunda iki geçiş: ilkinde istekler yazılır,
 * yanıtlar gelince ikincisinde karar okunur.
 */

it("hakem bilinen adaylarda doğru karar veriyor", async () => {
  const toolId = process.env.EVAL_TOOL ?? "";
  const adapter = await loadAdapter(toolId);
  const backend = process.env.EVAL_BACKEND === "api" ? "api" : "subagent";
  runtime.backend = backend;
  if (backend === "api") {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    runtime.client = new Anthropic({ apiKey: loadApiKey(), maxRetries: 0 });
  }

  const cases = JSON.parse(readFileSync(path.join(adapter.dir, "cases.json"), "utf8")) as CaseDef[];
  const only = process.env.EVAL_CASES?.split(",")[0]?.trim();
  const c = only ? cases.find((x) => x.id === only) : cases[0];
  if (!c) throw new Error(`Vaka bulunamadı: ${only}`);
  const refPath = path.join(FLOW_DIR, toolId, "baseline", "ref", c.id);
  if (!existsSync(refPath)) throw new Error(`Önce baseline koşmalı; referans yok: ${refPath}`);
  const ref = JSON.parse(readFileSync(refPath, "utf8")) as { ok: boolean; output: unknown };
  if (!ref.ok) throw new Error("Referans çıktı kullanılamaz durumda; EVAL_CASES ile başka vaka seç");

  const cdir = path.join(FLOW_DIR, toolId, "controls");
  const exchangeDir = path.join(cdir, "exchange");
  mkdirSync(exchangeDir, { recursive: true });
  const task = adapter.renderTask(c, resolveFixture(adapter.module, c.student));
  const refText = adapter.renderForJudge(ref.output);

  const candidates: Array<{ name: string; slug: string; cand: unknown; pass: (r: PairResult) => boolean }> = [
    { name: "jenerik", slug: "generic", cand: adapter.genericCandidate(ref.output), pass: (r) => r.win <= 0.25 },
    {
      name: "özdeş",
      slug: "identical",
      cand: ref.output,
      // Yalnız win === 0,5 yetmez: hep "A" diyen (konum yanlılığı) hakem de iki sırada 1 + 0 → 0,5 verir.
      pass: (r) => r.win === 0.5 && r.perOrder.every((o) => o.overall === "tie"),
    },
  ];
  const results: Array<Record<string, unknown>> = [];
  const pending: Array<Record<string, string>> = [];

  for (const k of candidates) {
    const store: CaseStore = {
      caseId: `${c.id}-${k.slug}`,
      rep: 0,
      fixture: null,
      exchangeDir,
      calls: [],
      pending: [],
      apiError: null,
      saved: null,
      refunded: false,
      deadline: Date.now() + 600_000,
      retries: { count: 0 },
    };
    try {
      const r = await als.run(store, () =>
        judgePair({
          toolLabel: adapter.label,
          criteria: adapter.criteria,
          task,
          cand: adapter.renderForJudge(k.cand),
          ref: refText,
          orders: 2,
          candFirst: true,
          retry: { count: 0 },
          deadline: store.deadline,
        }),
      );
      results.push({
        name: k.name,
        win: r.win,
        ok: k.pass(r),
        per_order: r.perOrder,
        reasons: r.reasons,
        cand_errors: r.candErrors,
        judge_model: r.judge_model,
      });
    } catch (e) {
      if (isPending(e)) {
        for (const entry of store.pending) {
          const i = entry.lastIndexOf(".");
          const key = entry.slice(0, i);
          const p = requestPaths(exchangeDir, key, "judge");
          pending.push({ key, role: "judge", agentModel: JUDGE.agentModel, model: JUDGE.model, requestMd: p.md, responseTxt: p.response });
        }
        continue;
      }
      throw e;
    }
  }

  writeFileSync(path.join(cdir, "judge_controls.json"), JSON.stringify({ case: c.id, results }, null, 2));
  writeFileSync(path.join(cdir, "pending.json"), JSON.stringify(pending, null, 2));
  for (const r of results) process.stderr.write(`[hakem kontrol] ${r.name}: win=${r.win} (${r.ok ? "GEÇTİ" : "KALDI"})\n`);
  if (pending.length) {
    process.stderr.write(`[hakem kontrol] ${pending.length} istek bekliyor → ${path.join(cdir, "pending.json")}\n`);
    return;
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length) throw new Error(`hakem kontrolü kaldı: ${failed.map((r) => `${r.name} win=${r.win}`).join(", ")}`);
});
