// apps/hub/src/modules/studio/lib/assistant/schema.test.ts
import { describe, expect, it, vi } from "vitest";

// studentContext → pseudonym → db zinciri Prisma istemcisini import anında kurar.
vi.mock("@studio/lib/db", () => ({ prisma: {} }));

const { MAX_SUGGESTIONS, validateSuggestions } = await import("./schema");
type GoalRow = import("./schema").GoalRow;

const hedefler: GoalRow[] = [
  { id: "g1", code: "3.1", title: "Kelime başı /r/", status: "in_progress" },
  { id: "g2", code: "3.2", title: "Kelime sonu /r/", status: "not_started" },
];

describe("validateSuggestions", () => {
  it("üç geçerli tür geçer, alanlar korunur", () => {
    const out = validateSuggestions(
      {
        suggestions: [
          { kind: "goal_status", goalId: "g1", status: "completed", reason: "Beş seansta %90" },
          { kind: "profile_note", section: "Dikkat Edilmesi Gereken Noktalar", text: "Yorulunca sesi düşüyor", reason: "Gözlem" },
          { kind: "generate_tool", tool: "articulation", params: { targetSounds: ["/r/"], positions: ["initial"], level: "word", itemCount: 12 }, reason: "Kelime başı pekiştirme" },
        ],
      },
      { goals: hedefler, hasProfile: true },
    );
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ kind: "goal_status", goalId: "g1", status: "completed" });
    expect(out[2]).toMatchObject({ kind: "generate_tool", tool: "articulation" });
  });

  it("bilinmeyen goalId, aynı durum, bilinmeyen tür ve geçersiz status elenir", () => {
    const out = validateSuggestions(
      {
        suggestions: [
          { kind: "goal_status", goalId: "yok", status: "completed", reason: "x" },
          { kind: "goal_status", goalId: "g1", status: "in_progress", reason: "aynı" },
          { kind: "goal_status", goalId: "g2", status: "mastered", reason: "şema dışı" },
          { kind: "unknown", reason: "x" },
        ],
      },
      { goals: hedefler, hasProfile: true },
    );
    expect(out).toEqual([]);
  });

  it("eksik zorunlu araç parametresi elenir (partial DEĞİL)", () => {
    const out = validateSuggestions(
      { suggestions: [{ kind: "generate_tool", tool: "articulation", params: { targetSounds: ["/r/"] }, reason: "x" }] },
      { goals: hedefler, hasProfile: true },
    );
    expect(out).toEqual([]);
  });

  it("profil yoksa profile_note elenir", () => {
    const out = validateSuggestions(
      { suggestions: [{ kind: "profile_note", section: "Öncelikli Çalışma Alanları", text: "x", reason: "y" }] },
      { goals: hedefler, hasProfile: false },
    );
    expect(out).toEqual([]);
  });

  it("en fazla 4 öneri; aynı hedef / aynı araç tekrarları elenir", () => {
    const cok = Array.from({ length: 6 }, (_, i) => ({ kind: "profile_note", section: "Öncelikli Çalışma Alanları", text: `madde ${i}`, reason: "r" }));
    expect(validateSuggestions({ suggestions: cok }, { goals: hedefler, hasProfile: true })).toHaveLength(MAX_SUGGESTIONS);
    const tekrar = validateSuggestions(
      {
        suggestions: [
          { kind: "goal_status", goalId: "g2", status: "in_progress", reason: "a" },
          { kind: "goal_status", goalId: "g2", status: "completed", reason: "b" },
          { kind: "generate_tool", tool: "homework", params: { targetArea: "Artikülasyon", duration: "15", parentLevel: "basic", materialType: "exercise" }, reason: "c" },
          { kind: "generate_tool", tool: "homework", params: { targetArea: "Dil", duration: "10", parentLevel: "basic", materialType: "exercise" }, reason: "d" },
        ],
      },
      { goals: hedefler, hasProfile: true },
    );
    expect(tekrar).toHaveLength(2);
  });

  it("metin tavanları: text ≤ 300, reason ≤ 200 aşan öneri elenir; suggestions yoksa boş", () => {
    expect(
      validateSuggestions({ suggestions: [{ kind: "profile_note", section: "Öncelikli Çalışma Alanları", text: "a".repeat(301), reason: "r" }] }, { goals: hedefler, hasProfile: true }),
    ).toEqual([]);
    expect(validateSuggestions({}, { goals: hedefler, hasProfile: true })).toEqual([]);
    expect(validateSuggestions(null, { goals: hedefler, hasProfile: true })).toEqual([]);
  });
});

const ctx = { goals: hedefler, hasProfile: true };
const not = (text: string) => ({ kind: "profile_note", section: "Öncelikli Çalışma Alanları", text, reason: "r" });
const hw = { targetArea: "Artikülasyon", duration: "15", parentLevel: "basic", materialType: "exercise" };

describe("validateSuggestions — sertleştirme", () => {
  it("profil maddesi tek satıra iner; satır başı # ve liste işareti elenir", () => {
    const out = validateSuggestions({ suggestions: [not("Yorulunca\n## Yeni Bölüm\nsesi düşüyor")] }, ctx);
    expect(out).toHaveLength(1);
    const t = (out[0] as { text: string }).text;
    expect(t).not.toMatch(/\n/);
    expect(t).not.toMatch(/^#/);
    expect(validateSuggestions({ suggestions: [not("# Başlık")] }, ctx)).toEqual([]);
    expect(validateSuggestions({ suggestions: [not("\n## Yeni Bölüm")] }, ctx)).toEqual([]);
    expect(validateSuggestions({ suggestions: [not("- madde")] }, ctx)).toEqual([]);
    expect(validateSuggestions({ suggestions: [not("* madde")] }, ctx)).toEqual([]);
  });

  it("yalnız boşluktan oluşan text/reason elenir", () => {
    expect(validateSuggestions({ suggestions: [not("   ")] }, ctx)).toEqual([]);
    expect(validateSuggestions({ suggestions: [{ ...not("x"), reason: "  " }] }, ctx)).toEqual([]);
  });

  it("reddedilen adaylar üst sınırı tüketmez", () => {
    const gecersiz = [1, 2, 3].map(() => ({ kind: "unknown" }));
    const gecerli = [0, 1, 2, 3].map((i) => not(`madde ${i}`));
    expect(validateSuggestions({ suggestions: [...gecersiz, ...gecerli] }, ctx)).toHaveLength(4);
  });

  it("suggestions dizi değilse boş; params nesne değilse öneri elenir", () => {
    expect(validateSuggestions({ suggestions: "x" }, ctx)).toEqual([]);
    expect(validateSuggestions({ suggestions: [{ kind: "generate_tool", tool: "homework", params: "x", reason: "r" }] }, ctx)).toEqual([]);
  });

  it("profil maddesi tekrarı büyük/küçük harf (tr) ve boşluk farkını yok sayar", () => {
    const out = validateSuggestions({ suggestions: [not("IŞIK hassasiyeti"), not(" ışık hassasiyeti ")] }, ctx);
    expect(out).toHaveLength(1);
  });

  it("GÜVENLİK: params içindeki studentId ve bilinmeyen anahtar ile üst düzey fazlalık anahtar atılır", () => {
    const out = validateSuggestions(
      { suggestions: [{ kind: "generate_tool", tool: "homework", params: { ...hw, studentId: "other", extra: 1 }, reason: "r", evil: true }] },
      ctx,
    );
    expect(out).toHaveLength(1);
    const o = out[0] as unknown as Record<string, unknown> & { params: Record<string, unknown> };
    expect(o.params).not.toHaveProperty("studentId");
    expect(o.params).not.toHaveProperty("extra");
    expect(o.params).toEqual(expect.objectContaining(hw));
    expect(Object.keys(o.params).sort()).toEqual(Object.keys(hw).sort());
    expect(o).not.toHaveProperty("evil");
  });
});
