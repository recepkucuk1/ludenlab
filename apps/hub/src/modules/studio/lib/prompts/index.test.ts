import { describe, expect, it } from "vitest";
import { buildCardPrompt } from "./index";

/**
 * Kart üreticisinin kullanıcı prompt'u — öğrenci bağlamı ortak bloktan gelir (spec A2) ve A1 iskeletiyle
 * (`studioKullaniciPromptu`) yazılır: rota kendi sorgularını yapmaz, `loadStudentContext`in rumuzlu bloğunu
 * ÖĞRENCİ başlığı altında olduğu gibi, her şeyden önce gömer. Ayrıntılı A1 sözleşmesi: `card.prompt.test.ts`.
 */
describe("buildCardPrompt — öğrenci bağlam bloğu", () => {
  const temel = { category: "language", difficulty: "easy", ageGroup: "3-6" } as const;

  it("blok verilmişse ÖĞRENCİ başlığı altında, prompt'un başında olduğu gibi gömülür", () => {
    const blok = "Öğrenci: Nisa, 6 yaş\nÇalışma alanı: Dil\nTamamlanan hedefler: 2.1";
    const p = buildCardPrompt({ ...temel, studentBlock: blok });
    expect(p.startsWith(`ÖĞRENCİ\n${blok}\n\nPARAMETRELER`)).toBe(true);
  });

  it("blok yok ya da boşsa başlık yazılmaz", () => {
    expect(buildCardPrompt(temel)).not.toMatch(/^ÖĞRENCİ$/m);
    expect(buildCardPrompt({ ...temel, studentBlock: "" })).not.toMatch(/^ÖĞRENCİ$/m);
  });
});
