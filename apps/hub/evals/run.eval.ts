// apps/hub/evals/run.eval.ts
import { it, vi } from "vitest";

/*
 * Tek koşturucu. Taklitler burada kaydedilir (vi.mock hoisted — bu dosyada kalmalı).
 *
 *   EVAL_TOOL=studio/social-story EVAL_VARIANT=baseline|v1|v2 [EVAL_BACKEND=subagent|api]
 *   [EVAL_REF=baseline] [EVAL_REPS=1] [EVAL_CASES=ss-01,ss-02] [EVAL_CONCURRENCY=4]
 *   [EVAL_TIMEOUT_S=900] [EVAL_BUDGET_USD=10] [JUDGE_ORDERS=1|2] [EVAL_FLOW=/yol]
 *   node_modules/.bin/vitest run --config vitest.eval.config.ts evals/run.eval.ts
 */

vi.mock("@studio/auth", async () => (await import("./lib/mocks/studio")).studioAuthMock);
vi.mock("@/generated/studio/client", () => ({ ToolType: {} }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: () => ({ allowed: true, retryAfter: 0 }),
  rateLimitResponse: () => new Response("rate", { status: 429 }),
}));
vi.mock("@studio/lib/usage", () => ({ logUsage: () => {} }));
vi.mock("@studio/lib/generateWordImage", () => ({ lookupCachedWordImage: async () => null }));
vi.mock("@studio/lib/credits", async () => (await import("./lib/mocks/studio")).studioCreditsMock);
vi.mock("@studio/lib/db", async () => ({ prisma: (await import("./lib/mocks/studio")).studioPrismaMock() }));
vi.mock("@studio/lib/anthropic", async () => {
  const { createMessage } = await import("./lib/shim");
  return { anthropic: { messages: { create: createMessage } }, MODEL: "claude-sonnet-4-6" };
});
vi.mock("@atolye/auth", async () => (await import("./lib/mocks/atolye")).atolyeAuthMock);
vi.mock("@atolye/lib/credits", async () => (await import("./lib/mocks/atolye")).atolyeCreditsMock);
vi.mock("@atolye/lib/cases", async () => (await import("./lib/mocks/atolye")).atolyeCasesMock);
vi.mock("@ludenlab/ai", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@ludenlab/ai")>();
  const { definePromptViaShim } = await import("./lib/mocks/ludenlabAi");
  return { ...orig, definePrompt: definePromptViaShim };
});

it("araç değerlendirmesi", async () => {
  const { runEval } = await import("./lib/runner");
  const env = process.env;
  const backend = env.EVAL_BACKEND === "api" ? "api" : "subagent";
  await runEval({
    tool: env.EVAL_TOOL ?? "",
    variant: env.EVAL_VARIANT ?? "",
    backend,
    refVariant: env.EVAL_REF,
    reps: env.EVAL_REPS ? Number(env.EVAL_REPS) : undefined,
    cases: env.EVAL_CASES?.split(",").map((x) => x.trim()).filter(Boolean),
    concurrency: env.EVAL_CONCURRENCY ? Number(env.EVAL_CONCURRENCY) : undefined,
    timeoutS: env.EVAL_TIMEOUT_S ? Number(env.EVAL_TIMEOUT_S) : undefined,
    budgetUsd: env.EVAL_BUDGET_USD ? Number(env.EVAL_BUDGET_USD) : undefined,
    orders: env.JUDGE_ORDERS === "2" ? 2 : env.JUDGE_ORDERS === "1" ? 1 : undefined,
  });
});
