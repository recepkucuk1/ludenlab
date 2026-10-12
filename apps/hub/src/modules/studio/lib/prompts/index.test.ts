import { describe, expect, it } from "vitest";
import { buildCardPrompt } from "./index";

/**
 * Kart üreticisinin kullanıcı prompt'u — öğrenci bağlamı artık ortak bloktan gelir (spec A2):
 * rota kendi sorgularını yapmaz, `loadStudentContext`in rumuzlu bloğunu olduğu gibi gömer.
 */
describe("buildCardPrompt — öğrenci bağlam bloğu", () => {
  const temel = { category: "language", difficulty: "easy", ageGroup: "3-6" } as const;

  it("blok verilmişse **ÖĞRENCİ BAĞLAMI:** başlığı altında olduğu gibi gömülür", () => {
    const blok = "Öğrenci: Nisa, 6 yaş\nÇalışma alanı: Dil\nTamamlanan hedefler: 2.1";
    const p = buildCardPrompt({ ...temel, studentBlock: blok });
    expect(p).toContain(`**ÖĞRENCİ BAĞLAMI:**\n${blok}`);
  });

  it("blok yok ya da boşsa başlık yazılmaz", () => {
    expect(buildCardPrompt(temel)).not.toContain("ÖĞRENCİ BAĞLAMI");
    expect(buildCardPrompt({ ...temel, studentBlock: "" })).not.toContain("ÖĞRENCİ BAĞLAMI");
  });
});
