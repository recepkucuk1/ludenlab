// apps/hub/src/modules/studio/lib/assistant/run.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("@studio/lib/db", () => ({ prisma: {} }));
vi.mock("@studio/lib/anthropic", () => ({ anthropic: { messages: { create } }, MODEL: "test-model" }));
vi.mock("@studio/lib/usage", () => ({ logUsage: vi.fn() }));
vi.mock("@studio/lib/studentContext", async (importOriginal) => {
  const m = await importOriginal<typeof import("@studio/lib/studentContext")>();
  return { ...m, loadStudentContext: vi.fn().mockResolvedValue("Öğrenci: Nisa, 6 yaş") };
});

const { runAssistant } = await import("./run");
const { loadStudentContext } = await import("@studio/lib/studentContext");

const prismaTaklit = () => ({
  curriculum: { findMany: vi.fn().mockResolvedValue([{ goals: [{ id: "g1", code: "3.1", title: "Kelime başı /r/" }] }]) },
  studentProgress: { findMany: vi.fn().mockResolvedValue([{ goalId: "g1", status: "in_progress" }]) },
});

const ogrenci = { id: "s1", name: "Ela Şahin", llmAlias: "Nisa", therapistId: "t1", curriculumIds: ["c1"], aiProfile: "## x" };

// Gövde süslü parantezli: dönen fonksiyonu vitest teardown sayar (mock'u test sonrası çağırırdı).
beforeEach(() => {
  create.mockReset();
});

describe("runAssistant", () => {
  it("prompt'a rumuzlu gözlem gider, öneriler doğrulanıp gerçek adla döner", async () => {
    create.mockResolvedValue({
      content: [{ type: "text", text: '{"suggestions":[{"kind":"goal_status","goalId":"g1","status":"completed","reason":"Nisa %90 başardı"}]}' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });
    const out = await runAssistant(prismaTaklit() as never, { student: ogrenci, therapistId: "t1", observation: "Ela Şahin bugün %90 başardı" });
    const istek = create.mock.calls[0][0] as { messages: { content: string }[] };
    expect(istek.messages[0].content).toContain("Nisa bugün %90 başardı");
    expect(istek.messages[0].content).not.toMatch(/Ela/);
    expect(out.suggestions).toEqual([{ kind: "goal_status", goalId: "g1", status: "completed", reason: "Ela Şahin %90 başardı" }]);
    expect(out.warning).toBeUndefined();
  });

  it("generate_tool params rumuzlu kalır (URL'ye gider), reason gerçek ada döner; mastered → completed sayılır", async () => {
    const p = prismaTaklit();
    p.studentProgress.findMany.mockResolvedValue([{ goalId: "g1", status: "mastered" }]);
    create.mockResolvedValue({
      content: [{ type: "text", text: '{"suggestions":[{"kind":"generate_tool","tool":"homework","params":{"targetArea":"Nisa için artikülasyon","duration":"15","parentLevel":"basic","materialType":"exercise","extraNote":"Nisa oyunla"},"reason":"Nisa oyunla daha iyi"},{"kind":"goal_status","goalId":"g1","status":"completed","reason":"x"}]}' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    const out = await runAssistant(p as never, { student: ogrenci, therapistId: "t1", observation: "x" });
    expect(out.suggestions).toHaveLength(1);
    expect(out.suggestions[0]).toMatchObject({ kind: "generate_tool", reason: "Ela Şahin oyunla daha iyi", params: { targetArea: "Nisa için artikülasyon", extraNote: "Nisa oyunla" } });
  });

  it("o anki gözlemin id'si bağlam yükleyicisine dışlama olarak geçer (gözlem iki kez gitmez)", async () => {
    create.mockResolvedValue({ content: [{ type: "text", text: '{"suggestions":[]}' }], usage: { input_tokens: 1, output_tokens: 1 } });
    await runAssistant(prismaTaklit() as never, { student: ogrenci, therapistId: "t1", observation: "x", observationId: "o1" });
    expect(loadStudentContext).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ excludeObservationId: "o1" }));
  });

  it("model patlarsa boş öneri + uyarı; fırlatmaz", async () => {
    create.mockRejectedValue(new Error("api"));
    const out = await runAssistant(prismaTaklit() as never, { student: ogrenci, therapistId: "t1", observation: "x" });
    expect(out.suggestions).toEqual([]);
    expect(out.warning).toBe("Öneri üretilemedi");
  });

  it("bozuk JSON → boş öneri + uyarı", async () => {
    create.mockResolvedValue({ content: [{ type: "text", text: "elimde yok" }], usage: { input_tokens: 1, output_tokens: 1 } });
    const out = await runAssistant(prismaTaklit() as never, { student: ogrenci, therapistId: "t1", observation: "x" });
    expect(out.suggestions).toEqual([]);
    expect(out.warning).toBe("Öneri üretilemedi");
  });

  it("hedef sorgusu patlarsa goal_status üretilmez ama çağrı sürer", async () => {
    const p = prismaTaklit();
    p.curriculum.findMany.mockRejectedValue(new Error("db"));
    create.mockResolvedValue({ content: [{ type: "text", text: '{"suggestions":[{"kind":"goal_status","goalId":"g1","status":"completed","reason":"x"}]}' }], usage: { input_tokens: 1, output_tokens: 1 } });
    const out = await runAssistant(p as never, { student: ogrenci, therapistId: "t1", observation: "x" });
    expect(out.suggestions).toEqual([]);
    expect(out.warning).toBeUndefined();
  });
});
