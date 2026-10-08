// apps/hub/evals/lib/renderStudent.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { atolyeFixtures, studioFixtures } from "./fixtures";
import { renderAtolyeCase, renderStudioStudent } from "./renderStudent";

describe("hakem için öğrenci bağlamı", () => {
  it("stu-ela: notlar, AI profili bölümleri, 3 kart yeniden eskiye, son oturum özeti", () => {
    const t = renderStudioStudent(studioFixtures()["stu-ela"]);
    const yas = new Date().getFullYear() - 2020;
    expect(t).toContain(`- Öğrenci: Ela Demir, ${yas} yaş · Çalışma alanı: Dil`);
    expect(t).toContain("- Uzman notları: Dinozorlara ve trenlere bayılıyor.");
    expect(t).toContain("  Öncelikli Çalışma Alanları:\n    - İki kelimeli istek cümlelerini");
    expect(t).toContain("  Dikkat Edilmesi Gereken Noktalar:\n    - Ani ses ve kalabalıkta duyusal yüklenme; önce sakin köşe\n    - Soyut duygu");
    expect(t).not.toContain("## Uzmana Öneriler");
    const kartlar = t.split("\n").filter((l) => / · (SOCIAL_STORY|LEARNING_CARD) · /.test(l));
    expect(kartlar).toHaveLength(3);
    expect(kartlar.map((l) => l.slice(-10))).toEqual(["2026-10-01", "2026-09-27", "2026-09-20"]);
    expect(t).toContain("- Son oturum özeti (2026-10-01): Üç kelimeli istek cümlesini modelle %60 üretti");
    expect(t).toContain("Sonraki oturum planı: Üç kelimeli cümleyi oyun içinde");
    expect(t).toContain("- Tamamlanan hedef kodları: 2.1");
  });

  it("stu-kerem: boş alanlar yazılmaz", () => {
    const t = renderStudioStudent(studioFixtures()["stu-kerem"]);
    expect(t.split("\n")).toHaveLength(2); // Öğrenci + Tanı
    expect(t).toContain("- Tanı: Artikülasyon bozukluğu");
    for (const bos of ["Uzman notları", "AI profili", "Son kartlar", "Son oturum", "Tamamlanan", "—", "null"]) {
      expect(t).not.toContain(bos);
    }
  });

  it("case-arda: MEB bölümleri ve tek belge satırı; case-mina boşları atlar", () => {
    const t = renderAtolyeCase(atolyeFixtures()["case-arda"]);
    expect(t).toContain("- Öğrenci: Arda Yılmaz, İlkokul (1–4. sınıf), 8 yaş");
    expect(t).toContain("- Güçlük profili: Disleksi (okuma güçlüğü), DEHB — dikkat eksikliği baskın");
    expect(t).toContain("- Güçlük düzeyi: Orta");
    expect(t).toContain("- Çalışılan MEB bölümleri: 3.1, 3.2");
    expect(t.split("\n").filter((l) => l.startsWith("  bep_hedef · "))).toEqual(["  bep_hedef · 2026-09-02 · Okuma (disleksi odağı)"]);

    const m = renderAtolyeCase(atolyeFixtures()["case-mina"]);
    expect(m).not.toContain("Güçlü yönler");
    expect(m).not.toContain("MEB bölümleri");
    expect(m).not.toContain("Son belgeler");
  });
});
