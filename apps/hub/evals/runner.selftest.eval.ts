// apps/hub/evals/runner.selftest.eval.ts
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

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

type Pending = Array<{ key: string; role: string; agentModel: string; requestMd: string; responseTxt: string }>;
const readPending = (p: string) => JSON.parse(readFileSync(p, "utf8")) as Pending;
const rows = (p: string) => readFileSync(p, "utf8").trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);

describe("koşturucu (subagent arka ucu, sosyal hikâye)", () => {
  it("taban → bekle → yanıt → sonuç + referans; v1 → üretim → hakem → win", async () => {
    const { runEval } = await import("./lib/runner");
    const flow = mkdtempSync(path.join(tmpdir(), "flow-"));
    const base = { tool: "studio/social-story", backend: "subagent" as const, flowDir: flow, cases: ["ss-01"] };

    // 1. geçiş: taban, yanıt yok → bekliyor
    let s = await runEval({ ...base, variant: "baseline" });
    expect(s).toMatchObject({ done: 0, failed: 0, pending: 1 });
    let pending = readPending(s.pendingPath);
    expect(pending[0]).toMatchObject({ key: "ss-01_rep0", role: "gen", agentModel: "sonnet" });
    const md = readFileSync(pending[0]!.requestMd, "utf8");
    expect(md).toContain("<system>");
    expect(md).toContain("Sosyal hikaye parametreleri");
    expect(md).not.toMatch(/(?<!\p{L})Ela(?!\p{L})/u); // gerçek ad istekte YOK (rumuz kapısı)
    expect(existsSync(path.join(flow, "studio/social-story/baseline/ref/ss-01"))).toBe(false);

    // 2. geçiş: alt-ajan rolünde yanıtı yaz → sonuç satırı + donmuş referans
    writeFileSync(pending[0]!.responseTxt, story("Son beş dakika uyarısını tren kartıyla eşleyin; kulak kapama görülürse sesi kısın."));
    s = await runEval({ ...base, variant: "baseline" });
    expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
    const r0 = rows(s.resultsPath)[0]!;
    expect(r0.grade).toMatchObject({ format_ok: 1, win: 0.5, dil_kurali: 1, rumuz_yok: 1 });
    expect(r0.hard_fail).toEqual([]);
    expect(r0.backend).toBe("subagent");
    expect(r0.usage_estimated).toBe(true);
    const ref = JSON.parse(readFileSync(path.join(flow, "studio/social-story/baseline/ref/ss-01"), "utf8")) as { ok: boolean; output: { title: string } };
    expect(ref.ok).toBe(true);
    expect(ref.output.title).toBe("Tabletten ayrılma zamanı");

    // 3. v1: üretim bekliyor → yaz → hakem bekliyor
    s = await runEval({ ...base, variant: "v1" });
    expect(s.pending).toBe(1);
    pending = readPending(s.pendingPath);
    expect(pending[0]!.role).toBe("gen");
    writeFileSync(pending[0]!.responseTxt, story("Sabırlı olun ve olumlu pekiştirme yapın."));
    s = await runEval({ ...base, variant: "v1" });
    expect(s.pending).toBe(1);
    pending = readPending(s.pendingPath);
    expect(pending[0]).toMatchObject({ role: "judge", agentModel: "opus" });
    expect(pending[0]!.key).toMatch(/^ss-01_rep0\.judge-(ab|ba)$/);
    const judgeMd = readFileSync(pending[0]!.requestMd, "utf8");
    expect(judgeMd).toContain("<output_schema>");
    expect(judgeMd).toContain("<aday_A>");

    // 4. hakem yanıtı: adayın bulunduğu taraf kaybetsin → win 0
    const candSide = pending[0]!.key.endsWith("judge-ab") ? "A" : "B";
    const refSide = candSide === "A" ? "B" : "A";
    const criteria = ["ozgulluk", "klinik_derinlik", "bicim_butce", "dil_etik", "gray_oranlari", "gorsel_uyum"];
    writeFileSync(
      pending[0]!.responseTxt,
      JSON.stringify({
        criteria: Object.fromEntries(criteria.map((k) => [k, { winner: refSide, note: "n" }])),
        critical_errors: { [candSide]: ["uzman notu jenerik"], [refSide]: [] },
        overall: refSide,
        reason: "Referans daha özgül.",
      }),
    );
    s = await runEval({ ...base, variant: "v1" });
    expect(s).toMatchObject({ done: 1, pending: 0 });
    const r1 = rows(s.resultsPath)[0]!;
    expect((r1.grade as { win: number }).win).toBe(0);
    expect((r1.meta as { cand_errors: string[] }).cand_errors).toEqual(["uzman notu jenerik"]);
    expect(((r1.grade as { yasak_kalip: number }).yasak_kalip)).toBeLessThan(1);

    // 5. yeniden koşu: tamamlanan vaka atlanır, satır eklenmez
    s = await runEval({ ...base, variant: "v1" });
    expect(rows(s.resultsPath)).toHaveLength(1);
  }, 120_000);

  it("BEP: Atölye route'u shim'den geçer, istekte gerçek ad yok, Markdown çıktı değerlendirilir", async () => {
    const { runEval } = await import("./lib/runner");
    const { TASLAK_NOTU } = await import("@atolye/lib/bep");
    const flow = mkdtempSync(path.join(tmpdir(), "flow-"));
    const base = { tool: "atolye/bep", backend: "subagent" as const, flowDir: flow, cases: ["bep-02"] };
    let s = await runEval({ ...base, variant: "baseline" });
    const pending = readPending(s.pendingPath);
    const md = readFileSync(pending[0]!.requestMd, "utf8");
    expect(md).toContain("MEB HEDEF HİZALAMASI");
    expect(md).toContain("3.2.5");
    expect(md).not.toMatch(/(?<!\p{L})Arda(?!\p{L})/u);
    const alias = /- Öğrenci: ([^\n]+)/.exec(md)![1]!.trim(); // prompt'taki rumuz
    writeFileSync(
      pending[0]!.responseTxt,
      `## Okuma (disleksi odağı)\n\n### Uzun dönem amaç\n${alias} dönem sonunda hece ve sözcük içinde tanıtılan sesleri okur.\n\n### Kısa dönem hedefler\n- Tanıtılan 5 sesi hece içinde 8/10 doğrulukla okur (3.2.5).\n\n### Yöntem/teknikler\n- Futbol temalı hece kartları.\n\n### Ölçme-değerlendirme\n- Haftalık hece okuma örneği.\n\n## Aile/okul iş birliği\nEvde 5 dk.\n\n⚠️ ${TASLAK_NOTU}`,
    );
    s = await runEval({ ...base, variant: "baseline" });
    expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
    const r = rows(s.resultsPath)[0]!;
    expect(r.hard_fail).toEqual([]);
    expect((r.meta as { checks: { meb_kod: number } }).checks.meb_kod).toBe(1);
    const out = JSON.parse(readFileSync(path.join(flow, "atolye/bep/baseline/out/bep-02_rep0.json"), "utf8")) as { output: string };
    expect(out.output).toContain("Arda Yılmaz"); // çıktıda rumuz → gerçek ad geri konmuş
    expect(out.output).not.toContain(alias);
  }, 120_000);
});
