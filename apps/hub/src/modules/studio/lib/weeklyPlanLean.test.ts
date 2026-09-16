import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Haftalık plan — kesilme düzeltmesinin sözleşmesi.
 *
 * Ölçüm (2026-09-16, Sonnet 4.6): model her ders için gün adı, tarih, süre ve paragraf
 * uzunluğunda açıklamalar yazıyordu; çıktı ≈ 2.500 + 850 × ders token'ı. Varsayılan 3 derslik
 * plan 6.000 tavanının %88'ini kullanıyordu (canlıda 2026-07-30'da 5 denemenin 5'i kesildi),
 * 12 derslik plan 240 sn SSE sınırına çarpıp 504 döndü. Tavanı yükseltmek tek başına yetmez:
 * çıktı saniyede ~53 token akıyor, 12 derslik eski plan ≈ 12.700 token ≈ 240 sn.
 *
 * Düzeltme: sunucunun zaten bildiği alanları (ders numarası, gün, tarih, süre, hafta aralığı)
 * model yazmaz, `enrichContent` doldurur; ders başına metinler kısa ve sayıca sınırlı.
 * Model çıktısı birim testte ölçülemez; burada kilitlenen şey modele giden sözleşme ve sunucu
 * dolgusudur.
 */

type Lesson = Record<string, unknown>;
type ToolConfig = {
  systemPrompt: string;
  maxTokens?: number;
  buildUserPrompt: (
    body: typeof data,
    s: typeof student,
    ageText: string,
    ctx: { therapistId: string; scrubText: (t: string | null | undefined) => string },
  ) => string | Promise<string>;
  enrichContent: (content: Record<string, unknown>, body: typeof data) => void | Promise<void>;
};

const captured = vi.hoisted(() => ({ config: null as ToolConfig | null }));

vi.mock("@studio/lib/toolHandler", () => ({
  createToolHandler: (config: ToolConfig) => {
    captured.config = config;
    return async () => new Response(null);
  },
}));
vi.mock("@studio/lib/db", () => ({
  prisma: {
    card: { findMany: async () => [], findFirst: async () => null },
    student: { findUnique: async () => ({ curriculumIds: [] }) },
    curriculum: { findMany: async () => [] },
  },
}));

beforeAll(async () => {
  await import("@/app/studio/api/tools/weekly-plan/route");
});

const data = {
  studentId: "s1",
  weekStart: "2026-09-21",
  sessionsPerWeek: 3,
  sessionDuration: "45" as const,
  focusAreas: ["Artikülasyon"],
  planApproach: "ai" as const,
  daySchedule: [
    { dayName: "Pazartesi", lessonCount: 2 },
    { dayName: "Çarşamba", lessonCount: 1 },
  ],
};
const student = { id: "s1", name: "Rumuz", birthDate: null, workArea: "speech", diagnosis: null };
const ctx = { therapistId: "t1", scrubText: (t: string | null | undefined) => t ?? "" };

const lesson = (focusArea: string): Lesson => ({
  focusArea,
  objective: "Kelime başında /ş/ sesini doğru üretmek.",
  warmup: { activity: "Aynada dudak ve dil hareketleri taklit edilir.", duration: "5 dakika" },
  mainWork: { activity: "Resim kartlarıyla /ş/ ile başlayan kelimeler adlandırılır.", duration: "30 dakika" },
  closing: { activity: "Günün en sevilen kartı bir kez daha söylenir.", duration: "10 dakika" },
  notes: null,
});

function promptExample() {
  const sp = captured.config!.systemPrompt;
  return JSON.parse(sp.slice(sp.indexOf("{"), sp.lastIndexOf("}") + 1)) as {
    days: Array<{
      objective: string;
      warmup: { activity: string; materials?: string[] };
      mainWork: { activity: string; steps: string[]; materials: string[] };
      closing: { activity: string };
    }>;
  };
}

describe("haftalık plan — sunucu dolgusu", () => {
  it("ders numarası, gün, tarih ve süreyi takvimden doldurur", async () => {
    const content: Record<string, unknown> = { days: [lesson("a"), lesson("b"), lesson("c")] };

    await captured.config!.enrichContent(content, data);

    expect(content.days).toMatchObject([
      { dayNumber: 1, dayName: "Pazartesi", date: "21 Eylül 2026", duration: "45 dakika", focusArea: "a" },
      { dayNumber: 2, dayName: "Pazartesi", date: "21 Eylül 2026", duration: "45 dakika", focusArea: "b" },
      { dayNumber: 3, dayName: "Çarşamba", date: "23 Eylül 2026", duration: "45 dakika", focusArea: "c" },
    ]);
  });

  it("hafta aralığını sunucu yazar", async () => {
    const content: Record<string, unknown> = { days: [lesson("a"), lesson("b"), lesson("c")] };

    await captured.config!.enrichContent(content, data);

    expect(content.weekRange).toBe("21 Eylül 2026 - 27 Eylül 2026");
  });

  it("takvimde karşılığı olmayan fazladan ders atılır", async () => {
    // Günü ve tarihi olmayan ders ekranda boş başlıkla görünür, PDF dışa aktarımını bozar.
    const content: Record<string, unknown> = { days: [lesson("a"), lesson("b"), lesson("c"), lesson("d")] };

    await captured.config!.enrichContent(content, data);

    expect((content.days as Lesson[]).map((d) => d.focusArea)).toEqual(["a", "b", "c"]);
  });
});

describe("haftalık plan — modele giden sözleşme", () => {
  it("model gün, tarih, süre ve hafta aralığı yazmaz", () => {
    const example = promptExample();
    for (const key of ["dayNumber", "dayName", "date", "duration"]) {
      expect(example.days[0], key).not.toHaveProperty(key);
    }
    expect(example).not.toHaveProperty("weekRange");
  });

  it("ders başına sınırları kural olarak koyar ve örnek de bu sınırlara uyar", () => {
    const sp = captured.config!.systemPrompt;
    expect(sp).toMatch(/en fazla 3 adım/);
    expect(sp).toMatch(/en fazla 3 materyal/);
    expect(sp).toMatch(/tek cümle/i);

    const [day] = promptExample().days;
    expect(day!.mainWork.steps.length).toBeLessThanOrEqual(3);
    expect(day!.mainWork.materials.length).toBeLessThanOrEqual(3);
  });

  it("dersleri numaralı listeler ve days dizisini bu sıraya bağlar", async () => {
    // Sunucu gün/tarih etiketini SIRAYLA eşler; model sırayı değiştirirse etiketler kayar.
    const prompt = await captured.config!.buildUserPrompt(data, student, "6 yaşında", ctx);
    expect(prompt).toMatch(/1\. Pazartesi 21 Eylül 2026/);
    expect(prompt).toMatch(/2\. Pazartesi 21 Eylül 2026/);
    expect(prompt).toMatch(/3\. Çarşamba 23 Eylül 2026/);
    expect(prompt).toMatch(/days[^\n]*sıra/);
  });

  it("token tavanı 12 derslik planı kesmeden alır, 240 sn SSE sınırını aşacak kadar geniş değildir", () => {
    // Ölçüm (yalın şema, 2026-09-16): 12 derslik plan 6.334 ve 6.784 token tuttu. Çıktı saniyede
    // ~55 token akar: 11.000 token ≈ 200 sn. Daha geniş tavan, yarım kalan üretimin 504'e
    // düşmesine (ve API bedelinin yine ödenmesine) izin verir.
    expect(captured.config!.maxTokens).toBeGreaterThanOrEqual(9000);
    expect(captured.config!.maxTokens).toBeLessThanOrEqual(11000);
  });
});
