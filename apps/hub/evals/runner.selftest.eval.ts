// apps/hub/evals/runner.selftest.eval.ts
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pickAlias } from "@ludenlab/ai";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import type { AtolyeFixture, CaseDef } from "./lib/core";
import { als, runtime } from "./lib/evalContext";
import { writeRequest } from "./lib/exchange";
import { resolveFixture } from "./lib/fixtures";
import { createMessage } from "./lib/shim";
import { adapter as socialStory } from "./tools/studio/social-story/adapter";

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

const story = (notes: string) =>
  JSON.stringify({
    title: "Tabletten ayrılma zamanı",
    sentences: [
      { type: "descriptive", text: "Akşam yemeğinden önce tablet saati biter.", visualPrompt: "a child putting a tablet on a shelf" },
      { type: "descriptive", text: "Annem son beş dakika der ve tren kartını gösterir.", visualPrompt: "a mother showing a train card" },
      { type: "perspective", text: "Annem benim sakin kalmama sevinir.", visualPrompt: "a smiling mother" },
      { type: "directive", text: "Kartı görünce tableti rafa koymayı deneyebilirim.", visualPrompt: "a child placing a tablet on a shelf" },
    ],
    expertNotes: notes,
    homeGuidance: "Her akşam aynı sırayla: kart, beş dakika, raf.",
  });

const REF_NOTES = "Son beş dakika uyarısını tren kartıyla eşleyin; kulak kapama görülürse sesi kısın.";
const CAND_NOTES = "Sabırlı olun ve olumlu pekiştirme yapın.";
const CRITERIA = ["ozgulluk", "klinik_derinlik", "bicim_butce", "dil_etik", "gray_oranlari", "gorsel_uyum"];

/** Hakem kararı: tüm ölçütlerde ve genelde `winner` tarafı kazanır. */
const verdict = (winner: "A" | "B", errors: { A?: string[]; B?: string[] } = {}) =>
  JSON.stringify({
    criteria: Object.fromEntries(CRITERIA.map((k) => [k, { winner, note: "n" }])),
    critical_errors: { A: errors.A ?? [], B: errors.B ?? [] },
    overall: winner,
    reason: "Gerekçe.",
  });

type Pending = Array<{ key: string; role: string; agentModel: string; requestMd: string; responseTxt: string }>;
const readPending = (p: string) => JSON.parse(readFileSync(p, "utf8")) as Pending;
const rows = (p: string) => readFileSync(p, "utf8").trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);
const caseById = (dir: string, id: string) => (JSON.parse(readFileSync(path.join(dir, "cases.json"), "utf8")) as CaseDef[]).find((c) => c.id === id)!;

/** `<tag>…</tag>` bloğunun içi (exchange md'si ve hakem mesajı bu biçimde). */
function block(text: string, tag: string): string {
  const m = new RegExp(`<${tag}>\\n([\\s\\S]*?)\\n</${tag}>`).exec(text);
  if (!m) throw new Error(`<${tag}> bloğu yok`);
  return m[1]!;
}

/** Geçici akış dizini; yalnız test geçerse silinir — kalırsa hata incelemesi için yerinde durur. */
function tempFlow(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "flow-"));
  onTestFinished(({ task }) => {
    if (task.result?.state === "pass") rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

const ssBase = (flowDir: string) => ({ tool: "studio/social-story", backend: "subagent" as const, flowDir, cases: ["ss-01"], timeoutS: 30 });

/** Tabanı tek geçişte bitirir: bekleyen üretim isteğine `response` yazılır. */
async function runBaseline(flowDir: string, response: string) {
  const { runEval } = await import("./lib/runner");
  const s = await runEval({ ...ssBase(flowDir), variant: "baseline" });
  writeFileSync(readPending(s.pendingPath)[0]!.responseTxt, response);
  return runEval({ ...ssBase(flowDir), variant: "baseline" });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("koşturucu (subagent arka ucu, sosyal hikâye)", () => {
  it("taban → bekle → yanıt → sonuç + referans; v1 → üretim → kör hakem → win", async () => {
    const { runEval } = await import("./lib/runner");
    const flow = tempFlow();
    const base = ssBase(flow);
    const ss01 = caseById(socialStory.dir, "ss-01") as CaseDef<{ situation: string }>;

    // 1. geçiş: taban, yanıt yok → bekliyor
    let s = await runEval({ ...base, variant: "baseline" });
    expect(s).toMatchObject({ done: 0, failed: 0, pending: 1, arm: "baseline" });
    let pending = readPending(s.pendingPath);
    expect(pending[0]).toMatchObject({ key: "ss-01_rep0", role: "gen", agentModel: "sonnet" });
    const md = readFileSync(pending[0]!.requestMd, "utf8");
    expect(md).toContain("<system>");
    expect(md).toContain(ss01.body.situation); // vakanın durumu isteğe girdi
    expect(existsSync(path.join(flow, "studio/social-story/baseline/ref/ss-01"))).toBe(false);

    // 2. geçiş: alt-ajan rolünde yanıtı yaz → sonuç satırı + donmuş referans
    writeFileSync(pending[0]!.responseTxt, story(REF_NOTES));
    s = await runEval({ ...base, variant: "baseline" });
    expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
    const r0 = rows(s.resultsPath)[0]!;
    expect(r0.grade).toMatchObject({ format_ok: 1, win: 0.5, dil_kurali: 1, rumuz_yok: 1 });
    expect(r0.hard_fail).toEqual([]);
    expect(r0.backend).toBe("subagent");
    expect(r0.usage_estimated).toBe(true);
    expect(r0.gen_hash).toMatch(/^[0-9a-f]{12}$/);
    expect(r0.meta).toMatchObject({ alias_found: true, api_calls: 1 });
    const ref = JSON.parse(readFileSync(path.join(flow, "studio/social-story/baseline/ref/ss-01"), "utf8")) as { ok: boolean; output: { title: string } };
    expect(ref.ok).toBe(true);
    expect(ref.output.title).toBe("Tabletten ayrılma zamanı");

    // 3. v1: üretim bekliyor → yaz → hakem bekliyor
    s = await runEval({ ...base, variant: "v1" });
    expect(s.pending).toBe(1);
    pending = readPending(s.pendingPath);
    expect(pending[0]!.role).toBe("gen");
    writeFileSync(pending[0]!.responseTxt, story(CAND_NOTES));
    s = await runEval({ ...base, variant: "v1" });
    expect(s.pending).toBe(1);
    pending = readPending(s.pendingPath);
    expect(pending[0]).toMatchObject({ role: "judge", agentModel: "opus" });
    expect(pending[0]!.key).toMatch(/^ss-01_rep0\.judge-(ab|ba)$/);
    const judgeMd = readFileSync(pending[0]!.requestMd, "utf8");
    expect(judgeMd).toContain("<output_schema>");
    expect(judgeMd).not.toContain("ss-01_rep0"); // körleştirme: anahtar ve model yalnız json'da
    expect(judgeMd).not.toContain("claude-");

    // Körlük: aday anahtarın söylediği tarafta (judge-ab → A), referans öbür tarafta.
    const candSide = pending[0]!.key.endsWith("judge-ab") ? "A" : "B";
    const refSide = candSide === "A" ? "B" : "A";
    const user = block(judgeMd, "user");
    const sides = { A: block(user, "aday_A"), B: block(user, "aday_B") };
    expect(sides[candSide]).toContain("Sabırlı olun");
    expect(sides[candSide]).not.toContain("kulak kapama");
    expect(sides[refSide]).toContain("kulak kapama");
    expect(sides[refSide]).not.toContain("Sabırlı olun");

    // 4. hakem yanıtı: adayın bulunduğu taraf kaybetsin → win 0
    writeFileSync(pending[0]!.responseTxt, verdict(refSide, { [candSide]: ["uzman notu jenerik"] }));
    s = await runEval({ ...base, variant: "v1" });
    expect(s).toMatchObject({ done: 1, pending: 0 });
    const r1 = rows(s.resultsPath)[0]!;
    expect((r1.grade as { win: number }).win).toBe(0);
    expect((r1.meta as { cand_errors: string[] }).cand_errors).toEqual(["uzman notu jenerik"]);
    expect((r1.meta as { judge_usage: unknown }).judge_usage).toBeTruthy();
    expect((r1.grade as { yasak_kalip: number }).yasak_kalip).toBeLessThan(1);

    // 5. yeniden koşu: tamamlanan vaka atlanır, satır eklenmez, bekleyen yok
    s = await runEval({ ...base, variant: "v1" });
    expect(rows(s.resultsPath)).toHaveLength(1);
    expect(readPending(s.pendingPath)).toEqual([]);
  }, 120_000);

  it("orders=2: hakem iki sırada sorulur (judge-ab + judge-ba), iki karar birleşir", async () => {
    const { runEval } = await import("./lib/runner");
    const flow = tempFlow();
    await runBaseline(flow, story(REF_NOTES));
    const v1 = { ...ssBase(flow), variant: "v1", orders: 2 as const };
    let s = await runEval(v1);
    writeFileSync(readPending(s.pendingPath)[0]!.responseTxt, story(CAND_NOTES));
    s = await runEval(v1);
    const pending = readPending(s.pendingPath);
    expect(pending.map((p) => p.key).sort()).toEqual(["ss-01_rep0.judge-ab", "ss-01_rep0.judge-ba"]);
    expect(pending.every((p) => p.role === "judge" && p.agentModel === "opus")).toBe(true);

    // ab: aday A → A kazansın; ba: aday B → A (referans) kazansın → 1 + 0 → 0,5
    for (const p of pending) writeFileSync(p.responseTxt, verdict("A"));
    s = await runEval(v1);
    expect(s).toMatchObject({ done: 1, pending: 0 });
    const r = rows(s.resultsPath)[0]!;
    expect((r.grade as { win: number }).win).toBe(0.5);
    expect(r.meta).toMatchObject({
      judge_orders: 2,
      judge_per_order: [
        { candSide: "A", overall: "A" },
        { candSide: "B", overall: "A" },
      ],
    });
  }, 120_000);

  it("geçersiz JSON: taban format_ok 0 + json_gecersiz + 500 + iade, referans ok:false; v1 hakemsiz win 1", async () => {
    const { runEval } = await import("./lib/runner");
    const flow = tempFlow();
    let s = await runBaseline(flow, "Bu bir JSON değil, düz metin.");
    expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
    const r0 = rows(s.resultsPath)[0]!;
    expect((r0.grade as { format_ok: number }).format_ok).toBe(0);
    expect(r0.hard_fail).toContain("json_gecersiz");
    expect(r0.meta).toMatchObject({ http_status: 500, refunded: true });
    expect(JSON.parse(readFileSync(path.join(flow, "studio/social-story/baseline/ref/ss-01"), "utf8"))).toMatchObject({ ok: false });

    s = await runEval({ ...ssBase(flow), variant: "v1" });
    writeFileSync(readPending(s.pendingPath)[0]!.responseTxt, story(CAND_NOTES));
    s = await runEval({ ...ssBase(flow), variant: "v1" });
    expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
    const r1 = rows(s.resultsPath)[0]!;
    expect((r1.grade as { win: number }).win).toBe(1);
    expect((r1.explanation as { win: string }).win).toContain("Referans çıktı üretemedi");
    expect(readdirSync(path.join(flow, "studio/social-story/v1/exchange")).filter((f) => f.includes("judge"))).toEqual([]);
  }, 120_000);

  it("PII kapısı: shim gerçek adı yakalar → koşu durur, istek diske yazılmaz, eski pending boşalır, hata kesit taşır", async () => {
    const { runEval } = await import("./lib/runner");
    const flow = tempFlow();
    const vdir = path.join(flow, "studio/social-story/baseline");
    // Önceki koşudan kalan bekleyen liste: sızıntıdan sonra hiçbir alt-ajana verilmemeli.
    expect(readPending((await runEval({ ...ssBase(flow), variant: "baseline" })).pendingPath)).toHaveLength(1);
    rmSync(path.join(vdir, "exchange"), { recursive: true });

    vi.spyOn(socialStory, "invoke").mockImplementation(async () => {
      try {
        await createMessage({ model: "claude-sonnet-4-6", max_tokens: 100, system: "Sistem", messages: [{ role: "user", content: "Elanın tablet hikâyesi" }] });
      } catch {
        // route hatayı yutar
      }
      return { status: 500, body: null };
    });
    await expect(runEval({ ...ssBase(flow), variant: "baseline" })).rejects.toThrow(/GERÇEK AD İSTEKTE/);
    expect(readPending(path.join(vdir, "pending.json"))).toEqual([]);
    const err = rows(path.join(vdir, "errors.jsonl"))[0]!;
    expect(err.failure_class).toBe("pii_leak");
    expect(String(err.error)).toContain("Elanın");
    expect(String(err.error)).toContain("kaynak: shim");
    expect(existsSync(path.join(vdir, "exchange")) ? readdirSync(path.join(vdir, "exchange")) : []).toEqual([]);
  }, 120_000);

  it("api arka ucu (taklit istemci): kesilen aday kullanılabilir referansa kaybeder ve ok olarak donmaz", async () => {
    const { runEval } = await import("./lib/runner");
    const flow = tempFlow();
    const prevKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-sahte"; // istemci kurulur ama hiç çağrılmaz (aşağıda taklit edilir)
    onTestFinished(() => {
      if (prevKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = prevKey;
    });
    let stop = "end_turn";
    const message = () => ({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-6",
      content: [{ type: "text", text: story(REF_NOTES) }],
      stop_reason: stop,
      stop_sequence: null,
      usage: { input_tokens: 1000, output_tokens: 1000 },
    });
    // Route'u atlayıp çıktıyı yine de döndüren araç: kesilmiş yanıtın "ok" sayılmamasını koşturucu sağlamalı.
    vi.spyOn(socialStory, "invoke").mockImplementation(async () => {
      runtime.client = { messages: { create: async () => message() }, beta: { messages: { create: async () => message() } } } as never;
      const res = await createMessage({ model: "claude-sonnet-4-6", max_tokens: 100, system: "Sistem", messages: [{ role: "user", content: "- Ad: Selin" }] });
      const first = res.content[0];
      const text = first?.type === "text" ? first.text : "";
      return { status: 200, body: { story: JSON.parse(text) as unknown } };
    });
    const api = { ...ssBase(flow), backend: "api" as const };
    let s = await runEval({ ...api, variant: "baseline" });
    expect(s).toMatchObject({ done: 1, failed: 0 });

    stop = "max_tokens";
    s = await runEval({ ...api, variant: "v1" });
    expect(s).toMatchObject({ done: 1, failed: 0 });
    const r = rows(s.resultsPath)[0]!;
    expect(r.status).toBe("truncated");
    expect(r.grade).toMatchObject({ win: 0, format_ok: 0 });
    expect(r.cost_usd).toBeGreaterThan(0);
    expect(JSON.parse(readFileSync(path.join(flow, "studio/social-story/v1/ref/ss-01"), "utf8"))).toMatchObject({ ok: false });
    expect(process.env.ANTHROPIC_API_KEY).toBe("sk-ant-test-sahte"); // yer tutucu gerçek anahtarı ezmez
  }, 120_000);

  it("BEP: Atölye route'u shim'den geçer, istekte gerçek ad yok, Markdown çıktı değerlendirilir", async () => {
    const { runEval } = await import("./lib/runner");
    const { TASLAK_NOTU } = await import("@atolye/lib/bep");
    const { adapter: bep } = await import("./tools/atolye/bep/adapter");
    const bep02 = caseById(bep.dir, "bep-02") as CaseDef<{ mebHedefKod: string }>;
    const real = (resolveFixture("atolye", bep02.student) as AtolyeFixture).code; // "Arda Yılmaz"
    const alias = pickAlias(real, { scope: "eval-uzman" }); // taklit oturumun uzman kimliği = rumuz kapsamı
    const flow = tempFlow();
    const base = { tool: "atolye/bep", backend: "subagent" as const, flowDir: flow, cases: ["bep-02"], timeoutS: 30 };
    let s = await runEval({ ...base, variant: "baseline" });
    const pending = readPending(s.pendingPath);
    const md = readFileSync(pending[0]!.requestMd, "utf8");
    expect(md).toContain(bep02.body.mebHedefKod); // vakanın MEB kodu isteğe girdi
    expect(md).toContain(alias);
    writeFileSync(
      pending[0]!.responseTxt,
      `## Okuma (disleksi odağı)\n\n### Uzun dönem amaç\n${alias} dönem sonunda hece ve sözcük içinde tanıtılan sesleri okur.\n\n### Kısa dönem hedefler\n- Tanıtılan 5 sesi hece içinde 8/10 doğrulukla okur (3.2.5).\n\n### Yöntem/teknikler\n- Futbol temalı hece kartları.\n\n### Ölçme-değerlendirme\n- Haftalık hece okuma örneği.\n\n## Aile/okul iş birliği\nEvde 5 dk.\n\n⚠️ ${TASLAK_NOTU}`,
    );
    s = await runEval({ ...base, variant: "baseline" });
    expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
    expect(readPending(s.pendingPath)).toEqual([]);
    const r = rows(s.resultsPath)[0]!;
    expect(r.hard_fail).toEqual([]);
    expect(r.meta).toMatchObject({ alias_found: true });
    expect((r.meta as { checks: { meb_kod: number } }).checks.meb_kod).toBe(1);
    const out = JSON.parse(readFileSync(path.join(flow, "atolye/bep/baseline/out/bep-02_rep0.json"), "utf8")) as { output: string };
    expect(out.output).toContain(real); // çıktıda rumuz → gerçek ad geri konmuş
    expect(out.output).not.toContain(alias);
  }, 120_000);

  it("EVAL_TAG + EVAL_REF=baseline@r2: tur kendi dizininde koşar, v1@r2 yeni tabana karşı ölçülür", async () => {
    const { runEval } = await import("./lib/runner");
    const flow = tempFlow();
    await runBaseline(flow, story("ESKI-TABAN tren kartı."));
    const r2 = { ...ssBase(flow), tag: "r2", refVariant: "baseline@r2" };
    let s = await runEval({ ...r2, variant: "baseline" });
    expect(s.arm).toBe("baseline@r2");
    writeFileSync(readPending(s.pendingPath)[0]!.responseTxt, story("YENI-TABAN kum saati."));
    s = await runEval({ ...r2, variant: "baseline" });
    expect(rows(s.resultsPath)[0]!.grade).toMatchObject({ win: 0.5 }); // kol = referans → nötr
    s = await runEval({ ...r2, variant: "v1" });
    writeFileSync(readPending(s.pendingPath)[0]!.responseTxt, story(CAND_NOTES));
    s = await runEval({ ...r2, variant: "v1" });
    // Hakem isteği yeni turun tabanını taşır; eski turun tabanını değil.
    const user = block(readFileSync(readPending(s.pendingPath)[0]!.requestMd, "utf8"), "user");
    expect(user).toContain("YENI-TABAN");
    expect(user).not.toContain("ESKI-TABAN");
    expect(existsSync(path.join(flow, "studio/social-story/v1@r2/exchange"))).toBe(true);
  }, 120_000);

  it("ikinci ağ: shim'i atlayıp diske yazılmış sızıntılı istek alt-ajana verilmez", async () => {
    const { runEval } = await import("./lib/runner");
    const flow = tempFlow();
    vi.spyOn(socialStory, "invoke").mockImplementation(async () => {
      const st = als.getStore()!;
      writeRequest(st.exchangeDir, { key: "ss-01_rep0", role: "gen", agentModel: "sonnet", model: "m", system: "s", user: "Elanın tablet hikâyesi", max_tokens: 100 });
      st.pending.push("ss-01_rep0.gen");
      return { status: 500, body: null };
    });
    await expect(runEval({ ...ssBase(flow), variant: "baseline" })).rejects.toThrow(/GERÇEK AD İSTEKTE/);
    const ex = path.join(flow, "studio/social-story/baseline/exchange");
    expect(readdirSync(ex).sort()).toEqual(["ss-01_rep0.gen.request.pii-blocked.json", "ss-01_rep0.gen.request.pii-blocked.md"]);
    expect(String(rows(path.join(flow, "studio/social-story/baseline/errors.jsonl"))[0]!.error)).toContain("request.md");
  }, 120_000);

  it("üçüncü ağ: shim'in taramadığı alandaki ad (metadata) da koşuyu durdurur", async () => {
    const { runEval } = await import("./lib/runner");
    const flow = tempFlow();
    vi.spyOn(socialStory, "invoke").mockImplementation(async () => {
      const st = als.getStore()!;
      const text = story(REF_NOTES);
      st.calls.push({
        request: { model: "m", system: "s", messages: [{ role: "user", content: "- Ad: Selin" }], metadata: { not: "Ela Şahin" } },
        response: { id: "x", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } as never,
        latency_s: 0,
        backend: "subagent",
      });
      return { status: 200, body: { story: JSON.parse(text) as unknown } };
    });
    await expect(runEval({ ...ssBase(flow), variant: "baseline" })).rejects.toThrow(/kaynak: call\.request/);
  }, 120_000);

  it("rumuz okunamazsa (prompt biçimi değişti) görev harness_error ile düşer", async () => {
    const { runEval } = await import("./lib/runner");
    const flow = tempFlow();
    vi.spyOn(socialStory, "invoke").mockImplementation(async () => {
      const st = als.getStore()!;
      const text = story(REF_NOTES);
      st.calls.push({
        request: { model: "m", system: "s", messages: [{ role: "user", content: "Öğrencinin rumuzu: Selin" }] },
        response: { id: "x", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } as never,
        latency_s: 0,
        backend: "subagent",
      });
      return { status: 200, body: { story: JSON.parse(text) as unknown } };
    });
    const s = await runEval({ ...ssBase(flow), variant: "baseline" });
    expect(s).toMatchObject({ done: 0, failed: 1 });
    const err = rows(path.join(flow, "studio/social-story/baseline/errors.jsonl"))[0]!;
    expect(err).toMatchObject({ failure_class: "harness_error" });
    expect(String(err.error)).toContain("rumuz bulunamadı");
  }, 120_000);
});
