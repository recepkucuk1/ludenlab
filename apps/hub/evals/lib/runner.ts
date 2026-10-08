// apps/hub/evals/lib/runner.ts
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import {
  HarnessError,
  FLOW_DIR,
  JUDGE,
  VARIANTS,
  appendJsonl,
  costUsd,
  isPending,
  isolateTornLine,
  loadApiKey,
  readJsonl,
  servedModelMatches,
  withTimeout,
  type Backend,
  type CaseDef,
} from "./core";
import { als, runtime, type CaseStore } from "./evalContext";
import { requestPaths } from "./exchange";
import { realFirstName, resolveFixture } from "./fixtures";
import { adIzi } from "./sharedChecks";
import { judgePair, type PairResult } from "./judge";
import { loadAdapter } from "../tools/registry";

/*
 * Araç-bağımsız koşturucu. Gerçek route'u (adaptör üzerinden) çalıştırır; yalnız dış yan etkiler
 * taklit edilir. subagent arka ucunda yanıtı olmayan istekler `pending.json`'a yazılır, koşu hata
 * vermez; orkestratör yanıtları üretince aynı komut kaldığı yerden sürer (results.jsonl'deki vakalar
 * atlanır, exchange'deki yanıtlar okunur).
 *
 * Bekleyen istek iki yoldan gelir: üretimde shim'in PendingError'ını route yutar (500 döner) → bayrak
 * `store.pending`'tedir; hakemde PendingError doğrudan buraya fırlar → `isPending(e)`.
 *
 * Çıktı: <flow>/<tool>/<variant>/{results.jsonl, errors.jsonl, pending.json, exchange/, out/, ref/, traces/, progress.txt}
 */

export interface RunOpts {
  tool: string;
  variant: string;
  backend: Backend;
  refVariant?: string;
  reps?: number;
  cases?: string[];
  concurrency?: number;
  timeoutS?: number;
  budgetUsd?: number;
  orders?: 1 | 2;
  flowDir?: string;
}

export interface RunSummary {
  tool: string;
  variant: string;
  done: number;
  failed: number;
  pending: number;
  resultsPath: string;
  pendingPath: string;
}

interface PendingRow {
  key: string;
  role: "gen" | "judge";
  agentModel: string;
  model: string;
  requestMd: string;
  responseTxt: string;
}

interface OutFile {
  ok: boolean;
  truncated: boolean;
  output: unknown;
}

const candFirstFor = (id: string, rep: number) => (id.charCodeAt(id.length - 1) + rep) % 2 === 0;

export async function runEval(opts: RunOpts): Promise<RunSummary> {
  const V = VARIANTS[opts.variant];
  if (!V) throw new Error(`EVAL_VARIANT ${Object.keys(VARIANTS).join(" | ")} olmalı, gelen: '${opts.variant}'`);
  const refKey = opts.refVariant ?? "baseline";
  const reps = opts.reps ?? 1;
  const concurrency = opts.concurrency ?? 4;
  const timeoutS = opts.timeoutS ?? 900;
  const budgetUsd = opts.budgetUsd ?? Infinity;
  const orders: 1 | 2 = opts.orders ?? (opts.backend === "api" ? 2 : 1);
  const flow = opts.flowDir ?? FLOW_DIR;

  const adapter = await loadAdapter(opts.tool);
  const allCases = JSON.parse(readFileSync(path.join(adapter.dir, "cases.json"), "utf8")) as CaseDef[];
  const cases = allCases.filter((c) => !opts.cases || opts.cases.includes(c.id));
  if (opts.cases && cases.length !== opts.cases.length) throw new Error(`Bilinmeyen vaka kimliği: ${opts.cases.join(",")}`);

  runtime.backend = opts.backend;
  runtime.variant = V;
  if (opts.backend === "api") {
    runtime.client = new Anthropic({ apiKey: loadApiKey(), maxRetries: 0 });
  } else {
    runtime.client = null;
    process.env.ANTHROPIC_API_KEY ??= "eval-cevrimdisi"; // Atölye route'u anahtarın varlığını kontrol eder
  }

  const tdir = path.join(flow, opts.tool);
  const vdir = path.join(tdir, opts.variant);
  const refDir = path.join(tdir, refKey, "ref");
  const exchangeDir = path.join(vdir, "exchange");
  for (const d of ["exchange", "out", "traces", "ref"]) mkdirSync(path.join(vdir, d), { recursive: true });
  const resultsPath = path.join(vdir, "results.jsonl");
  const errorsPath = path.join(vdir, "errors.jsonl");
  const pendingPath = path.join(vdir, "pending.json");
  isolateTornLine(resultsPath);
  isolateTornLine(errorsPath);

  const isRef = opts.variant === refKey;
  if (!isRef) {
    const missing = cases.filter((c) => !existsSync(path.join(refDir, c.id)));
    if (missing.length) throw new Error(`Önce referans kolu (${refKey}) koşmalı; referansı olmayan vakalar: ${missing.map((c) => c.id).join(", ")}`);
  }

  const done = new Set(readJsonl<{ prompt_id: string; rep: number }>(resultsPath).map((r) => `${r.prompt_id}:${r.rep}`));
  const tasks = cases.flatMap((c) => Array.from({ length: reps }, (_, rep) => ({ c, rep }))).filter(({ c, rep }) => !done.has(`${c.id}:${rep}`));
  const log = (msg: string) => process.stderr.write(`[${opts.tool} ${opts.variant}] ${msg}\n`);
  log(`${opts.backend} · ${V.model} — ${tasks.length}/${cases.length * reps} görev`);

  let okCount = 0;
  let failCount = 0;
  let spentUsd = 0;
  const pendingRows: PendingRow[] = [];
  let piiLeak: string | null = null;
  const started = Date.now();

  const pendingRow = (entry: string): PendingRow => {
    const i = entry.lastIndexOf(".");
    const key = entry.slice(0, i);
    const role = entry.slice(i + 1) as "gen" | "judge";
    const p = requestPaths(exchangeDir, key, role);
    return {
      key,
      role,
      agentModel: role === "judge" ? JUDGE.agentModel : V.agentModel,
      model: role === "judge" ? JUDGE.model : V.model,
      requestMd: p.md,
      responseTxt: p.response,
    };
  };

  async function runTask(c: CaseDef, rep: number): Promise<void> {
    const t0 = Date.now();
    const deadline = t0 + timeoutS * 1000;
    const fixture = resolveFixture(adapter.module, c.student);
    const firstName = realFirstName(fixture);
    const store: CaseStore = {
      caseId: c.id,
      rep,
      fixture,
      exchangeDir,
      calls: [],
      pending: [],
      apiError: null,
      saved: null,
      refunded: false,
      deadline,
      retries: { count: 0 },
    };
    const judgeRetry = { count: 0 };

    // ÇOCUK PII KAPISI — üretim isteğinde gerçek ad geçiyorsa bu bir test hatasıdır, koşu durur.
    // TUZAK TELİ: geniş eşleme (küçük harf + aksan katlama + önek: "elanın", "ELACIĞIM", "gokce").
    // Yanlış alarm koşuyu görünür durdurur; kaçak sessiz geçer — o yüzden çıktı sızıntısı kontrolündeki
    // dar `adGeciyorMu` yerine `adIzi` kullanılır.
    const piiGate = (text: string) => {
      if (firstName && adIzi(text, firstName)) {
        piiLeak = `${c.id} rep${rep}: gerçek ad '${firstName}' istekte`;
        throw new HarnessError(piiLeak, "pii_leak");
      }
    };
    /** Bekleyenleri kaydeder. Üretim isteği alt-ajana gitmeden ÖNCE (diske yazıldığı hâliyle) kapıdan geçer. */
    const markPending = (what: string) => {
      const rows = store.pending.map(pendingRow);
      for (const r of rows) if (r.role === "gen") piiGate(readFileSync(r.requestMd, "utf8"));
      pendingRows.push(...rows);
      log(`${c.id} rep${rep} ${what} bekliyor`);
    };

    try {
      const out = await withTimeout(
        als.run(store, () => adapter.invoke(c.body, c.student)),
        timeoutS,
        `${c.id} rep${rep}`,
      );
      if (store.pending.length) {
        markPending("üretim");
        return;
      }
      const call = store.calls.at(-1);
      if (!call) {
        const apiErr = store.apiError as { message?: string } | null;
        throw new HarnessError(
          apiErr ? `API hatası: ${apiErr.message ?? String(apiErr)}` : `model çağrılmadı (HTTP ${out.status}: ${JSON.stringify(out.body).slice(0, 200)})`,
          apiErr ? "api_error" : "harness_error",
        );
      }
      const res = call.response;
      if (opts.backend === "api" && !servedModelMatches(V.model, res.model)) {
        throw new HarnessError(`yanıtı veren model ${res.model}, istenen ${V.model}`, "serving_substitution");
      }

      const rawText = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
      const truncated = res.stop_reason === "max_tokens";
      const output = out.status === 200 && out.body ? adapter.extractOutput(out.body) : null;
      const ok = output !== null && output !== undefined && output !== "";
      const userPrompt = String((call.request.messages as Array<{ content: unknown }>)[0]?.content ?? "");
      const systemPrompt = Array.isArray(call.request.system)
        ? (call.request.system as Array<{ text?: string }>).map((b) => b.text ?? "").join("\n")
        : String(call.request.system ?? "");
      const alias = fixture ? (/- (?:Ad|Öğrenci): ([^,\n]+)/.exec(userPrompt)?.[1]?.trim() ?? null) : null;

      piiGate(JSON.stringify(call.request));

      const checks = adapter.checks({ body: c.body, output, rawText, alias });
      const outFile: OutFile = { ok, truncated, output };
      writeFileSync(path.join(vdir, "out", `${c.id}_rep${rep}.json`), JSON.stringify(outFile, null, 2));

      const grade: Record<string, number> = { win: 0.5, format_ok: ok ? 1 : 0, ...checks.scores };
      const explanation: Record<string, string> = {};
      let judge: PairResult | null = null;
      const candFirst = candFirstFor(c.id, rep);
      if (truncated) {
        explanation.win = "Yanıt token tavanında kesildi; hakem çağrılmadı.";
      } else if (isRef) {
        explanation.win = "Referans kolu: karşılaştırma değeri nötr 0,5.";
      } else {
        const ref = JSON.parse(readFileSync(path.join(refDir, c.id), "utf8")) as OutFile;
        if (!ok && !ref.ok) explanation.win = "İki kol da kullanılabilir çıktı üretemedi.";
        else if (!ok) {
          grade.win = 0;
          explanation.win = "Aday kullanılabilir çıktı üretemedi; referans üretti.";
        } else if (!ref.ok) {
          grade.win = 1;
          explanation.win = "Referans çıktı üretemedi; aday üretti.";
        } else {
          try {
            judge = await als.run(store, () =>
              withTimeout(
                judgePair({
                  toolLabel: adapter.label,
                  criteria: adapter.criteria,
                  task: adapter.renderTask(c, fixture),
                  cand: adapter.renderForJudge(output),
                  ref: adapter.renderForJudge(ref.output),
                  orders,
                  candFirst,
                  retry: judgeRetry,
                  deadline,
                }),
                Math.max(30, (deadline - Date.now()) / 1000),
                `${c.id} rep${rep} hakem`,
              ),
            );
          } catch (e) {
            if (isPending(e)) {
              markPending("hakem");
              return;
            }
            throw e;
          }
          grade.win = judge.win;
          explanation.win = [
            ...judge.reasons,
            judge.candErrors.length ? `Aday kritik hataları: ${judge.candErrors.join("; ")}` : "",
            judge.refErrors.length ? `Referans kritik hataları: ${judge.refErrors.join("; ")}` : "",
          ]
            .filter(Boolean)
            .join("\n");
        }
      }

      const usage = res.usage;
      const genCost = opts.backend === "api" ? costUsd(res.model, usage) : null;
      const judgeCost = judge && opts.backend === "api" ? costUsd(judge.judge_model, judge.judge_usage) : null;
      appendJsonl(resultsPath, {
        prompt_id: c.id,
        rep,
        tags: c.tags,
        purpose: c.purpose,
        backend: opts.backend,
        model: V.model,
        served_model: opts.backend === "subagent" ? `${V.agentModel}@subagent` : res.model,
        usage,
        usage_estimated: opts.backend === "subagent",
        stop_reason: res.stop_reason,
        ...(truncated ? { status: "truncated" } : {}),
        latency_s: call.latency_s,
        in_tokens: (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
        out_tokens: usage.output_tokens,
        cost_usd: genCost,
        judge_cost_usd: judgeCost,
        grade,
        explanation,
        hard_fail: checks.hard_fail,
        meta: {
          http_status: out.status,
          retries: store.retries.count,
          judge_retries: judgeRetry.count,
          refunded: store.refunded,
          checks: checks.details,
          cand_first: candFirst,
          ...(judge
            ? {
                judge_model: judge.judge_model,
                judge_orders: judge.orders,
                judge_per_order: judge.perOrder,
                criteria: judge.criteria,
                both_bad: judge.both_bad,
                cand_errors: judge.candErrors,
                ref_errors: judge.refErrors,
                judge_fallback: judge.fallback,
              }
            : {}),
        },
      });
      spentUsd += (genCost ?? 0) + (judgeCost ?? 0);
      writeFileSync(
        path.join(vdir, "traces", `${c.id}_rep${rep}.json`),
        JSON.stringify(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
            { role: "assistant", content: rawText },
            { role: "assistant", content: `Uygulamanın uzmana gösterdiği son içerik:\n\n${adapter.renderForJudge(output)}` },
            ...(judge?.transcript ?? []),
          ],
          null,
          2,
        ),
      );
      okCount++;
    } catch (e) {
      failCount++;
      const err = e as HarnessError;
      appendJsonl(errorsPath, {
        prompt_id: c.id,
        rep,
        failure_class: err.failureClass ?? "error",
        error: String(err.message ?? e),
        retries: store.retries.count,
        judge_retries: judgeRetry.count,
        latency_s: (Date.now() - t0) / 1000,
      });
      log(`${c.id} rep${rep} BAŞARISIZ (${err.failureClass ?? "error"}): ${String(err.message ?? e).slice(0, 300)}`);
    } finally {
      const line = `${okCount + failCount + pendingRows.length}/${tasks.length} (${okCount} tamam, ${failCount} hata, ${pendingRows.length} bekliyor), ${Math.round((Date.now() - started) / 1000)} sn${opts.backend === "api" ? `, $${spentUsd.toFixed(2)}` : ""}`;
      writeFileSync(path.join(vdir, "progress.txt"), line + "\n");
      log(line);
    }
  }

  let next = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, tasks.length)) }, async () => {
      while (next < tasks.length && !piiLeak) {
        if (spentUsd >= budgetUsd) {
          log(`harcama tavanı ($${budgetUsd}) doldu — yeni görev başlatılmıyor`);
          return;
        }
        const { c, rep } = tasks[next++]!;
        await runTask(c, rep);
      }
    }),
  );

  // Bekleyenler: orkestratör bu dosyayı okuyup alt-ajanları dağıtır. PII sızıntısında boş yazılır —
  // önceki koşudan kalan liste, sızıntılı isteğin bir alt-ajana verilmesine yol açmasın.
  writeFileSync(pendingPath, JSON.stringify(piiLeak ? [] : pendingRows, null, 2));
  if (piiLeak) throw new Error(`GERÇEK AD İSTEKTE — koşu durduruldu: ${piiLeak}`);
  if (pendingRows.length) log(`${pendingRows.length} istek bekliyor → ${pendingPath}`);

  // Dondurulmuş referans: vaka başına ilk kullanılabilir tekrar; bir kez yazılır.
  const rows = readJsonl<{ prompt_id: string; rep: number }>(resultsPath);
  for (const c of cases) {
    const target = path.join(vdir, "ref", c.id);
    if (existsSync(target)) continue;
    const repsDone = rows.filter((r) => r.prompt_id === c.id).map((r) => r.rep).sort((a, b) => a - b);
    const firstOk = repsDone.find((rep) => {
      const f = path.join(vdir, "out", `${c.id}_rep${rep}.json`);
      return existsSync(f) && (JSON.parse(readFileSync(f, "utf8")) as OutFile).ok;
    });
    if (firstOk !== undefined) copyFileSync(path.join(vdir, "out", `${c.id}_rep${firstOk}.json`), target);
    else if (repsDone.length >= reps) writeFileSync(target, JSON.stringify({ ok: false, truncated: false, output: null }));
  }

  log(`bitti — ${okCount} tamam, ${failCount} hata, ${pendingRows.length} bekliyor → ${resultsPath}`);
  return { tool: opts.tool, variant: opts.variant, done: okCount, failed: failCount, pending: pendingRows.length, resultsPath, pendingPath };
}
