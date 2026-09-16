import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { it, vi } from "vitest";
import { articulation } from "@ludenlab/ai";
import casesJson from "./cases.json";
import { runChecks } from "./checks";
import { als, runtime, type CaseStore, type FixtureStudent } from "./evalContext";
import { judgePair, renderDrill, renderTask, type CaseDef, type PairResult } from "./judge";
import {
  EvalError,
  FLOW_DIR,
  LEVEL_TR,
  POSITION_TR,
  VARIANTS,
  WORK_AREA_TR,
  appendJsonl,
  costUsd,
  isolateTornLine,
  loadApiKey,
  readJsonl,
  servedModelMatches,
  withTimeout,
} from "./lib";

/*
 * Artikülasyon aracı — model karşılaştırma çalıştırıcısı.
 *
 * CANLIDAKİ route (`src/app/studio/api/tools/articulation/route.ts`) ve ortak araç işleyicisi
 * (`toolHandler.ts`) DEĞİŞTİRİLMEDEN çalışır: şema doğrulama, rumuzlama, prompt kurulumu, JSON
 * çıkarma, adı geri koyma, banka kelimelerini işleme dahil. Yalnız dış yan etkiler taklit edilir:
 * oturum, veritabanı, hak düşümü, kullanım kaydı, görsel önbelleği, hız sınırı — ve model kimliği.
 *
 *   EVAL_VARIANT=baseline|v1|v2  EVAL_REPS=2  [EVAL_CASES=art-03,art-10]  [EVAL_CONCURRENCY=4]
 *   [EVAL_BUDGET_USD=10]  (süreç başı harcama tavanı; dolunca yeni görev başlamaz)
 *   [EVAL_DRY=good|bad|broken EVAL_FLOW=/tmp/x]   (kuru çalıştırma: API çağrılmaz)
 *   node_modules/.bin/vitest run --config vitest.eval.config.ts evals/articulation/run.eval.ts
 *
 * Çıktı: <flow>/<variant>/results.jsonl · errors.jsonl · traces/ · out/ ; baseline/ref/<id> dondurulmuş referans.
 */

vi.mock("@studio/auth", () => ({ auth: async () => ({ user: { id: "eval-uzman" } }) }));
vi.mock("@/generated/studio/client", () => ({ ToolType: {} }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: () => ({ allowed: true, retryAfter: 0 }),
  rateLimitResponse: () => new Response("rate", { status: 429 }),
}));
vi.mock("@studio/lib/usage", () => ({ logUsage: () => {} }));
vi.mock("@studio/lib/generateWordImage", () => ({ lookupCachedWordImage: async () => null }));
vi.mock("@studio/lib/credits", async () => {
  const { als: ctx } = await import("./evalContext");
  return {
    reserveCredits: async () => true,
    refundCredits: async () => {
      const st = ctx.getStore();
      if (st) st.refunded = true;
    },
  };
});
vi.mock("@studio/lib/db", async () => {
  const { als: ctx } = await import("./evalContext");
  return {
    prisma: {
      student: {
        findFirst: async () => {
          const s = ctx.getStore()?.student;
          return s ? { ...s, llmAlias: null } : null;
        },
        findMany: async () => [],
        update: async () => ({}),
      },
      $transaction: async (cb: (tx: unknown) => unknown) =>
        cb({
          card: {
            create: async ({ data }: { data: unknown }) => {
              const st = ctx.getStore();
              if (st) st.savedCard = data;
              return { id: "eval-card" };
            },
          },
        }),
    },
  };
});
vi.mock("@studio/lib/anthropic", async () => {
  const { anthropicShim } = await import("./anthropicShim");
  return { anthropic: anthropicShim, MODEL: "claude-sonnet-4-6" };
});
vi.mock("@ludenlab/ai", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@ludenlab/ai")>();
  const { seeded } = await import("./seededBank");
  return { ...orig, articulation: { ...orig.articulation, selectWordsMulti: seeded(orig.articulation.selectWordsMulti) } };
});

type Drill = Record<string, unknown>;

function fixture(c: CaseDef): FixtureStudent | null {
  if (!c.student) return null;
  return {
    id: `stu-${c.id}`,
    name: c.student.name,
    birthDate: new Date(Date.UTC(new Date().getFullYear() - c.student.age, 5, 15)),
    workArea: c.student.workArea,
    diagnosis: c.student.diagnosis,
  };
}

/** Route'taki pickBankWords ile aynı kural; seçim tohumlu (taklit edilmiş modülden). */
function bankWordsFor(c: CaseDef): string[] | null {
  const b = c.body;
  if (!["word", "sentence", "contextual"].includes(b.level)) return null;
  if (!b.targetSounds.every((snd) => articulation.WORD_BANK[articulation.soundToLetter(snd)])) return null;
  const picked = articulation.selectWordsMulti(
    articulation.WORD_BANK,
    b.targetSounds,
    b.positions as articulation.Position[],
    b.itemCount,
  );
  return picked.length ? picked.map((w) => w.word) : null;
}

function renderPrompt(c: CaseDef): string {
  const b = c.body;
  return [
    `${LEVEL_TR[b.level]} · ${b.targetSounds.join(" + ")} · ${b.positions.map((p) => POSITION_TR[p]).join(", ")} · ${b.itemCount} öğe`,
    c.student
      ? `Öğrenci: ${c.student.name}, ${c.student.age} yaş, ${WORK_AREA_TR[c.student.workArea]} — ${c.student.diagnosis}`
      : "Öğrenci yok (genel materyal)",
    `Neyi sınıyor: ${c.purpose}`,
  ].join("\n");
}

function parseResult(text: string, httpStatus: number): { status: number; body: Record<string, unknown> | null } {
  if (!text.startsWith("data:")) {
    try {
      return { status: httpStatus, body: JSON.parse(text) };
    } catch {
      return { status: httpStatus, body: null };
    }
  }
  for (const chunk of text.split("\n\n")) {
    const line = chunk.trim();
    if (!line.startsWith("data:")) continue;
    const evt = JSON.parse(line.slice(5).trim()) as { type: string; status?: number; body?: Record<string, unknown> };
    if (evt.type === "result") return { status: evt.status ?? 599, body: evt.body ?? null };
  }
  return { status: 599, body: null };
}

it("artikülasyon değerlendirmesi", async () => {
  const env = process.env;
  const variant = env.EVAL_VARIANT ?? "";
  const V = VARIANTS[variant];
  if (!V) throw new Error(`EVAL_VARIANT baseline | v1 | v2 olmalı, gelen: '${variant}'`);
  const reps = Number(env.EVAL_REPS ?? 2);
  const concurrency = Number(env.EVAL_CONCURRENCY ?? 4);
  const timeoutS = Number(env.EVAL_TIMEOUT_S ?? 900);
  const dry = env.EVAL_DRY === "good" || env.EVAL_DRY === "bad" || env.EVAL_DRY === "broken" ? env.EVAL_DRY : false;
  if (dry && !env.EVAL_FLOW) throw new Error("EVAL_DRY yalnız ayrı bir EVAL_FLOW ile çalışır (gerçek sonuçlar kirlenmesin).");
  const budgetUsd = Number(env.EVAL_BUDGET_USD ?? Infinity);
  const only = env.EVAL_CASES?.split(",").map((x) => x.trim()).filter(Boolean);
  const cases = (casesJson as CaseDef[]).filter((c) => !only || only.includes(c.id));
  if (only && cases.length !== only.length) throw new Error(`Bilinmeyen vaka kimliği: ${only.join(",")}`);

  runtime.model = V.model;
  runtime.dry = dry;
  runtime.client = dry ? null : new Anthropic({ apiKey: loadApiKey(), maxRetries: 0 });

  const vdir = path.join(FLOW_DIR, variant);
  const refDir = path.join(FLOW_DIR, "baseline", "ref");
  for (const d of ["traces", "out"]) mkdirSync(path.join(vdir, d), { recursive: true });
  const resultsPath = path.join(vdir, "results.jsonl");
  const errorsPath = path.join(vdir, "errors.jsonl");
  isolateTornLine(resultsPath);
  isolateTornLine(errorsPath);

  if (variant !== "baseline") {
    const missing = cases.filter((c) => !existsSync(path.join(refDir, c.id)));
    if (missing.length) throw new Error(`Önce baseline koşmalı; referansı olmayan vakalar: ${missing.map((c) => c.id).join(", ")}`);
  }

  const done = new Set(readJsonl<{ prompt_id: string; rep: number }>(resultsPath).map((r) => `${r.prompt_id}:${r.rep}`));
  const tasks = cases.flatMap((c) => Array.from({ length: reps }, (_, rep) => ({ c, rep }))).filter(({ c, rep }) => !done.has(`${c.id}:${rep}`));
  const log = (msg: string) => process.stderr.write(`[${variant}] ${msg}\n`);
  log(`${V.model}${dry ? ` (kuru: ${dry})` : ""} — ${tasks.length}/${cases.length * reps} görev`);

  let okCount = 0;
  let failCount = 0;
  let spentUsd = 0; // bu süreçte ölçülen üretim + hakem harcaması (başarısız ama faturalanan denemeler dahil)
  const started = Date.now();

  async function runTask(c: CaseDef, rep: number): Promise<void> {
    const t0 = Date.now();
    const deadline = t0 + timeoutS * 1000;
    const store: CaseStore = {
      student: fixture(c),
      calls: [],
      apiError: null,
      savedCard: null,
      refunded: false,
      deadline,
      retries: { count: 0 },
    };
    const judgeRetry = { count: 0 };
    const body = { ...c.body, ...(store.student ? { studentId: store.student.id } : {}) };
    try {
      const out = await withTimeout(
        als.run(store, async () => {
          const { POST } = await import("@/app/studio/api/tools/articulation/route");
          const request = new Request("http://eval.local/studio/api/tools/articulation", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          const res = await POST(request as never);
          return { httpStatus: res.status, text: await res.text() };
        }),
        timeoutS,
        `${c.id} rep${rep}`,
      );
      const result = parseResult(out.text, out.httpStatus);
      const call = store.calls.at(-1);
      if (!call) {
        const apiErr = store.apiError as { message?: string } | null;
        throw new EvalError(
          apiErr ? `API hatası: ${apiErr.message ?? String(apiErr)}` : `model çağrılmadı (HTTP ${result.status}: ${JSON.stringify(result.body).slice(0, 200)})`,
          apiErr ? "api_error" : "harness_error",
        );
      }
      const res = call.response;
      if (!servedModelMatches(V.model, res.model)) {
        throw new EvalError(`yanıtı veren model ${res.model}, istenen ${V.model}`, "serving_substitution");
      }

      const rawText = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
      const truncated = res.stop_reason === "max_tokens";
      const drill = result.status === 200 ? ((result.body?.drill as Drill | undefined) ?? null) : null;
      const ok = !!drill;
      const userPrompt = String((call.request.messages as Array<{ content: unknown }>)[0]?.content ?? "");
      const systemPrompt = String((call.request.system as Array<{ text?: string }> | undefined)?.[0]?.text ?? "");
      const alias = c.student ? (/- Ad: ([^,\n]+)/.exec(userPrompt)?.[1]?.trim() ?? null) : null;
      const firstName = c.student?.name.split(" ")[0] ?? "";
      const realNameInRequest = c.student
        ? new RegExp(`(?<!\\p{L})${firstName}(?!\\p{L})`, "u").test(JSON.stringify(call.request))
        : false;
      const checks = runChecks({ body: c.body, drill, rawText, alias });
      writeFileSync(path.join(vdir, "out", `${c.id}_rep${rep}.json`), JSON.stringify({ ok, truncated, drill }, null, 2));

      let grade: Record<string, number> = {};
      const explanation: Record<string, string> = {};
      let judge: PairResult | null = null;
      if (!truncated) {
        grade = { win: 0.5, format_ok: ok ? 1 : 0, talimat: checks.talimat, dil_kurali: checks.dil_kurali, rumuz_yok: checks.rumuz_yok };
        if (variant === "baseline") {
          explanation.win = "Referans (canlı model): karşılaştırma değeri nötr 0,5.";
        } else {
          const ref = JSON.parse(readFileSync(path.join(refDir, c.id), "utf8")) as { ok: boolean; drill: Drill | null };
          if (!ok && !ref.ok) {
            explanation.win = "İki model de kullanılabilir çıktı üretemedi.";
          } else if (!ok) {
            grade.win = 0;
            explanation.win = "Aday kullanılabilir çıktı üretemedi; canlı model üretti.";
          } else if (!ref.ok) {
            grade.win = 1;
            explanation.win = "Canlı model çıktı üretemedi; aday üretti.";
          } else if (dry) {
            explanation.win = "(kuru çalıştırma: hakem çağrılmadı)";
          } else {
            const remaining = Math.max(30, (deadline - Date.now()) / 1000);
            judge = await withTimeout(
              judgePair(
                runtime.client!,
                renderTask(c, bankWordsFor(c)),
                renderDrill(drill, c.body.level),
                renderDrill(ref.drill, c.body.level),
                judgeRetry,
                deadline,
              ),
              remaining,
              `${c.id} rep${rep} hakem`,
            );
            grade.win = judge.win;
            explanation.win = [
              ...judge.reasons,
              judge.candErrors.length ? `Aday kritik hataları: ${judge.candErrors.join("; ")}` : "",
              judge.refErrors.length ? `Canlı model kritik hataları: ${judge.refErrors.join("; ")}` : "",
            ]
              .filter(Boolean)
              .join("\n");
          }
        }
      }

      const usage = res.usage;
      appendJsonl(resultsPath, {
        prompt_id: c.id,
        rep,
        prompt: renderPrompt(c),
        tags: c.tags,
        meta: {
          purpose: c.purpose,
          retries: store.retries.count,
          judge_retries: judgeRetry.count,
          refunded: store.refunded,
          http_status: result.status,
          api_calls: store.calls.length,
          real_name_in_request: realNameInRequest,
          checks: checks.details,
          ...(judge
            ? { criteria: judge.criteria, both_bad: judge.both_bad, cand_errors: judge.candErrors, ref_errors: judge.refErrors, judge_fallback: judge.fallback }
            : {}),
        },
        model: res.model,
        usage,
        stop_reason: res.stop_reason,
        ...(truncated ? { status: "truncated" } : {}),
        ...(judge ? { judge_model: judge.judge_model, judge_usage: judge.judge_usage } : {}),
        latency_s: call.latency_s,
        in_tokens: (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
        out_tokens: usage.output_tokens,
        cost_usd: costUsd(res.model, usage),
        judge_cost_usd: judge ? costUsd(judge.judge_model, judge.judge_usage) : 0,
        grade,
        explanation,
      });
      spentUsd += (costUsd(res.model, usage) ?? 0) + (judge ? (costUsd(judge.judge_model, judge.judge_usage) ?? 0) : 0);
      writeFileSync(
        path.join(vdir, "traces", `${c.id}_rep${rep}.json`),
        JSON.stringify(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
            { role: "assistant", content: rawText },
            {
              role: "assistant",
              content: `Uygulamanın uzmana gösterdiği son içerik (ad geri konmuş, banka kelimeleri işlenmiş):\n\n${renderDrill(drill, c.body.level)}`,
            },
            ...(judge?.transcript ?? []),
          ],
          null,
          2,
        ),
      );
      okCount++;
    } catch (e) {
      failCount++;
      const err = e as EvalError;
      const call = store.calls.at(-1);
      spentUsd +=
        (costUsd(call?.response.model, call?.response.usage) ?? 0) +
        (costUsd(err.extra?.judge_model as string | undefined, err.extra?.judge_usage as never) ?? 0);
      appendJsonl(errorsPath, {
        prompt_id: c.id,
        rep,
        failure_class: err.failureClass ?? "error",
        error: String(err.message ?? e),
        retries: store.retries.count,
        judge_retries: judgeRetry.count,
        model: call?.response.model,
        usage: call?.response.usage,
        judge_model: err.extra?.judge_model,
        judge_usage: err.extra?.judge_usage,
        latency_s: (Date.now() - t0) / 1000,
      });
      log(`${c.id} rep${rep} BAŞARISIZ (${err.failureClass ?? "error"}): ${String(err.message ?? e).slice(0, 300)}`);
    } finally {
      const line = `${okCount + failCount}/${tasks.length} (${okCount} tamam, ${failCount} hata), ${Math.round((Date.now() - started) / 1000)} sn, $${spentUsd.toFixed(2)}`;
      writeFileSync(path.join(vdir, "progress.txt"), line + "\n");
      log(line);
    }
  }

  let next = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, tasks.length)) }, async () => {
      while (next < tasks.length) {
        if (spentUsd >= budgetUsd) {
          log(`harcama tavanı ($${budgetUsd}) doldu — yeni görev başlatılmıyor`);
          return;
        }
        const { c, rep } = tasks[next++]!;
        await runTask(c, rep);
      }
    }),
  );

  // Dondurulmuş referans: vaka başına en düşük tekrarın kullanılabilir çıktısı. Bir kez yazılır, asla yenilenmez.
  if (variant === "baseline") {
    mkdirSync(refDir, { recursive: true });
    const rows = readJsonl<{ prompt_id: string; rep: number }>(resultsPath);
    for (const c of cases) {
      const target = path.join(refDir, c.id);
      if (existsSync(target)) continue;
      const repsDone = rows.filter((r) => r.prompt_id === c.id).map((r) => r.rep).sort((a, b) => a - b);
      const firstOk = repsDone.find((rep) => {
        const f = path.join(vdir, "out", `${c.id}_rep${rep}.json`);
        return existsSync(f) && (JSON.parse(readFileSync(f, "utf8")) as { ok: boolean; truncated: boolean }).ok;
      });
      if (firstOk !== undefined) copyFileSync(path.join(vdir, "out", `${c.id}_rep${firstOk}.json`), target);
      else if (repsDone.length >= reps) writeFileSync(target, JSON.stringify({ ok: false, truncated: false, drill: null }));
    }
  }
  log(`bitti — ${okCount} tamam, ${failCount} hata → ${resultsPath}`);
});
