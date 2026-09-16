import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Artikülasyon — bağlam düzeyi paragraf sözleşmesi.
 *
 * Arayüz bağlam düzeyini "paragraf düzeyinde" diye sunuyor ve sistem promptu "3-4 cümlelik
 * paragraf" kuralını içeriyordu; ama `sentence` alanının tek somut örneği TEK cümleydi ve bağlam
 * düzeyine özgü ne bir örnek ne bir talimat vardı. Model örneği izledi: canlıdaki bağlam
 * kartlarının hepsi ve 2026-09 model değerlendirmesindeki 6/6 Sonnet 4.6 üretimi öğe başına tek
 * cümle döndürdü. Hece ve izole düzeyin kendi items[] örneği, kelime düzeyinin kendi talimatı
 * olduğu için o düzeyler doğru biçimde çıkıyordu.
 *
 * Model çıktısı birim testte ölçülemez; burada kilitlenen şey modele giden sözleşmedir.
 * Davranışın kendisi `evals/articulation` düzeneğiyle ölçülür.
 */

type ToolConfig = {
  systemPrompt: string;
  maxTokens?: number;
  buildUserPrompt: (
    data: Record<string, unknown>,
    student: null,
    ageText: string,
    ctx: { therapistId: string; scrubText: (t: string | null | undefined) => string },
  ) => string | Promise<string>;
};

const captured = vi.hoisted(() => ({ config: null as ToolConfig | null }));

vi.mock("@studio/lib/toolHandler", () => ({
  createToolHandler: (config: ToolConfig) => {
    captured.config = config;
    return async () => new Response(null);
  },
}));
vi.mock("@studio/lib/generateWordImage", () => ({ lookupCachedWordImage: async () => null }));

beforeAll(async () => {
  await import("@/app/studio/api/tools/articulation/route");
});

const ctx = { therapistId: "t1", scrubText: (t: string | null | undefined) => t ?? "" };

function userPrompt(level: string) {
  return captured.config!.buildUserPrompt(
    { targetSounds: ["/ş/"], positions: ["initial", "medial"], level, itemCount: 10 },
    null,
    "",
    ctx,
  );
}

describe("artikülasyon — bağlam düzeyi", () => {
  it("modelden her kelime için 3-4 cümlelik paragraf ister", async () => {
    expect(await userPrompt("contextual")).toMatch(/"sentence"[^\n]*3-4 cümlelik paragraf/);
  });

  it("sistem promptunda bağlam düzeyine özgü, 3-4 cümlelik bir items[] örneği vardır", () => {
    const block = captured.config!.systemPrompt.split("Bağlam düzeyi (contextual) için items[] örneği:")[1];
    expect(block, "bağlam düzeyi örneği bulunamadı").toBeDefined();
    const json = block!.slice(block!.indexOf("["), block!.indexOf("]") + 1);
    const [example] = JSON.parse(json) as Array<{ word: string; sentence: string }>;
    const sentences = example!.sentence.split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(sentences.length).toBeGreaterThanOrEqual(3);
    expect(sentences.length).toBeLessThanOrEqual(4);
    expect(example!.sentence.toLocaleLowerCase("tr-TR")).toContain(example!.word);
  });

  it("token tavanı 30 öğelik bağlam düzeyini kesmeden alacak kadar geniş", () => {
    // Ölçüm (2026-09-16, Sonnet 4.6, paragraflı bağlam düzeyi): öğe başına ~150-165 çıktı token'ı.
    // 30 öğe bir tekrarda 5.015 token tuttu, diğerinde 5.500 tavanında KESİLDİ → JSON bozuk,
    // uzman hata görür, API bedeli yine ödenir.
    expect(captured.config!.maxTokens).toBeGreaterThanOrEqual(7500);
  });

  it("cümle düzeyinde paragraf istemez", async () => {
    expect(await userPrompt("sentence")).not.toMatch(/cümlelik paragraf/);
  });
});
