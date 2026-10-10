import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

/**
 * Ortak araç kapısı — iki sözleşme:
 *
 * 1) Token tavanında kesilen yanıt. Model `max_tokens`e çarptığında çıktı YARIM kalır. Eskiden
 *    bu durum ayrıştırma hatasına düşüp "Bir hata oluştu" diye dönüyordu: uzman nedenini, biz de
 *    hangi aracın tavana çarptığını göremiyorduk (haftalık plan 2026-07-30'da 5 denemenin 5'inde
 *    bu yüzden boş döndü, API bedeli yine ödendi). Artık `stop_reason` belirleyici: kesilen yanıt,
 *    JSON'u tesadüfen ayrışsa bile kaydedilmez.
 *
 * 2) Öğrenci bağlam bloğu (spec A2). Kapı, öğrenci seçiliyse ortak bloğu BİR KEZ kurar ve her
 *    aracın `buildUserPrompt`'una `ctx.studentBlock` olarak verir; araçlar kendi sorgularını
 *    yapmaz. Blok rumuzludur, kredi rezervasyonundan ÖNCE yüklenir (bağlam hatası krediyi
 *    tüketmez) ve yükleyici patlasa bile üretim sürer.
 */
const create = vi.fn();
const cardCreate = vi.fn();
const refundCredits = vi.fn();
const reserveCredits = vi.fn(async () => true);
const studentFindFirst = vi.fn();
const loadStudentContext = vi.fn(async () => "Öğrenci: Nisa, 6 yaş\nUzman notları: trenleri sever");

vi.mock("@studio/auth", () => ({ auth: async () => ({ user: { id: "uzman-1" } }) }));
vi.mock("@/generated/studio/client", () => ({ ToolType: {} }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: () => ({ allowed: true, retryAfter: 0 }),
  rateLimitResponse: () => new Response(null, { status: 429 }),
}));
vi.mock("@studio/lib/usage", () => ({ logUsage: () => {} }));
vi.mock("@studio/lib/credits", () => ({ reserveCredits, refundCredits }));
vi.mock("@studio/lib/db", () => ({
  prisma: {
    student: { findFirst: studentFindFirst },
    $transaction: (cb: (tx: unknown) => unknown) => cb({ card: { create: cardCreate } }),
  },
}));
vi.mock("@studio/lib/anthropic", () => ({ anthropic: { messages: { create } }, MODEL: "claude-sonnet-4-6" }));
vi.mock("@studio/lib/pseudonym", () => ({
  ensureStudentAlias: async () => "Nisa",
  restoreNameDeep: (v: unknown) => v,
  scrub: (t: string | null) => t,
  scrubDeep: (v: unknown) => v,
}));
vi.mock("@studio/lib/studentContext", () => ({ loadStudentContext }));

const { createToolHandler } = await import("./toolHandler");

/** DB'den dönen öğrenci satırı — kapı `name`i rumuzlar, not/profil/modülleri yalnız bağlam yükleyicisine verir. */
const OGRENCI = {
  id: "s1",
  name: "Ela Şahin",
  birthDate: new Date(2020, 4, 14),
  workArea: "language",
  diagnosis: null,
  llmAlias: "Nisa",
  notes: "Ela trenleri sever",
  aiProfile: "### Öncelikli Çalışma Alanları\n- İstek cümleleri",
  curriculumIds: ["c1"],
};

const TEMEL_CONFIG = {
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
};

const POST = createToolHandler(TEMEL_CONFIG);

type Sonuc = { type: string; status: number; body: { error?: string } };

/** Verilen gövdeyle kapıyı çağırır, SSE akışındaki `result` olayını döndürür. */
async function cagir(handler: typeof POST, body: object, stopReason: string, text: string): Promise<Sonuc> {
  create.mockResolvedValue({
    stop_reason: stopReason,
    content: [{ type: "text", text }],
    usage: { input_tokens: 900, output_tokens: 6000 },
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
    .map((c) => JSON.parse(c.slice(6)) as Sonuc);
  return events.find((e) => e.type === "result")!;
}

const generate = (stopReason: string, text: string) => cagir(POST, {}, stopReason, text);

beforeEach(() => {
  create.mockReset();
  cardCreate.mockReset();
  cardCreate.mockResolvedValue({ id: "kart-1" });
  refundCredits.mockReset();
  reserveCredits.mockClear();
  studentFindFirst.mockReset();
  studentFindFirst.mockResolvedValue(OGRENCI);
  loadStudentContext.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("araç kapısı — token tavanı", () => {
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

describe("araç kapısı — öğrenci bağlam bloğu", () => {
  type Ogrenci = Record<string, unknown> | null;
  /** Öğrencili araç: `buildUserPrompt`'a gelen bloğu ve öğrenci nesnesini yakalar. */
  function ogrenciliArac(seen: { blok: string[]; ogrenci: Ogrenci[] }) {
    return createToolHandler({
      ...TEMEL_CONFIG,
      bodySchema: z.object({ studentId: z.string() }),
      studentRequired: true,
      buildUserPrompt: (_d, s, _a, ctx) => {
        seen.blok.push(ctx.studentBlock);
        seen.ogrenci.push(s as Ogrenci);
        return "istek";
      },
    });
  }

  it("öğrenci seçiliyse buildUserPrompt'a studentBlock verilir ve bloğun adı rumuzdur", async () => {
    const seen = { blok: [] as string[], ogrenci: [] as Ogrenci[] };
    const POST2 = ogrenciliArac(seen);
    const r = await cagir(POST2, { studentId: "s1" }, "end_turn", '{"title":"x"}');

    expect(r.status).toBe(200);
    expect(seen.blok[0]).toContain("Öğrenci: Nisa");
    expect(loadStudentContext).toHaveBeenCalledTimes(1);
    expect(loadStudentContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ studentId: "s1", therapistId: "uzman-1", nameMap: { real: "Ela Şahin", alias: "Nisa" } }),
    );
  });

  it("öğrenci yoksa studentBlock boş string; bağlam yükleyici çağrılmaz", async () => {
    const seen: string[] = [];
    const POST3 = createToolHandler({
      ...TEMEL_CONFIG,
      studentRequired: false,
      buildUserPrompt: (_d, _s, _a, ctx) => {
        seen.push(ctx.studentBlock);
        return "istek";
      },
    });
    await cagir(POST3, {}, "end_turn", '{"title":"x"}');

    expect(seen[0]).toBe("");
    expect(loadStudentContext).not.toHaveBeenCalled();
  });

  it("öğrenci satırı not/profil/modül alanlarıyla çekilir ve yükleyiciye `student` olarak verilir (öğrenci sorgusu tekrarlanmaz); araca giden öğrenci nesnesi eskisi gibi dar", async () => {
    const seen = { blok: [] as string[], ogrenci: [] as Ogrenci[] };
    await cagir(ogrenciliArac(seen), { studentId: "s1" }, "end_turn", '{"title":"x"}');

    // Tek sorgu: kapının öğrenci doğrulaması zaten satırı çekiyor; yükleyici kendi sorgusunu atlar.
    expect(studentFindFirst).toHaveBeenCalledTimes(1);
    expect(studentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1", therapistId: "uzman-1" },
        select: expect.objectContaining({ notes: true, aiProfile: true, curriculumIds: true }),
      }),
    );
    expect(loadStudentContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        student: {
          birthDate: OGRENCI.birthDate,
          workArea: "language",
          diagnosis: null,
          notes: "Ela trenleri sever",
          aiProfile: OGRENCI.aiProfile,
          curriculumIds: ["c1"],
        },
      }),
    );
    // Ham not/profil araca `student` üzerinden sızmaz: bloğa rumuzlu girer, nesne eski şeklinde kalır.
    const s = seen.ogrenci[0]!;
    expect(s).toMatchObject({ id: "s1", name: "Nisa", workArea: "language" });
    expect(s).not.toHaveProperty("notes");
    expect(s).not.toHaveProperty("aiProfile");
    expect(s).not.toHaveProperty("curriculumIds");
  });

  it("blok kredi rezervasyonundan ÖNCE yüklenir; yükleyici patlarsa blok boş, uyarı yazılır, kredi yine rezerve edilir ve üretim sürer", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const seen = { blok: [] as string[], ogrenci: [] as Ogrenci[] };
    const POST4 = ogrenciliArac(seen);

    await cagir(POST4, { studentId: "s1" }, "end_turn", '{"title":"x"}');
    expect(loadStudentContext.mock.invocationCallOrder[0]!).toBeLessThan(reserveCredits.mock.invocationCallOrder[0]!);

    loadStudentContext.mockRejectedValueOnce(new Error("db koptu"));
    reserveCredits.mockClear();
    const r = await cagir(POST4, { studentId: "s1" }, "end_turn", '{"title":"x"}');

    expect(r.status).toBe(200);
    expect(seen.blok[1]).toBe("");
    expect(reserveCredits).toHaveBeenCalledTimes(1);
    expect(refundCredits).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("bağlam"), expect.anything());
    warn.mockRestore();
  });
});
