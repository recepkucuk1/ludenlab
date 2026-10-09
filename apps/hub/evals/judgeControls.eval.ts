// apps/hub/evals/judgeControls.eval.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { FLOW_DIR, HarnessError, JUDGE, VARIANTS, costUsd, isPending, loadApiKey, type CaseDef, type UsageLike } from "./lib/core";
import { als, runtime, type CaseStore } from "./lib/evalContext";
import { pendingRow, type PendingRow } from "./lib/exchange";
import { resolveFixture } from "./lib/fixtures";
import { judgePair, type PairResult } from "./lib/judge";
import { loadAdapter } from "./tools/registry";

/*
 *   EVAL_TOOL=studio/social-story [EVAL_CASES=ss-01] [EVAL_TAG=r2] [EVAL_REF=baseline|baseline@r2]
 *   [EVAL_BACKEND=subagent|api] [EVAL_FLOW=…]
 *   node_modules/.bin/vitest run --config vitest.eval.config.ts evals/judgeControls.eval.ts
 *
 * Referans: <flow>/<tool>/<EVAL_REF ?? baseline>/ref/<vaka> (koşturucunun dondurduğu). EVAL_REF koşturucudaki
 *   gibi etiket taşıyabilir (`baseline@r2`); verilmezse etiketsiz `baseline`'dır. EVAL_CASES TEK vaka alır
 *   (verilmezse cases.json'daki ilk vaka).
 * Çıktı: <flow>/<tool>/controls[@<EVAL_TAG>]/{judge_controls.json, pending.json, exchange/} — EVAL_TAG yeni
 *   turu temiz dizinde tutar; referansı seçmez (onu EVAL_REF seçer). Yeni turun tabanına karşı:
 *   `EVAL_TAG=r2 EVAL_REF=baseline@r2`.
 *
 * Referans çıktıyı iki bilinen adayla, iki sırada karşılaştırır:
 *   - jenerik aday kaybetmeli (win ≤ 0,25);
 *   - özdeş aday berabere kalmalı: iki sırada da "tie" (win = 0,5 tek başına yetmez — hep A diyen
 *     hakem de 0,5 verir).
 * Route çalıştırmaz; yalnız shim + hakem. subagent modunda iki geçiş: ilkinde istekler yazılır,
 * yanıtlar gelince ikincisinde karar okunur.
 *
 * pending.json her koşunun başında boşaltılır: referans yoksa ya da erken bir hata olursa bayat liste kalmaz.
 * Bir adayın hatası (ör. judge_parse) ötekini durdurmaz: hata `errors`'a yazılır, o adayın bekleyen istekleri
 * yine listelenir, koşu sonunda hata fırlatılır. `complete` = bekleyen yok ve hata yok.
 */

const TAG_RE = /^[A-Za-z0-9._-]+$/;

interface ControlResult {
  name: string;
  win: number;
  ok: boolean;
  per_order: PairResult["perOrder"];
  fallback: boolean;
  judge_model: string;
  judge_usage: UsageLike;
  /** Yalnız api arka ucunda; alt-ajanda null (usage tahminidir). */
  cost_usd: number | null;
  reasons: string[];
  cand_errors: string[];
}

interface ControlError {
  name: string;
  failure_class: string;
  error: string;
}

/** `özdeş win=0.5 [aday=A→A, aday=B→A]` — sıra başına ham karar, konum yanlılığı mesajdan okunsun. */
const summarize = (r: ControlResult) => `${r.name} win=${r.win} [${r.per_order.map((o) => `aday=${o.candSide}→${o.overall}`).join(", ")}]`;
const describeError = (e: ControlError) => `${e.name} HATA (${e.failure_class}): ${e.error}`;

it("hakem bilinen adaylarda doğru karar veriyor", async () => {
  const env = process.env;
  const toolId = env.EVAL_TOOL ?? "";
  const adapter = await loadAdapter(toolId);
  const tag = env.EVAL_TAG || undefined;
  if (tag !== undefined && !TAG_RE.test(tag)) {
    throw new HarnessError(`EVAL_TAG yalnız harf, rakam, '.', '_', '-' içerebilir, gelen: '${tag}'`, "config");
  }

  const cdir = path.join(FLOW_DIR, toolId, tag ? `controls@${tag}` : "controls");
  const exchangeDir = path.join(cdir, "exchange");
  const pendingPath = path.join(cdir, "pending.json");
  mkdirSync(exchangeDir, { recursive: true });
  // Önce boşalt: aşağıdaki herhangi bir erken hata önceki koşunun listesini bayat bırakmasın.
  writeFileSync(pendingPath, "[]");

  const refArm = env.EVAL_REF ?? "baseline";
  const [refBase, refTag, ...rest] = refArm.split("@");
  if (!refBase || !VARIANTS[refBase] || rest.length || (refTag !== undefined && !TAG_RE.test(refTag))) {
    throw new HarnessError(`EVAL_REF <varyant>[@<etiket>] olmalı (varyant: ${Object.keys(VARIANTS).join(" | ")}), gelen: '${refArm}'`, "config");
  }
  const caseIds = env.EVAL_CASES?.split(",").map((x) => x.trim()).filter(Boolean) ?? [];
  if (caseIds.length > 1) throw new HarnessError("judgeControls tek vaka alır", "config");
  const cases = JSON.parse(readFileSync(path.join(adapter.dir, "cases.json"), "utf8")) as CaseDef[];
  const c = caseIds.length ? cases.find((x) => x.id === caseIds[0]) : cases[0];
  if (!c) throw new Error(`Vaka bulunamadı: ${caseIds[0]}`);

  const backend = env.EVAL_BACKEND === "api" ? "api" : "subagent";
  runtime.backend = backend;
  if (backend === "api") {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    runtime.client = new Anthropic({ apiKey: loadApiKey(), maxRetries: 0 });
  }

  const refPath = path.join(FLOW_DIR, toolId, refArm, "ref", c.id);
  if (!existsSync(refPath)) throw new Error(`Önce ${refArm} koşmalı; referans yok: ${refPath}`);
  const ref = JSON.parse(readFileSync(refPath, "utf8")) as { ok: boolean; output: unknown };
  if (!ref.ok) throw new Error("Referans çıktı kullanılamaz durumda; EVAL_CASES ile başka vaka seç");

  const task = adapter.renderTask(c, resolveFixture(adapter.module, c.student));
  const refText = adapter.renderForJudge(ref.output);
  const generic = adapter.genericCandidate(ref.output);
  // Hakemin gördüğü metin aynıysa jenerik kontrol hiçbir şey ölçmez (doğru hakem berabere der, kontrol kalır).
  if (adapter.renderForJudge(generic) === refText) throw new HarnessError("jenerik aday referansla aynı", "config");

  const candidates: Array<{ name: string; slug: string; cand: unknown; pass: (r: PairResult) => boolean }> = [
    { name: "jenerik", slug: "generic", cand: generic, pass: (r) => r.win <= 0.25 },
    {
      name: "özdeş",
      slug: "identical",
      cand: ref.output,
      // İki sırada da "tie": win === 0,5 tek başına yetmez — hep "A" diyen (konum yanlılığı) hakem de 1 + 0 → 0,5 verir.
      pass: (r) => r.perOrder.every((o) => o.overall === "tie"),
    },
  ];
  const results: ControlResult[] = [];
  const errors: ControlError[] = [];
  const pending: PendingRow[] = [];

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
        fallback: r.fallback,
        judge_model: r.judge_model,
        judge_usage: r.judge_usage,
        cost_usd: backend === "api" ? costUsd(r.judge_model, r.judge_usage) : null,
        reasons: r.reasons,
        cand_errors: r.candErrors,
      });
    } catch (e) {
      // Bekleyen istekler hata ne olursa olsun listelenir (ör. bir sıra judge_parse verdi, öteki bekliyor).
      pending.push(...store.pending.map((entry) => pendingRow(exchangeDir, entry, JUDGE)));
      if (isPending(e)) continue;
      const err = e as { failureClass?: string; message?: string } | null;
      errors.push({ name: k.name, failure_class: err?.failureClass ?? "error", error: String(err?.message ?? e) });
    }
  }

  const complete = pending.length === 0 && errors.length === 0;
  writeFileSync(path.join(cdir, "judge_controls.json"), JSON.stringify({ case: c.id, results, errors, pending: pending.length, complete }, null, 2));
  writeFileSync(pendingPath, JSON.stringify(pending, null, 2));

  const log = (msg: string) => process.stderr.write(`[hakem kontrol] ${msg}\n`);
  for (const r of results) log(`${summarize(r)} (${r.ok ? "GEÇTİ" : "KALDI"})`);
  for (const e of errors) log(describeError(e));
  if (pending.length) log(`${pending.length} istek bekliyor → ${pendingPath}`);

  const failed = results.filter((r) => !r.ok);
  if (errors.length || failed.length) {
    throw new Error(`hakem kontrolü kaldı: ${[...failed.map((r) => `${summarize(r)} (KALDI)`), ...errors.map(describeError)].join("; ")}`);
  }
});
