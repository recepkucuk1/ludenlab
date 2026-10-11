import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * AI profili üretimi — prompt'a giden öğrenci bilgisi.
 *
 * Profil prompt'unda yaş iki yerde geçer: ortak bağlam bloğunun `Öğrenci: <rumuz>, N yaş` satırı
 * ve koddan türeyen `Odak: Yaş N, …` satırı (Task 13; eski `Yaşı:` satırı kalktı). İkisi aynı
 * kuralla (takvim yılı farkı) hesaplanmalı; eskiden gün/365,25 tabanıyla doğum günü gelmemiş
 * çocukta bir yaş küçük çıkıyordu — model iki farklı yaş görüyordu.
 */
const create = vi.fn();
const OGRENCI = {
  id: "s1",
  name: "Ela Şahin",
  birthDate: new Date(2020, 11, 1), // 1 Aralık 2020 — sabit "bugün"de doğum günü henüz gelmedi
  workArea: "language",
  diagnosis: "OSB",
  notes: "Trenleri sever.",
  aiProfile: "### Öncelikli Çalışma Alanları\n- Eski profil maddesi",
  curriculumIds: [],
  llmAlias: "Nisa",
  therapistId: "t1",
};

vi.mock("@studio/lib/db", () => ({
  prisma: {
    student: { findUnique: async () => OGRENCI },
    card: { findMany: async () => [], findFirst: async () => null },
    curriculum: { findMany: async () => [] },
    studentProgress: { findMany: async () => [] },
  },
}));
vi.mock("@studio/lib/anthropic", () => ({ anthropic: { messages: { create } }, MODEL: "claude-sonnet-4-6" }));
vi.mock("@studio/lib/usage", () => ({ logUsage: () => {} }));
vi.mock("@studio/lib/pseudonym", () => ({
  ensureStudentAlias: async () => "Nisa",
  restoreName: (t: string) => t,
  scrub: (t: string | null) => t,
}));

const { generateStudentProfile, PROFILE_SYSTEM_PROMPT } = await import("./generateProfile");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 10)); // 10 Ekim 2026
  create.mockReset();
  create.mockResolvedValue({ content: [{ type: "text", text: "## Kavramsal Arka Plan\nmetin" }], usage: {} });
});
afterEach(() => vi.useRealTimers());

describe("generateStudentProfile — prompt'taki yaş ve bağlam bloğu", () => {
  it("odak satırındaki yaş ile bloğun `N yaş` ibaresi aynı (takvim yılı farkı): 2020-12-01 doğumlu 2026-10-10'da her ikisinde 6", async () => {
    await generateStudentProfile("s1", "t1");

    const prompt = String((create.mock.calls[0]![0] as { messages: { content: string }[] }).messages[0]!.content);
    const odakYas = /^Odak: Yaş (\d+), Dil → /m.exec(prompt)?.[1];
    const blokYas = /^Öğrenci: Nisa, (\d+) yaş$/m.exec(prompt)?.[1];
    expect(odakYas).toBe("6"); // gün/365,25 tabanı 5 derdi
    expect(blokYas).toBe("6");
    expect(prompt).not.toMatch(/^Yaşı:/m);
    expect(prompt).not.toContain("Öğrenci adı:");
    // Sistem prompt'u dışa aktarılan A1 metnidir ve önbelleklenir.
    const call = create.mock.calls[0]![0] as { system: { text: string; cache_control: unknown }[] };
    expect(call.system[0]!.text).toBe(PROFILE_SYSTEM_PROMPT);
    expect(call.system[0]!.cache_control).toEqual({ type: "ephemeral" });
  });

  it("blok prompt'ta; mevcut profil bloğa alınmaz (exclude), uzman notu bloktan gelir", async () => {
    await generateStudentProfile("s1", "t1");

    const prompt = String((create.mock.calls[0]![0] as { messages: { content: string }[] }).messages[0]!.content);
    expect(prompt).toContain("Uzman notları: Trenleri sever.");
    expect(prompt).not.toContain("Eski profil maddesi");
    expect(prompt).not.toContain("Ek notlar:");
  });
});
