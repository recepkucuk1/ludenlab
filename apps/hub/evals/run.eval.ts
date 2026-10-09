// apps/hub/evals/run.eval.ts
import "./mocks.setup";
import { it } from "vitest";

/*
 * Tek koşturucu. Taklitler `mocks.setup.ts`'te (vi.mock hoisted; ilk import olmalı) ve tohumlu Math.random orada kurulur.
 *
 *   EVAL_TOOL=studio/social-story EVAL_VARIANT=baseline|v1|v2 [EVAL_BACKEND=subagent|api]
 *   [EVAL_TAG=r2] [EVAL_REF=baseline|baseline@r2] [EVAL_REPS=1] [EVAL_CASES=ss-01,ss-02] [EVAL_CONCURRENCY=4]
 *   [EVAL_TIMEOUT_S=900] [EVAL_BUDGET_USD=10] [JUDGE_ORDERS=1|2] [EVAL_FLOW=/yol]
 * Geçersiz değer (bilinmeyen arka uç / sıra sayısı, sayı olmayan sayısal değişken) koşuyu başlatmadan durdurur.
 *   node_modules/.bin/vitest run --config vitest.eval.config.ts evals/run.eval.ts
 */

it("araç değerlendirmesi", async () => {
  const { runEval } = await import("./lib/runner");
  const env = process.env;
  const backend = env.EVAL_BACKEND ?? "subagent";
  if (backend !== "api" && backend !== "subagent") throw new Error(`EVAL_BACKEND api | subagent olmalı, gelen: '${backend}'`);
  const orders = env.JUDGE_ORDERS;
  if (orders !== undefined && orders !== "1" && orders !== "2") throw new Error(`JUDGE_ORDERS 1 | 2 olmalı, gelen: '${orders}'`);
  await runEval({
    tool: env.EVAL_TOOL ?? "",
    variant: env.EVAL_VARIANT ?? "",
    backend,
    tag: env.EVAL_TAG || undefined,
    refVariant: env.EVAL_REF,
    reps: env.EVAL_REPS ? Number(env.EVAL_REPS) : undefined,
    cases: env.EVAL_CASES?.split(",").map((x) => x.trim()).filter(Boolean),
    concurrency: env.EVAL_CONCURRENCY ? Number(env.EVAL_CONCURRENCY) : undefined,
    timeoutS: env.EVAL_TIMEOUT_S ? Number(env.EVAL_TIMEOUT_S) : undefined,
    budgetUsd: env.EVAL_BUDGET_USD ? Number(env.EVAL_BUDGET_USD) : undefined,
    orders: orders === "2" ? 2 : orders === "1" ? 1 : undefined,
  });
});
