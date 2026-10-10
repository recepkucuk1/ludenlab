// apps/hub/evals/lib/runner.ts
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
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
  responseText,
  servedModelMatches,
  withTimeout,
  type Backend,
  type CaseDef,
  type Fixture,
} from "./core";
import { als, runtime, type CaseStore } from "./evalContext";
import { exchangeKey, pendingRow, requestPaths, type PendingRow } from "./exchange";
import { realFirstName, resolveFixture } from "./fixtures";
import { maskStatic } from "./piiMask";
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
 * Ürün prompt'unun sabit ad-benzeri örnekleri (`piiMask.maskStatic`) taramadan önce maskelenir: shim'de yalnız
 * sistem metninde, 2 ve 3'te taranan metnin tamamında (kullanıcı metni zaten 1'den maskesiz geçmiştir).
 * Hata mesajı eşleşmenin kesitini ve kaynağını taşır. Sızıntılı istek dosyaları (2 ve alt-ajanda 3)
 * `.request.pii-blocked.{md,json}` olarak kenara alınır: hiçbir alt-ajana verilmez, istek düzelince yeniden yazılır.
 *
 * Kesilen yanıt (stop_reason max_tokens) kullanılabilir çıktı sayılmaz: kullanılabilir referansa karşı
 * kaybeder, referans olarak donmaz; satırda `status: "truncated"` kalır.
 *
 * TURLAR (EVAL_TAG / opts.tag): aynı varyantı (ör. düzeltilmiş prompt'u) yeni bir turda temiz dizinde
 * koşmak için. Kol dizini `<variant>@<tag>` olur (results/exchange/out/ref ayrı). `refVariant` da etiket
 * taşıyabilir (`baseline@r2`); verilmezse referans etiketsiz `baseline`'dır — yani `v1@r2` eski tabana karşı
 * ölçülür. Tabanı da yeni turda yeniden koşup referans yapmak için: `EVAL_VARIANT=baseline EVAL_TAG=r2
 * EVAL_REF=baseline@r2` (kol = referans → nötr 0,5 + donma), ardından `v1` için `EVAL_TAG=r2 EVAL_REF=baseline@r2`.
 * Her sonuç satırı `gen_hash` (üretim isteğinin içerik özeti, exchange `requestHash`; iki arka uçta da)
 * taşır: iki tur aynı isteği mi gönderdi, satırdan okunur.
 *
 * Bütçe (yalnız api): her görevin TÜM çağrıları (üretim + hakem; görev başarısız olsa da) sayılır.
 *
 * Çıktı: <flow>/<tool>/<variant>[@<tag>]/{results.jsonl, errors.jsonl, pending.json, exchange/, out/, ref/, traces/, progress.txt}
 */

export interface RunOpts {
  tool: string;
  variant: string;
  backend: Backend;
  /** Referans kolu: `<variant>` ya da `<variant>@<tag>` (varsayılan "baseline"). */
  refVariant?: string;
  /** Tur etiketi: kol dizini `<variant>@<tag>` olur. */
  tag?: string;
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
  /** Kol dizininin adı (`<variant>` ya da `<variant>@<tag>`). */
  arm: string;
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

interface Comparison {
  win: number;
  explanation: string;
  judge: PairResult | null;
}

const OFFLINE_KEY = "eval-cevrimdisi";
/** Tur etiketi (`EVAL_TAG`) ve kol adındaki etiket kısmı için izin verilen karakterler. */
export const TAG_RE = /^[A-Za-z0-9._-]+$/;

/** Kol adını (`<varyant>` ya da `<varyant>@<etiket>`; `EVAL_REF`) ayrıştırır. Bilinmeyen/boş varyant, fazladan
    '@' ya da geçersiz etiket → `config` hatası. Koşturucu ve hakem kontrolleri aynı kuralı paylaşır. */
export function parseArm(ref: string): { variant: string; tag?: string } {
  const [variant, tag, ...rest] = ref.split("@");
  if (!variant || !VARIANTS[variant] || rest.length || (tag !== undefined && !TAG_RE.test(tag))) {
    throw new HarnessError(`EVAL_REF <varyant>[@<etiket>] olmalı (varyant: ${Object.keys(VARIANTS).join(" | ")}), gelen: '${ref}'`, "config");
  }
  return tag === undefined ? { variant } : { variant, tag };
}

/** orders=1'de adayın A tarafında olup olmadığı: kimliğin tüm karakterlerinin kod toplamı + tekrar, çift → A. */
const candFirstFor = (id: string, rep: number) => ([...id].reduce((a, ch) => a + ch.codePointAt(0)!, 0) + rep) % 2 === 0;

const tagged = (variant: string, tag: string | undefined) => (tag ? `${variant}@${tag}` : variant);

/** Koşu başlamadan (dizin, ortam, işçi yok) seçenekleri doğrular. */
function validateOpts(opts: RunOpts): void {
  const fail = (msg: string) => {
    throw new HarnessError(msg, "config");
  };
  const keys = Object.keys(VARIANTS).join(" | ");
  if (!VARIANTS[opts.variant]) fail(`EVAL_VARIANT ${keys} olmalı, gelen: '${opts.variant}'`);
  if (opts.backend !== "api" && opts.backend !== "subagent") fail(`EVAL_BACKEND api | subagent olmalı, gelen: '${String(opts.backend)}'`);
  if (opts.tag !== undefined && !TAG_RE.test(opts.tag)) fail(`EVAL_TAG yalnız harf, rakam, '.', '_', '-' içerebilir, gelen: '${opts.tag}'`);
  if (opts.refVariant !== undefined) parseArm(opts.refVariant);
  const atLeastOne = (name: string, v: number | undefined, integer: boolean) => {
    if (v === undefined) return;
    if (!Number.isFinite(v) || v < 1 || (integer && !Number.isInteger(v))) fail(`${name} ${integer ? "tam sayı ve " : ""}≥ 1 olmalı, gelen: ${v}`);
  };
  atLeastOne("EVAL_REPS", opts.reps, true);
  atLeastOne("EVAL_CONCURRENCY", opts.concurrency, true);
  atLeastOne("EVAL_TIMEOUT_S", opts.timeoutS, false);
  if (opts.budgetUsd !== undefined && !(Number.isFinite(opts.budgetUsd) && opts.budgetUsd > 0)) {
    fail(`EVAL_BUDGET_USD sonlu ve > 0 olmalı, gelen: ${opts.budgetUsd}`);
  }
  if (opts.orders !== undefined && opts.orders !== 1 && opts.orders !== 2) fail(`JUDGE_ORDERS 1 | 2 olmalı, gelen: ${String(opts.orders)}`);
}

/**
 * Dondurulmuş referans: vaka başına İLK kullanılabilir tekrar; bir kez yazılır. Daha düşük bir tekrar henüz
 * bitmemişse (bekliyor / hata verdi) karar ertelenir — yoksa "ilk" tekrar koşuların bitiş sırasına bağlı kalırdı.
 * Tüm tekrarlar bitti ve hiçbiri kullanılabilir değilse `ok: false` donar.
 */
function freezeRefs(vdir: string, cases: CaseDef[], reps: number, resultsPath: string): void {
  const done = new Set(readJsonl<{ prompt_id: string; rep: number }>(resultsPath).map((r) => `${r.prompt_id}:${r.rep}`));
  /** İlk kullanılabilir tekrarın çıktı dosyası; hiçbiri değilse null; daha düşük bir tekrar bitmemişse "bekle". */
  const firstUsable = (id: string): string | null | "bekle" => {
    for (let rep = 0; rep < reps; rep++) {
      if (!done.has(`${id}:${rep}`)) return "bekle";
      const f = path.join(vdir, "out", `${exchangeKey(id, rep)}.json`);
      if (existsSync(f) && (JSON.parse(readFileSync(f, "utf8")) as OutFile).ok) return f;
    }
    return null;
  };
  for (const c of cases) {
    const target = path.join(vdir, "ref", c.id);
    if (existsSync(target)) continue;
    const f = firstUsable(c.id);
    if (f === "bekle") continue;
    if (f) copyFileSync(f, target);
    else writeFileSync(target, JSON.stringify({ ok: false, truncated: false, output: null }));
  }
}

export async function runEval(opts: RunOpts): Promise<RunSummary> {
  validateOpts(opts);
  const V = VARIANTS[opts.variant]!;
  const arm = tagged(opts.variant, opts.tag);
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
  if (opts.cases) {
    const unknown = opts.cases.filter((id) => !allCases.some((c) => c.id === id));
    if (unknown.length) throw new HarnessError(`Bilinmeyen vaka kimliği: ${unknown.join(", ")}`, "config");
  }
  // Her vakanın fikstürü işçiler başlamadan çözülür: yanlış kimlik koşunun ortasında değil, en başta patlar.
  const fixtures = new Map<string, Fixture | null>(cases.map((c) => [c.id, resolveFixture(adapter.module, c.student)]));

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
  const vdir = path.join(tdir, arm);
  const refDir = path.join(tdir, refKey, "ref");
  const exchangeDir = path.join(vdir, "exchange");
  for (const d of ["exchange", "out", "traces", "ref"]) mkdirSync(path.join(vdir, d), { recursive: true });
  const resultsPath = path.join(vdir, "results.jsonl");
  const errorsPath = path.join(vdir, "errors.jsonl");
  const pendingPath = path.join(vdir, "pending.json");
  isolateTornLine(resultsPath);
  isolateTornLine(errorsPath);

  const isRef = arm === refKey;
  if (!isRef) {
    const missing = cases.filter((c) => !existsSync(path.join(refDir, c.id)));
    if (missing.length) throw new Error(`Önce referans kolu (${refKey}) koşmalı; referansı olmayan vakalar: ${missing.map((c) => c.id).join(", ")}`);
  }

  const done = new Set(readJsonl<{ prompt_id: string; rep: number }>(resultsPath).map((r) => `${r.prompt_id}:${r.rep}`));
  const tasks = cases.flatMap((c) => Array.from({ length: reps }, (_, rep) => ({ c, rep }))).filter(({ c, rep }) => !done.has(`${c.id}:${rep}`));
  const log = (msg: string) => process.stderr.write(`[${opts.tool} ${arm}] ${msg}\n`);
  log(`${opts.backend} · ${V.model} — ${tasks.length}/${cases.length * reps} görev`);

  let okCount = 0;
  let failCount = 0;
  let processed = 0; // bu koşuda sonuçlanan (tamam / hata / bekliyor) görev sayısı; her görev bir kez sayılır
  let spentUsd = 0;
  const pendingRows: PendingRow[] = [];
  let piiLeak: string | null = null;
  const started = Date.now();

  /** Aday çıktıyı dondurulmuş referansla karşılaştırır. Hakem bekliyorsa PendingError yukarı fırlar. */
  async function compareToRef(a: {
    c: CaseDef;
    fixture: Fixture | null;
    output: unknown;
    ok: boolean;
    truncated: boolean;
    store: CaseStore;
    candFirst: boolean;
    judgeRetry: { count: number };
    deadline: number;
  }): Promise<Comparison> {
    if (isRef) return { win: 0.5, explanation: "Referans kolu: karşılaştırma değeri nötr 0,5.", judge: null };
    const ref = JSON.parse(readFileSync(path.join(refDir, a.c.id), "utf8")) as OutFile;
    const cut = a.truncated ? " (aday yanıtı token tavanında kesildi)" : "";
    if (!a.ok && !ref.ok) return { win: 0.5, explanation: `İki kol da kullanılabilir çıktı üretemedi${cut}.`, judge: null };
    if (!a.ok) return { win: 0, explanation: `Aday kullanılabilir çıktı üretemedi${cut}; referans üretti.`, judge: null };
    if (!ref.ok) return { win: 1, explanation: "Referans çıktı üretemedi; aday üretti.", judge: null };
    const judge = await als.run(a.store, () =>
      withTimeout(
        judgePair({
          toolLabel: adapter.label,
          criteria: adapter.criteria,
          task: adapter.renderTask(a.c, a.fixture),
          cand: adapter.renderForJudge(a.output),
          ref: adapter.renderForJudge(ref.output),
          orders,
          candFirst: a.candFirst,
          retry: a.judgeRetry,
          deadline: a.deadline,
        }),
        Math.max(30, (a.deadline - Date.now()) / 1000),
        `${a.c.id} rep${a.store.rep} hakem`,
      ),
    );
    const explanation = [
      ...judge.reasons,
      judge.candErrors.length ? `Aday kritik hataları: ${judge.candErrors.join("; ")}` : "",
      judge.refErrors.length ? `Referans kritik hataları: ${judge.refErrors.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    return { win: judge.win, explanation, judge };
  }

  async function runTask(c: CaseDef, rep: number): Promise<void> {
    const t0 = Date.now();
    const deadline = t0 + timeoutS * 1000;
    const fixture = fixtures.get(c.id) ?? null;
    const firstName = realFirstName(fixture);
    const genKey = exchangeKey(c.id, rep);
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

    /** Sızıntıyı kaydeder (koşu durur); mesaj kaynağı ve eşleşmenin kesitini taşır. `blockFiles`: diskteki
        istek sızıntılı olandır → hiçbir alt-ajana verilmesin diye kenara alınır. */
    const leak = (source: string, kesit: string, blockFiles = false): HarnessError => {
      piiLeak = `${c.id} rep${rep}: gerçek ad '${firstName}' istekte (kaynak: ${source}) — «${kesit}»`;
      leakBox.err = new HarnessError(piiLeak, "pii_leak");
      if (blockFiles) {
        const p = requestPaths(exchangeDir, genKey, "gen");
        for (const [from, ext] of [[p.md, "md"], [p.json, "json"]] as const) {
          if (existsSync(from)) renameSync(from, from.replace(/\.request\.(md|json)$/, `.request.pii-blocked.${ext}`));
        }
      }
      return leakBox.err;
    };
    /** Bekleyenleri kaydeder. Üretim isteği alt-ajana gitmeden ÖNCE (diske yazıldığı hâliyle) taranır;
        sızıntı ya da eksik dosya varsa satır eklenmez, hata döner. */
    const markPending = (): HarnessError | null => {
      const rows = store.pending.map((e) => pendingRow(exchangeDir, e, V));
      for (const r of rows) {
        if (r.role !== "gen") continue;
        if (!existsSync(r.requestMd)) return new HarnessError(`bekleyen isteğin dosyası yok: ${r.requestMd}`, "harness_error");
        // Sabit başlık ("# EVAL İSTEĞİ / Rol: gen") düzenek metnidir, istek değil: ad öneki ("Eva") yanlış alarm vermesin.
        const md = readFileSync(r.requestMd, "utf8").replace(/^# EVAL İSTEĞİ\nRol: \w+\n/, "");
        const kesit = firstName ? piiKesit(maskStatic(md), firstName) : null;
        if (kesit !== null) return leak(r.requestMd, kesit, true);
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

      const rawText = responseText(res);
      const truncated = res.stop_reason === "max_tokens";
      const output = out.status === 200 && out.body ? adapter.extractOutput(out.body) : null;
      // Kesilen yanıt kullanılabilir çıktı değildir: kullanılabilir referansa karşı kaybeder, referans olarak donmaz.
      const ok = !truncated && output !== null && output !== undefined && output !== "";
      const userPrompt = String((call.request.messages as Array<{ content: unknown }>)[0]?.content ?? "");
      const systemPrompt = Array.isArray(call.request.system)
        ? (call.request.system as Array<{ text?: string }>).map((b) => b.text ?? "").join("\n")
        : String(call.request.system ?? "");

      // Üçüncü ağ: modele giden isteğin tüm metinleri (JSON değil, metin).
      const kesit = firstName ? piiKesit(maskStatic(metinler(call.request).join("\n")), firstName) : null;
      if (kesit !== null) throw leak("call.request", kesit, opts.backend === "subagent");

      // Rumuz satırı: araç prompt'larında `- Ad:` / `- Öğrenci:` / `- İsim:`, AI profilinde `Öğrenci adı:`; ortak
      // öğrenci bloğunda (studentContext.ts) kimlik satırı tiresiz `Öğrenci: <rumuz>[, N yaş]` ve hemen ardından
      // `Çalışma alanı:` gelir. Desen bu biçime SABİT: serbest metindeki "Öğrenci: bugün yorgundu" gibi bir satır
      // (sonunda yaş yok, ardında çalışma alanı yok) rumuz sanılmaz.
      const RUMUZ_DESENI = /(?:- (?:Ad|Öğrenci|İsim)|Öğrenci adı): ([^,\n]+)|^Öğrenci: ([^,\n]+)(?:, \d+ yaş)?$(?=\nÇalışma alanı: )/m;
      const rumuz = fixture ? RUMUZ_DESENI.exec(userPrompt) : null;
      const alias = rumuz ? (rumuz[1] ?? rumuz[2])?.trim() || null : null;
      // Rumuz okunamazsa rumuz kontrolü sessizce geçerdi (alias null → rumuz_yok 1): koşu hatası.
      if (fixture && !alias) throw new HarnessError("rumuz bulunamadı: prompt biçimi değişti mi?", "harness_error");

      const checks = adapter.checks({ body: c.body, output, rawText, alias });
      const outFile: OutFile = { ok, truncated, output };
      writeFileSync(path.join(vdir, "out", `${exchangeKey(c.id, rep)}.json`), JSON.stringify(outFile, null, 2));

      const candFirst = candFirstFor(c.id, rep);
      const cmp = await compareToRef({ c, fixture, output, ok, truncated, store, candFirst, judgeRetry, deadline });
      const judge = cmp.judge;
      const grade: Record<string, number> = { win: cmp.win, format_ok: ok ? 1 : 0, ...checks.scores };
      const explanation: Record<string, string> = { win: cmp.explanation };

      const usage = res.usage;
      const genCost = opts.backend === "api" ? costUsd(res.model, usage) : null;
      const judgeCost = judge && opts.backend === "api" ? costUsd(judge.judge_model, judge.judge_usage) : null;
      appendJsonl(resultsPath, {
        prompt_id: c.id,
        rep,
        ref: refKey,
        tags: c.tags,
        purpose: c.purpose,
        backend: opts.backend,
        model: V.model,
        served_model: opts.backend === "subagent" ? `${V.agentModel}@subagent` : res.model,
        gen_hash: store.genHash ?? null,
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
          api_calls: store.calls.length,
          retries: store.retries.count,
          judge_retries: judgeRetry.count,
          refunded: store.refunded,
          checks: checks.details,
          cand_first: candFirst,
          alias_found: alias !== null,
          ...(judge
            ? {
                judge_model: judge.judge_model,
                judge_usage: judge.judge_usage,
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
      writeFileSync(
        path.join(vdir, "traces", `${exchangeKey(c.id, rep)}.json`),
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
      // Üretimde bozuk tool_use yanıtı: shim yanıtı kenara alıp isteği yeniden listeledi, route hatayı yuttu →
      // görev yalnız "bekliyor" gibi görünürdü. Hakemdeki judge_parse gibi hem hata satırı yazılır hem bekleyen
      // kaydedilir (orkestratör yeniden dağıtsın): görev bu koşuda bir kez hata (failCount), bir kez bekliyor
      // (pendingRows) sayılır. Ördek tiplemesi: isPending gibi, modül kopyaları arasında da çalışsın.
      const apiErr = store.apiError as { failureClass?: unknown } | null;
      if (isPending(caught) && apiErr?.failureClass === "tool_parse") caught = store.apiError;
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
      // Harcama: görevin TÜM çağrıları (üretim + hakem), görev başarısız olsa da.
      if (opts.backend === "api") spentUsd += store.calls.reduce((sum, k) => sum + (costUsd(k.response.model, k.response.usage) ?? 0), 0);
      processed++;
      const line = `${processed}/${tasks.length} (${okCount} tamam, ${failCount} hata, ${pendingRows.length} bekliyor), ${Math.round((Date.now() - started) / 1000)} sn${opts.backend === "api" ? `, $${spentUsd.toFixed(2)}` : ""}`;
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

  freezeRefs(vdir, cases, reps, resultsPath);

  log(`bitti — ${okCount} tamam, ${failCount} hata, ${pendingRows.length} bekliyor → ${resultsPath}`);
  return {
    tool: opts.tool,
    variant: opts.variant,
    arm,
    done: okCount,
    failed: failCount,
    pending: pendingRows.length,
    resultsPath,
    pendingPath,
  };
}
