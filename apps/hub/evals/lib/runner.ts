// apps/hub/evals/lib/runner.ts
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import {
  HarnessError,
  FLOW_DIR,
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
import { pendingRow, type PendingRow } from "./exchange";
import { realFirstName, resolveFixture } from "./fixtures";
import { metinler } from "./sharedChecks";
import { piiKesit } from "./shim";
import { judgePair, type PairResult } from "./judge";
import { loadAdapter } from "../tools/registry";

/*
 * Araç-bağımsız koşturucu. Gerçek route'u (adaptör üzerinden) çalıştırır; yalnız dış yan etkiler
 * taklit edilir. subagent arka ucunda yanıtı olmayan istekler `pending.json`'a yazılır, koşu hata
 * vermez; orkestratör yanıtları üretince aynı komut kaldığı yerden sürer (results.jsonl'deki vakalar
 * atlanır, exchange'deki yanıtlar okunur).
 *
 * Bekleyen istek iki yoldan gelir: üretimde shim'in PendingError'ını route yutar (500 döner) → bayrak
 * `store.pending`'tedir; hakemde PendingError doğrudan buraya fırlar → `isPending(e)`. Görev hangi hatayla
 * biterse bitsin (ör. istek yazıldıktan sonra süre aşımı) `store.pending`'teki istekler kaydedilir.
 *
 * ÇOCUK PII KAPISI — üretim isteğinde gerçek ad geçiyorsa bu bir test hatasıdır, koşu durur, `pending.json`
 * boş yazılır. Üç ağ, hepsi METİN üzerinde (JSON'daki `\n` kaçışı satır başındaki adı gizlerdi):
 *   1. shim: istek ağa/diske çıkmadan (`store.piiName` → `store.piiLeak`; route hatayı yutar);
 *   2. bekleyen üretim isteğinin diske yazılan `.request.md`'si (alt-ajana verilmeden önce);
 *   3. kaydedilen isteğin (`call.request`) tüm metinleri.
 * Hata mesajı eşleşmenin kesitini ve kaynağını taşır.
 *
 * Kesilen yanıt (stop_reason max_tokens) kullanılabilir çıktı sayılmaz: kullanılabilir referansa karşı
 * kaybeder, referans olarak donmaz; satırda `status: "truncated"` kalır.
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

interface OutFile {
  ok: boolean;
  truncated: boolean;
  output: unknown;
}

const OFFLINE_KEY = "eval-cevrimdisi";

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
  // Atölye route'u anahtarın VARLIĞINI kontrol eder → iki arka uçta da yer tutucu. Gerçek anahtar düzenek
  // eliyle process.env'e girmez; SDK istemcisine doğrudan loadApiKey() verir. Önceki koşudan kalan yer
  // tutucu loadApiKey'i yanıltmasın diye önce silinir, anahtar yer tutucu konmadan ÖNCE okunur.
  if (process.env.ANTHROPIC_API_KEY === OFFLINE_KEY) delete process.env.ANTHROPIC_API_KEY;
  const apiKey = opts.backend === "api" ? loadApiKey() : null;
  process.env.ANTHROPIC_API_KEY ??= OFFLINE_KEY;
  runtime.client = apiKey ? new Anthropic({ apiKey, maxRetries: 0 }) : null;

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
      // TUZAK TELİ (shim + aşağıdaki ağlar): geniş eşleme (küçük harf + aksan katlama + önek: "elanın",
      // "ELACIĞIM", "gokce"). Yanlış alarm koşuyu görünür durdurur; kaçak sessiz geçer — o yüzden çıktı
      // sızıntısı kontrolündeki dar `adGeciyorMu` yerine `adIzi` (piiKesit) kullanılır.
      ...(firstName ? { piiName: firstName } : {}),
    };
    const judgeRetry = { count: 0 };
    const leakBox: { err: HarnessError | null } = { err: null };

    /** Sızıntıyı kaydeder (koşu durur); mesaj kaynağı ve eşleşmenin kesitini taşır. */
    const leak = (source: string, kesit: string): HarnessError => {
      piiLeak = `${c.id} rep${rep}: gerçek ad '${firstName}' istekte (kaynak: ${source}) — «${kesit}»`;
      leakBox.err = new HarnessError(piiLeak, "pii_leak");
      return leakBox.err;
    };
    /** Bekleyenleri kaydeder. Üretim isteği alt-ajana gitmeden ÖNCE (diske yazıldığı hâliyle) taranır;
        sızıntı ya da eksik dosya varsa satır eklenmez, hata döner. */
    const markPending = (): HarnessError | null => {
      const rows = store.pending.map((e) => pendingRow(exchangeDir, e, V));
      for (const r of rows) {
        if (r.role !== "gen") continue;
        if (!existsSync(r.requestMd)) return new HarnessError(`bekleyen isteğin dosyası yok: ${r.requestMd}`, "harness_error");
        const kesit = firstName ? piiKesit(readFileSync(r.requestMd, "utf8"), firstName) : null;
        if (kesit !== null) return leak(r.requestMd, kesit);
      }
      pendingRows.push(...rows);
      log(`${c.id} rep${rep} ${[...new Set(rows.map((r) => (r.role === "gen" ? "üretim" : "hakem")))].join("+")} bekliyor`);
      return null;
    };

    try {
      const out = await withTimeout(
        als.run(store, () => adapter.invoke(c.body, c.student)),
        timeoutS,
        `${c.id} rep${rep}`,
      );
      if (store.piiLeak) throw leak("shim", store.piiLeak);
      if (store.pending.length) throw new HarnessError("bekliyor", "pending"); // catch kaydeder
      const call = store.calls.at(-1);
      if (!call) {
        const apiErr = store.apiError as { message?: string; failureClass?: string } | null;
        throw new HarnessError(
          apiErr
            ? `model çağrısı başarısız: ${apiErr.message ?? String(apiErr)}`
            : `model çağrılmadı (HTTP ${out.status}: ${JSON.stringify(out.body).slice(0, 200)})`,
          apiErr ? (apiErr.failureClass ?? "api_error") : "harness_error",
        );
      }
      const res = call.response;
      if (opts.backend === "api" && !servedModelMatches(V.model, res.model)) {
        throw new HarnessError(`yanıtı veren model ${res.model}, istenen ${V.model}`, "serving_substitution");
      }

      const rawText = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
      const truncated = res.stop_reason === "max_tokens";
      const output = out.status === 200 && out.body ? adapter.extractOutput(out.body) : null;
      // Kesilen yanıt kullanılabilir çıktı değildir: kullanılabilir referansa karşı kaybeder, referans olarak donmaz.
      const ok = !truncated && output !== null && output !== undefined && output !== "";
      const userPrompt = String((call.request.messages as Array<{ content: unknown }>)[0]?.content ?? "");
      const systemPrompt = Array.isArray(call.request.system)
        ? (call.request.system as Array<{ text?: string }>).map((b) => b.text ?? "").join("\n")
        : String(call.request.system ?? "");

      // Üçüncü ağ: modele giden isteğin tüm metinleri (JSON değil, metin).
      const kesit = firstName ? piiKesit(metinler(call.request).join("\n"), firstName) : null;
      if (kesit !== null) throw leak("call.request", kesit);

      const alias = fixture ? (/- (?:Ad|Öğrenci): ([^,\n]+)/.exec(userPrompt)?.[1]?.trim() ?? null) : null;
      // Rumuz okunamazsa rumuz kontrolü sessizce geçerdi (alias null → rumuz_yok 1): koşu hatası.
      if (fixture && !alias) throw new HarnessError("rumuz bulunamadı: prompt biçimi değişti mi?", "harness_error");

      const checks = adapter.checks({ body: c.body, output, rawText, alias });
      const outFile: OutFile = { ok, truncated, output };
      writeFileSync(path.join(vdir, "out", `${c.id}_rep${rep}.json`), JSON.stringify(outFile, null, 2));

      const grade: Record<string, number> = { win: 0.5, format_ok: ok ? 1 : 0, ...checks.scores };
      const explanation: Record<string, string> = {};
      let judge: PairResult | null = null;
      const candFirst = candFirstFor(c.id, rep);
      if (isRef) {
        explanation.win = "Referans kolu: karşılaştırma değeri nötr 0,5.";
      } else {
        const ref = JSON.parse(readFileSync(path.join(refDir, c.id), "utf8")) as OutFile;
        const cut = truncated ? " (aday yanıtı token tavanında kesildi)" : "";
        if (!ok && !ref.ok) explanation.win = `İki kol da kullanılabilir çıktı üretemedi${cut}.`;
        else if (!ok) {
          grade.win = 0;
          explanation.win = `Aday kullanılabilir çıktı üretemedi${cut}; referans üretti.`;
        } else if (!ref.ok) {
          grade.win = 1;
          explanation.win = "Referans çıktı üretemedi; aday üretti.";
        } else {
          // Hakem bekliyorsa PendingError catch'e fırlar; orada kaydedilir.
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
          alias_found: alias !== null,
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
      // Shim sızıntıyı yakaladı ama route hatayı yutmadı (ya da başka hata önce fırladı): sızıntı öncelikli.
      let caught: unknown = leakBox.err ?? (store.piiLeak ? leak("shim", store.piiLeak) : e);
      // Bekleyen istek hiçbir yolda kaybolmasın: hata ne olursa olsun kaydedilir (sızıntıda kaydedilmez).
      if (store.pending.length && !leakBox.err) caught = markPending() ?? caught;
      if (isPending(caught)) return; // yalnız bekliyor — hata değil
      failCount++;
      const err = caught as HarnessError;
      appendJsonl(errorsPath, {
        prompt_id: c.id,
        rep,
        failure_class: err.failureClass ?? "error",
        error: String(err.message ?? caught),
        retries: store.retries.count,
        judge_retries: judgeRetry.count,
        latency_s: (Date.now() - t0) / 1000,
      });
      log(`${c.id} rep${rep} BAŞARISIZ (${err.failureClass ?? "error"}): ${String(err.message ?? caught).slice(0, 300)}`);
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
