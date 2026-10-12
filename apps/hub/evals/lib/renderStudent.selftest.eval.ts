// apps/hub/evals/lib/renderStudent.selftest.eval.ts
import { describe, expect, it } from "vitest";
import type { StudioFixture } from "./core";
import { atolyeFixtures, studioFixtures } from "./fixtures";
import { renderAtolyeCase, renderStudioStudent } from "./renderStudent";

describe("hakem için öğrenci bağlamı", () => {
  it("stu-ela: notlar, AI profili bölümleri, kartlar yeniden eskiye, son oturum özeti", () => {
    // Beklentiler fikstürden türetilir: fikstür metni değişse de yapı doğrulanır.
    const f = studioFixtures()["stu-ela"];
    const t = renderStudioStudent(f);
    const yas = new Date().getFullYear() - Number(f.birthDate.slice(0, 4));
    expect(t).toContain(`- Öğrenci: ${f.name}, ${yas} yaş · Çalışma alanı: Dil`);
    expect(t).toContain(`- Uzman notları: ${f.notes}`);
    expect(t).toMatch(/^ {2}Öncelikli Çalışma Alanları:\n {4}- \S/m);
    expect(t).toMatch(/^ {2}Dikkat Edilmesi Gereken Noktalar:\n {4}- \S(?:.*)\n {4}- \S/m);
    // Bağlam katmanı modele "Etkili yaklaşım:" satırını da verir; hakem de görsün (hakem ≥ model).
    expect(t).toMatch(/^ {2}Etkili Yaklaşım ve Teknikler:\n {4}- \S/m);
    expect(t.indexOf("Dikkat Edilmesi Gereken Noktalar:")).toBeLessThan(t.indexOf("Etkili Yaklaşım ve Teknikler:"));
    expect(t).not.toContain("## "); // profilin ham Markdown'ı sızmaz
    expect(t).not.toContain("Uzmana Öneriler");
    expect(t).not.toContain("Kavramsal Arka Plan");

    // Kartlar: her biri bir satır, tarih yalnız gün, yeniden eskiye.
    const kartSatirlari = t.split("\n").filter((l) => / · (SESSION_SUMMARY|SOCIAL_STORY|LEARNING_CARD) · \d{4}-\d{2}-\d{2}$/.test(l));
    expect(kartSatirlari).toHaveLength(f.recentCards.length);
    const beklenenGunler = f.recentCards.map((c) => c.createdAt.slice(0, 10)).sort().reverse();
    expect(kartSatirlari.map((l) => l.slice(-10))).toEqual(beklenenGunler);
    for (const k of f.recentCards) expect(t).toContain(`  ${k.title} · ${k.toolType} · ${k.createdAt.slice(0, 10)}`);
    expect(t).not.toMatch(/\d{4}-\d{2}-\d{2}T\d/); // saat kısmı hakeme gitmez

    const ozet = f.lastSummary!;
    expect(t).toContain(`- Son oturum özeti (${ozet.createdAt.slice(0, 10)}): ${ozet.overallAssessment}`);
    expect(t).toContain(`Sonraki oturum planı: ${ozet.nextSessionPlan}`);
    expect(t).toContain(`Davranış notu: ${ozet.behaviorNotes}`);
    expect(t).toContain(`- Atanmış müfredat: ${f.curriculumTitles.join(", ")}`);
    expect(t).toContain(`- Tamamlanan hedef kodları: ${f.completedGoalCodes.join(", ")}`);
    // Bilgi asimetrisi: model bloğunda "Sürmekte olan hedefler" varsa hakem de görür (hakem ≥ model).
    expect(t).toContain(`- Sürmekte olan hedefler: ${f.inProgressGoals!.map((g) => `${g.code} ${g.title}`).join(", ")}`);
  });

  it("stu-kerem: boş alanlar yazılmaz; süren hedef satırı yazılır", () => {
    const t = renderStudioStudent(studioFixtures()["stu-kerem"]);
    expect(t.split("\n")).toHaveLength(3); // Öğrenci + Tanı + Sürmekte olan hedefler
    expect(t).toContain("- Tanı: ");
    expect(t).toContain("- Sürmekte olan hedefler: 1.2 /r/ sesini hece düzeyinde üretir");
    for (const bos of ["Uzman notları", "AI profili", "Son kartlar", "Son oturum", "Davranış notu", "Atanmış müfredat", "Tamamlanan", "—", "null"]) {
      expect(t).not.toContain(bos);
    }
  });

  it("davranış notu ve atanmış müfredat satırları (satır içi fikstür)", () => {
    const f: StudioFixture = {
      id: "stu-x",
      name: "Deneme Öğrenci",
      birthDate: "2019-04-10",
      workArea: "speech",
      diagnosis: null,
      notes: null,
      aiProfile: null,
      recentCards: [],
      lastSummary: {
        overallAssessment: "Genel olarak iyi.",
        nextSessionPlan: "Sesi sözcük başında çalış.",
        overallPerformance: "progressing",
        behaviorNotes: "Oturumun ortasında dikkati dağıldı.",
        createdAt: "2026-10-01",
      },
      curriculumTitles: ["Ses farkındalığı", "Hece birleştirme"],
      completedGoalCodes: [],
    };
    const t = renderStudioStudent(f);
    expect(t).toContain("Davranış notu: Oturumun ortasında dikkati dağıldı.");
    expect(t).toContain("- Atanmış müfredat: Ses farkındalığı, Hece birleştirme");
    expect(t).toContain("- Son oturum özeti (2026-10-01): Genel olarak iyi.");

    // Boş/null olanlar hiç yazılmaz (süren hedef alanı yok ya da boş liste → satır yok).
    const bos = renderStudioStudent({ ...f, lastSummary: { ...f.lastSummary!, behaviorNotes: null }, curriculumTitles: [] });
    expect(bos).not.toContain("Davranış notu");
    expect(bos).not.toContain("Atanmış müfredat");
    expect(bos).not.toContain("Sürmekte");
    expect(renderStudioStudent({ ...f, inProgressGoals: [] })).not.toContain("Sürmekte");
    const bosluk = renderStudioStudent({ ...f, lastSummary: { ...f.lastSummary!, behaviorNotes: "  " } });
    expect(bosluk).not.toContain("Davranış notu");
  });

  it("case-arda: MEB bölümleri ve belge satırları (yeniden eskiye, yalnız gün + başlık); case-mina boşları atlar", () => {
    const f = atolyeFixtures()["case-arda"];
    const t = renderAtolyeCase(f);
    expect(t).toContain(`- Öğrenci: ${f.code}, İlkokul (1–4. sınıf), ${f.yas} yaş`);
    expect(t).toContain("- Güçlük profili: Disleksi (okuma güçlüğü), DEHB — dikkat eksikliği baskın");
    expect(t).toContain("- Güçlük düzeyi: Orta");
    expect(t).toContain(`- Çalışılan MEB bölümleri: ${f.mebBolumler.join(", ")}`);

    const belgeSatirlari = t.split("\n").filter((l) => / · \d{4}-\d{2}-\d{2} · /.test(l));
    expect(belgeSatirlari).toHaveLength(f.documents.length);
    const beklenen = [...f.documents]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((d) => `  ${d.type} · ${d.createdAt.slice(0, 10)} · ${d.content.split("\n")[0].replace(/^#{1,6}\s+/, "").trim()}`);
    expect(belgeSatirlari).toEqual(beklenen);
    for (const d of f.documents) {
      const govdeSatiri = d.content.split("\n").filter((l) => l.trim())[1];
      expect(govdeSatiri).toBeTruthy();
      expect(t).not.toContain(govdeSatiri); // belge gövdesi sızmaz, yalnız başlığı
    }

    const m = renderAtolyeCase(atolyeFixtures()["case-mina"]);
    expect(m).not.toContain("Güçlü yönler");
    expect(m).not.toContain("MEB bölümleri");
    expect(m).not.toContain("Son belgeler");
  });
});
