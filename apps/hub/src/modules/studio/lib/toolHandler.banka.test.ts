import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { articulation } from "@ludenlab/ai";

/**
 * Ortak araç kapısı (`createToolHandler`) — gövde/rumuz/kredi/AI/kayıt akışı.
 *
 * 1) Token tavanında kesilen yanıt: model `max_tokens`e çarptığında çıktı YARIM kalır.
 *    Eskiden bu durum ayrıştırma hatasına düşüp "Bir hata oluştu" diye dönüyordu: uzman
 *    nedenini, biz de hangi aracın tavana çarptığını göremiyorduk (haftalık plan 2026-07-30'da
 *    5 denemenin 5'inde bu yüzden boş döndü, API bedeli yine ödendi). Artık `stop_reason`
 *    belirleyici: kesilen yanıt, JSON'u tesadüfen ayrışsa bile kaydedilmez.
 *
 * 2) Prompt → zenginleştirme taşıması: artikülasyon ve sesletim, kelimeleri uzman-onaylı
 *    bankadan `buildUserPrompt` sırasında seçer ve `enrichContent` bunları modelin öğelerine
 *    OTORİTER yazar. Bu seçim eskiden `data` nesnesine gizlice iliştiriliyordu; oysa öğrenci
 *    seçiliyken `buildUserPrompt` rumuzlanmış DERİN KOPYAYI alır, `enrichContent` ise ham
 *    `data`yı — seçim yolda kayboluyordu (2026-10: öğrencili kelime düzeyi 0 öğe döndü,
 *    çünkü prompt modele "öğeleri sistem ekleyecek" demişti). Taşıma artık `ctx.stash` ile
 *    açık: aynı nesne her iki kancaya ulaşır.
 */
const create = vi.fn();
const cardCreate = vi.fn();
const refundCredits = vi.fn();
const studentFindFirst = vi.fn();

vi.mock("@studio/auth", () => ({ auth: async () => ({ user: { id: "uzman-1" } }) }));
vi.mock("@/generated/studio/client", () => ({ ToolType: {} }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: () => ({ allowed: true, retryAfter: 0 }),
  rateLimitResponse: () => new Response(null, { status: 429 }),
}));
vi.mock("@studio/lib/usage", () => ({ logUsage: () => {} }));
vi.mock("@studio/lib/credits", () => ({ reserveCredits: async () => true, refundCredits }));
vi.mock("@studio/lib/db", () => ({
  prisma: {
    $transaction: (cb: (tx: unknown) => unknown) => cb({ card: { create: cardCreate } }),
    student: { findFirst: studentFindFirst },
  },
}));
vi.mock("@studio/lib/anthropic", () => ({ anthropic: { messages: { create } }, MODEL: "claude-sonnet-4-6" }));
// Rotaların görsel-önbellek araması DB'ye gider; görsel bu testlerin konusu değil.
vi.mock("@studio/lib/generateWordImage", () => ({ lookupCachedWordImage: async () => null }));

const { createToolHandler } = await import("./toolHandler");
const { POST: articulationPOST } = await import("@/app/studio/api/tools/articulation/route");
const { POST: phonationPOST } = await import("@/app/studio/api/tools/phonation/route");

type Item = { word: string; sentence?: string; position?: string; targetSound?: string; syllableBreak?: string };
type Cell = { word: string; hasTargetSound?: boolean };
type Result = {
  type: string;
  status: number;
  body: {
    error?: string;
    drill?: { items: Item[] };
    activity?: { grid?: { cells: Cell[] } };
  };
};

const POST = createToolHandler({
  rateLimitKey: "deneme",
  bodySchema: z.object({}),
  cost: 1,
  systemPrompt: "sistem",
  toolType: "WEEKLY_PLAN" as never,
  category: "speech",
  creditDescription: "Deneme üretimi",
  responseKey: "plan",
  maxTokens: 6000,
  studentRequired: false,
  buildUserPrompt: () => "istek",
});

async function post(
  handler: ReturnType<typeof createToolHandler>,
  body: unknown,
  modelText: string,
  stopReason = "end_turn",
): Promise<Result> {
  create.mockResolvedValue({
    stop_reason: stopReason,
    content: [{ type: "text", text: modelText }],
    usage: { input_tokens: 900, output_tokens: 600 },
  });
  const res = await handler(
    new Request("http://test.local/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
  const events = (await res.text())
    .split("\n\n")
    .map((c) => c.trim())
    .filter((c) => c.startsWith("data: "))
    .map((c) => JSON.parse(c.slice(6)) as Result);
  return events.find((e) => e.type === "result")!;
}

/** Modele giden kullanıcı istemi (son çağrı). */
function sentPrompt(): string {
  const req = create.mock.calls.at(-1)?.[0] as { messages: Array<{ content: string }> };
  return req.messages[0]!.content;
}

/** Bankadaki /harf/ kelimeleri — verilen pozisyonlarda. */
function bankWords(letter: string, positions: articulation.Position[]): Set<string> {
  const bank = articulation.WORD_BANK[letter];
  return new Set(positions.flatMap((p) => (bank?.[p] ?? []).map((w) => w.word)));
}

/** Rumuz hazır (DB'ye yazmaya gerek yok); prompt'a "Kerem", çıktıya "Eymen" gider. */
const OGRENCI = {
  id: "ogr-1",
  name: "Eymen",
  birthDate: new Date("2019-05-01"),
  workArea: "speech",
  diagnosis: null,
  llmAlias: "Kerem",
};

beforeEach(() => {
  create.mockReset();
  cardCreate.mockReset();
  cardCreate.mockResolvedValue({ id: "kart-1" });
  refundCredits.mockReset();
  studentFindFirst.mockReset();
  studentFindFirst.mockResolvedValue(null);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("araç kapısı — token tavanı", () => {
  const generate = (stopReason: string, text: string) => post(POST, {}, text, stopReason);

  it("tamamlanan yanıt kaydedilir (kontrol)", async () => {
    const r = await generate("end_turn", '{"title":"Plan","days":[]}');

    expect(r.status).toBe(200);
    expect(cardCreate).toHaveBeenCalledTimes(1);
    expect(refundCredits).not.toHaveBeenCalled();
  });

  it("tavanda kesilen yanıt kaydedilmez, hak iade edilir ve neden söylenir", async () => {
    const r = await generate("max_tokens", '{"title":"Plan","days":[{"focusArea":"Artikül');

    expect(r.status).not.toBe(200);
    expect(r.body.error).toMatch(/uzunluk sınırını aştı/);
    expect(cardCreate).not.toHaveBeenCalled();
    expect(refundCredits).toHaveBeenCalledTimes(1);
  });

  it("tavanda kesilen yanıtın JSON'u tesadüfen ayrışsa bile kaydedilmez", async () => {
    const r = await generate("max_tokens", '{"title":"Plan","days":[]}\n\nNot: Bu plan');

    expect(r.status).not.toBe(200);
    expect(cardCreate).not.toHaveBeenCalled();
    expect(refundCredits).toHaveBeenCalledTimes(1);
  });
});

describe("araç kapısı — banka seçimi prompt'tan zenginleştirmeye taşınır", () => {
  // Model, kelime düzeyinde istendiği gibi items[] boş bırakır; öğeleri sistem bankadan yazar.
  const WORD_LEVEL_OUTPUT =
    '{"title":"S Sesi","targetSounds":["/s/"],"positions":["initial"],"level":"word","items":[],"expertNotes":"n","cueTypes":[],"homeGuidance":"h"}';

  it("öğrenci SEÇİLİYKEN kelime düzeyi öğeleri bankadan gelir", async () => {
    studentFindFirst.mockResolvedValue(OGRENCI);

    const r = await post(
      articulationPOST,
      { studentId: "ogr-1", targetSounds: ["/s/"], positions: ["initial"], level: "word", itemCount: 10 },
      WORD_LEVEL_OUTPUT,
    );

    expect(r.status).toBe(200);
    // Modele giden sözleşme: öğeleri sistem ekleyecek. Prompt rumuzlu, gerçek ad yok.
    expect(sentPrompt()).toContain("sistem items'a ekler");
    expect(sentPrompt()).toContain("Kerem");
    expect(sentPrompt()).not.toContain("Eymen");

    const items = r.body.drill!.items;
    const sBasta = bankWords("s", ["initial"]);
    expect(items).toHaveLength(10);
    for (const it of items) {
      expect(sBasta.has(it.word), `banka dışı kelime: ${it.word}`).toBe(true);
      expect(it.position).toBe("initial");
      expect(it.targetSound).toBe("/s/");
      expect(it.syllableBreak).toBeTruthy();
    }
    // Kaydedilen kart da aynı öğeleri taşır (yanıt ile kart ayrışmasın).
    const saved = cardCreate.mock.calls[0]![0] as { data: { content: { items: Item[] } } };
    expect(saved.data.content.items).toHaveLength(10);
  });

  it("öğrenci seçili değilken de aynı (kontrol)", async () => {
    const r = await post(
      articulationPOST,
      { targetSounds: ["/s/"], positions: ["initial"], level: "word", itemCount: 10 },
      WORD_LEVEL_OUTPUT,
    );

    expect(r.status).toBe(200);
    const sBasta = bankWords("s", ["initial"]);
    expect(r.body.drill!.items).toHaveLength(10);
    for (const it of r.body.drill!.items) expect(sBasta.has(it.word), `banka dışı kelime: ${it.word}`).toBe(true);
  });

  it("öğrenci SEÇİLİYKEN cümle düzeyinde kelime bankadan, cümle modelden gelir", async () => {
    studentFindFirst.mockResolvedValue(OGRENCI);
    const modelItems = [1, 2, 3, 4, 5].map((i) => ({
      word: `uydurma${i}`,
      syllableCount: 3,
      syllableBreak: `uy-dur-ma${i}`,
      position: "initial",
      targetSound: "/s/",
      sentence: `${i}. cümle burada.`,
      visualPrompt: "",
    }));

    const r = await post(
      articulationPOST,
      { studentId: "ogr-1", targetSounds: ["/s/"], positions: ["initial", "medial"], level: "sentence", itemCount: 5 },
      JSON.stringify({ title: "S", targetSounds: ["/s/"], positions: ["initial", "medial"], level: "sentence", items: modelItems }),
    );

    expect(r.status).toBe(200);
    expect(sentPrompt()).toContain("Banka kelimeleri");

    const items = r.body.drill!.items;
    const sKelimeleri = bankWords("s", ["initial", "medial"]);
    expect(items).toHaveLength(5);
    items.forEach((it, i) => {
      expect(sKelimeleri.has(it.word), `banka dışı kelime: ${it.word}`).toBe(true);
      expect(it.sentence).toBe(modelItems[i]!.sentence);
    });
  });

  it("öğrenci SEÇİLİYKEN sesletim tombalasının hücreleri bankadan gelir", async () => {
    studentFindFirst.mockResolvedValue(OGRENCI);
    const cells = Array.from({ length: 9 }, (_, i) => ({
      position: i + 1,
      word: `geçici${i + 1}`,
      hasTargetSound: true,
      isLadder: false,
      isSnake: false,
      instruction: null,
      visualPrompt: "",
    }));

    const r = await post(
      phonationPOST,
      { studentId: "ogr-1", targetSounds: ["/s/"], activityType: "bingo", difficulty: "easy", itemCount: 9 },
      JSON.stringify({
        title: "Tombala",
        activityType: "bingo",
        targetSounds: ["/s/"],
        difficulty: "easy",
        theme: null,
        grid: { rows: 3, cols: 3, cells },
        scene: null,
        objects: [],
        instructions: "i",
        expertNotes: "e",
        adaptations: "a",
      }),
    );

    expect(r.status).toBe(200);
    expect(sentPrompt()).toContain("uzman-onaylı bankadan otomatik yazılacak");

    const out = r.body.activity!.grid!.cells;
    const sKelimeleri = bankWords("s", ["initial", "medial", "final"]);
    expect(out).toHaveLength(9);
    for (const c of out) {
      expect(sKelimeleri.has(c.word), `banka dışı kelime: ${c.word}`).toBe(true);
      expect(c.hasTargetSound).toBe(true);
    }
  });
});
