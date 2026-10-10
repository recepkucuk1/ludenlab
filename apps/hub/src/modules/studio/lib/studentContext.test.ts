import { describe, expect, it, vi } from "vitest";
import type { NameMapping } from "@ludenlab/ai";
import type { PrismaClient } from "@/generated/studio/client";
import {
  BUTCE_TOPLAM,
  PROFIL_BOLUMLERI,
  loadStudentContext,
  profilBolumleriniAyikla,
  renderStudentBlock,
  type StudentContextInput,
} from "./studentContext";

// `@studio/lib/pseudonym` → `@studio/lib/db` → PrismaClient kurulumu (import anında). Saf
// biçimlendirici testinde DB istemcisi kurulmasın diye köprü taklit edilir (toolHandler.test ile aynı).
vi.mock("@studio/lib/db", () => ({ prisma: {} }));

const map: NameMapping = { real: "Ela Şahin", alias: "Nisa" };

const temel: StudentContextInput = {
  alias: "Nisa",
  ageYears: 6,
  workArea: "language",
  diagnosis: "OSB, hafif; ifade edici dil gecikmesi",
  notes: null,
  aiProfile: null,
  curriculumTitles: [],
  recentCards: [],
  lastSummary: null,
  completedGoalCodes: [],
  inProgressGoalTitles: [],
};

describe("renderStudentBlock", () => {
  it("kimlik satırı her zaman yazılır ve kesilmez", () => {
    const t = renderStudentBlock(temel);
    expect(t).toContain("Öğrenci: Nisa, 6 yaş");
    expect(t).toContain("Çalışma alanı: Dil");
    expect(t).toContain("Tanı: OSB, hafif; ifade edici dil gecikmesi");
  });

  it("yaş yoksa yaş yazılmaz, tanı yoksa tanı satırı yok", () => {
    const t = renderStudentBlock({ ...temel, ageYears: null, diagnosis: null });
    expect(t).toContain("Öğrenci: Nisa\n");
    expect(t).not.toContain("Tanı:");
  });

  it("uzman notu 400 karakterde kırpılır ve '…' ile biter", () => {
    const t = renderStudentBlock({ ...temel, notes: "a".repeat(600) });
    const satir = t.split("\n").find((l) => l.startsWith("Uzman notları: "))!;
    expect(satir.length).toBeLessThanOrEqual("Uzman notları: ".length + 400);
    expect(satir.endsWith("…")).toBe(true);
  });

  it("profilden yalnız iki bölüm alınır (≤800 karakter), diğer başlıklar gelmez", () => {
    const profil = `## Kavramsal Arka Plan\n\n### Tanının Klinik Açıklaması\nUzun açıklama.\n\n---\n\n## Uzmana Öneriler\n\n### Öncelikli Çalışma Alanları\n- İki kelimeli istek cümlelerini üçe genişletme\n- Geçiş anlarında görsel uyarı\n\n### Etkili Yaklaşım ve Teknikler\nModel olma.\n\n### Dikkat Edilmesi Gereken Noktalar\nAni ses değişimleri kaygı yaratır.\n\n### Aile ile Paylaşılabilecek Öneriler\nEvde resimli program.`;
    const t = renderStudentBlock({ ...temel, aiProfile: profil });
    expect(t).toContain("Öncelikli çalışma alanları: İki kelimeli istek cümlelerini üçe genişletme; Geçiş anlarında görsel uyarı");
    expect(t).toContain("Dikkat edilmesi gerekenler: Ani ses değişimleri kaygı yaratır.");
    expect(t).not.toContain("Model olma");
    expect(t).not.toContain("Klinik Açıklaması");
  });

  it("profil iki satırı birlikte 800 karakteri aşmaz", () => {
    const t = renderStudentBlock({
      ...temel,
      aiProfile: `### Öncelikli Çalışma Alanları\n${"o".repeat(700)}\n### Dikkat Edilmesi Gereken Noktalar\n${"d".repeat(700)}`,
    });
    const satirlar = t.split("\n").filter((l) => l.startsWith("Öncelikli çalışma alanları: ") || l.startsWith("Dikkat edilmesi gerekenler: "));
    expect(satirlar).toHaveLength(2);
    expect(satirlar.reduce((n, l) => n + l.length, 0)).toBeLessThanOrEqual(800);
  });

  it("son 5 kart: başlık ≤80 karakter, araç türü ve tarih", () => {
    const cards = Array.from({ length: 7 }, (_, i) => ({
      title: `Kart ${i} ${"x".repeat(100)}`,
      toolType: "SOCIAL_STORY",
      createdAt: new Date(2026, 8, 1 + i),
    }));
    const t = renderStudentBlock({ ...temel, recentCards: cards });
    const satirlar = t.split("\n").filter((l) => l.startsWith("- Kart "));
    expect(satirlar).toHaveLength(5);
    expect(satirlar[0]!.length).toBeLessThanOrEqual(80 + " (SOCIAL_STORY, 07.09.2026)".length + 2);
  });

  it("kartlar yeniden eskiye sıralanır; sıra girdiden bağımsızdır", () => {
    const cards = [
      { title: "Eski", toolType: "HOMEWORK", createdAt: new Date(2026, 8, 1) },
      { title: "Yeni", toolType: null, createdAt: new Date(2026, 8, 9) },
    ];
    const t = renderStudentBlock({ ...temel, recentCards: cards });
    const satirlar = t.split("\n").filter((l) => l.startsWith("- "));
    expect(satirlar).toEqual(["- Yeni (kart, 09.09.2026)", "- Eski (HOMEWORK, 01.09.2026)"]);
  });

  it("son oturum özeti: genel değerlendirme + sonraki plan, ≤400 karakter", () => {
    const t = renderStudentBlock({
      ...temel,
      lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: "İyi gitti. ".repeat(40), nextSessionPlan: "Üç sözcüklü isteğe geç." },
    });
    const satir = t.split("\n").find((l) => l.startsWith("Son oturum (01.10.2026): "))!;
    expect(satir.length).toBeLessThanOrEqual("Son oturum (01.10.2026): ".length + 400);
    expect(satir).toContain("Sonraki plan:");
  });

  it("son oturumda yalnız plan varsa değerlendirmesiz yazılır; ikisi de boşsa satır yok", () => {
    const t = renderStudentBlock({
      ...temel,
      lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: null, nextSessionPlan: "Sıra alma oyunu." },
    });
    expect(t).toContain("Son oturum (01.10.2026): Sonraki plan: Sıra alma oyunu.");
    const bos = renderStudentBlock({ ...temel, lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: null, nextSessionPlan: null } });
    expect(bos).not.toContain("Son oturum");
  });

  it("hedefler: tamamlanan kodlar + süren başlıklar, toplam ≤10 madde", () => {
    const t = renderStudentBlock({
      ...temel,
      completedGoalCodes: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7"],
      inProgressGoalTitles: ["Üç sözcüklü istek", "Sıra alma", "Ortak dikkat", "Taklit"],
    });
    expect(t).toContain("Tamamlanan hedefler: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7");
    expect(t).toContain("Sürmekte olan hedefler: Üç sözcüklü istek, Sıra alma, Ortak dikkat");
    expect(t).not.toContain("Taklit"); // 7 + 3 = 10
  });

  it("toplam bütçe 2400 karakteri aşmaz; sıradaki alanlar atlanır, kimlik korunur", () => {
    const t = renderStudentBlock({
      ...temel,
      notes: "n".repeat(400),
      aiProfile: `### Öncelikli Çalışma Alanları\n${"- madde ".repeat(120)}\n### Dikkat Edilmesi Gereken Noktalar\n${"d".repeat(500)}`,
      recentCards: Array.from({ length: 5 }, (_, i) => ({ title: "k".repeat(80), toolType: "WEEKLY_PLAN", createdAt: new Date(2026, 8, i + 1) })),
      lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: "o".repeat(300), nextSessionPlan: "p".repeat(300) },
      completedGoalCodes: ["1.1"],
      inProgressGoalTitles: ["x".repeat(60)],
    });
    expect(BUTCE_TOPLAM).toBe(2400);
    expect(t.length).toBeLessThanOrEqual(2400);
    expect(t.startsWith("Öğrenci: Nisa")).toBe(true);
  });

  it("bütçeye sığmayan alan atlanır ama sonraki küçük alan yine yazılır; kimlik satırları kesilmez", () => {
    const t = renderStudentBlock({
      ...temel,
      diagnosis: "t".repeat(300), // kimlik: kesilmez, bütçeyi erken doldurur
      notes: "n".repeat(400),
      aiProfile: `### Öncelikli Çalışma Alanları\n${"- madde ".repeat(120)}`,
      recentCards: Array.from({ length: 5 }, (_, i) => ({ title: "k".repeat(80), toolType: "WEEKLY_PLAN", createdAt: new Date(2026, 8, i + 1) })),
      lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: "o".repeat(300), nextSessionPlan: "p".repeat(300) },
      completedGoalCodes: ["1.1", "1.2"],
      inProgressGoalTitles: [],
    });
    expect(t.length).toBeLessThanOrEqual(2400);
    expect(t).toContain(`Tanı: ${"t".repeat(300)}`);
    expect(t).not.toContain("Son oturum"); // 426 karakter sığmadı → atlandı
    expect(t).toContain("Tamamlanan hedefler: 1.1, 1.2"); // sıradaki küçük alan sığdı
  });

  it("alias satırı dışında gerçek ad hiçbir alanda kalmaz (scrub)", () => {
    const t = renderStudentBlock(
      {
        ...temel,
        diagnosis: "Ela Şahin: OSB",
        notes: "Ela Şahin dinozorları sever.",
        aiProfile: "### Öncelikli Çalışma Alanları\nEla'nın istek cümleleri.\n### Dikkat Edilmesi Gereken Noktalar\nEla Şahin kaygılı.",
        recentCards: [{ title: "Ela için sosyal hikâye", toolType: "SOCIAL_STORY", createdAt: new Date(2026, 8, 1) }],
        lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: "Ela iyi.", nextSessionPlan: "Elanın sırası" },
        inProgressGoalTitles: ["Ela ile sıra alma"],
      },
      map,
    );
    expect(t).not.toMatch(/Ela/);
    expect(t).toContain("Nisa");
  });

  it("çok satırlı serbest metin tek satıra iner", () => {
    const t = renderStudentBlock({ ...temel, notes: "ilk\n\nikinci  \t üçüncü" });
    expect(t).toContain("Uzman notları: ilk ikinci üçüncü");
  });
});

describe("profilBolumleriniAyikla", () => {
  it("başlıklar sabit sözleşmedir", () => {
    expect(PROFIL_BOLUMLERI).toEqual(["Öncelikli Çalışma Alanları", "Dikkat Edilmesi Gereken Noktalar"]);
  });
  it("başlık yoksa boş döner; madde işaretleri '; ' ile birleşir", () => {
    expect(profilBolumleriniAyikla("serbest metin")).toEqual({ oncelik: "", dikkat: "" });
    expect(profilBolumleriniAyikla("### Öncelikli Çalışma Alanları\n- a\n- b\n### Dikkat Edilmesi Gereken Noktalar\nc")).toEqual({ oncelik: "a; b", dikkat: "c" });
  });
  it("başlık düzeyi (##/###), numaralı madde ve '---' ayracı tanınır", () => {
    expect(
      profilBolumleriniAyikla("## Öncelikli Çalışma Alanları\n1. a\n2) b\n\n---\n\nserbest\n## Dikkat Edilmesi Gereken Noktalar\n* c\n# Başka"),
    ).toEqual({ oncelik: "a; b", dikkat: "c" });
  });
});

describe("loadStudentContext", () => {
  const prisma = {
    student: { findFirst: vi.fn() },
    card: { findMany: vi.fn(), findFirst: vi.fn() },
    curriculum: { findMany: vi.fn() },
    studentProgress: { findMany: vi.fn() },
  };
  const ogrenci = { id: "s1", name: "Ela Şahin", birthDate: new Date(2020, 4, 14), workArea: "language", diagnosis: "OSB", notes: "Ela trenleri sever", aiProfile: null, curriculumIds: ["c1"] };

  it("gerçek PrismaClient yükleyicinin istemci tipine uyar (sonraki görevler onu geçecek)", () => {
    const istemci = null as unknown as PrismaClient;
    const kabul: Parameters<typeof loadStudentContext>[0] = istemci;
    expect(kabul).toBeNull();
  });

  it("sorguları uzmanla kapsamlar, bloğu rumuzlu döndürür", async () => {
    prisma.student.findFirst.mockResolvedValue(ogrenci);
    prisma.card.findMany.mockResolvedValue([{ title: "Ela treni", toolType: "SOCIAL_STORY", createdAt: new Date(2026, 8, 1) }]);
    prisma.card.findFirst.mockResolvedValue(null);
    prisma.curriculum.findMany.mockResolvedValue([{ title: "Pragmatik Dil" }]);
    prisma.studentProgress.findMany.mockResolvedValue([{ status: "completed", goal: { code: "2.1", title: "İstek" } }, { status: "in_progress", goal: { code: "2.2", title: "Sıra alma" } }]);
    const blok = await loadStudentContext(prisma as never, { studentId: "s1", therapistId: "t1", nameMap: map, now: new Date(2026, 9, 12) });
    expect(prisma.student.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "s1", therapistId: "t1" } }));
    expect(prisma.card.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: "s1", therapistId: "t1" }, take: 5 }));
    expect(prisma.card.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: "s1", therapistId: "t1", toolType: "SESSION_SUMMARY" } }));
    expect(prisma.studentProgress.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ studentId: "s1", therapistId: "t1" }) }));
    expect(prisma.curriculum.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["c1"] } } }));
    expect(blok).toContain("Öğrenci: Nisa, 6 yaş");
    expect(blok).toContain("Modüller: Pragmatik Dil");
    expect(blok).toContain("Nisa treni");
    expect(blok).toContain("Tamamlanan hedefler: 2.1");
    expect(blok).toContain("Sürmekte olan hedefler: Sıra alma");
    expect(blok).not.toMatch(/Ela/);
  });

  it("son oturum kartından üretimde kaydedilen anahtarlar okunur; eski/yanlış anahtarlar satır üretmez", async () => {
    prisma.student.findFirst.mockResolvedValue(ogrenci);
    prisma.card.findMany.mockResolvedValue([]);
    prisma.studentProgress.findMany.mockResolvedValue([]);
    prisma.card.findFirst.mockResolvedValue({ createdAt: new Date(2026, 9, 1), content: { overallAssessment: "Ela hedefe yakın.", nextSessionPlan: "Üçlü istek", overallPerformance: "on_target" } });
    const blok = await loadStudentContext(prisma as never, { studentId: "s1", therapistId: "t1", nameMap: map });
    expect(blok).toContain("Son oturum (01.10.2026): Nisa hedefe yakın. Sonraki plan: Üçlü istek");
    expect(blok).not.toContain("on_target");

    prisma.card.findFirst.mockResolvedValue({ createdAt: new Date(2026, 9, 1), content: { overallPerformance: "on_target", sessionNotes: "x", nextSessionGoals: "y" } });
    expect(await loadStudentContext(prisma as never, { studentId: "s1", therapistId: "t1", nameMap: map })).not.toContain("Son oturum");
  });

  it("exclude: ['aiProfile'] profili bloğa almaz; müfredat yoksa müfredat sorgusu yapılmaz", async () => {
    prisma.student.findFirst.mockResolvedValue({ ...ogrenci, aiProfile: "### Öncelikli Çalışma Alanları\n- İstek cümleleri", curriculumIds: [] });
    prisma.card.findMany.mockResolvedValue([]);
    prisma.card.findFirst.mockResolvedValue(null);
    prisma.studentProgress.findMany.mockResolvedValue([]);
    prisma.curriculum.findMany.mockClear();
    const tam = await loadStudentContext(prisma as never, { studentId: "s1", therapistId: "t1", nameMap: map });
    expect(tam).toContain("Öncelikli çalışma alanları: İstek cümleleri");
    const dar = await loadStudentContext(prisma as never, { studentId: "s1", therapistId: "t1", nameMap: map, exclude: ["aiProfile"] });
    expect(dar).not.toContain("Öncelikli çalışma alanları");
    expect(dar).toContain("Uzman notları: Nisa trenleri sever");
    expect(prisma.curriculum.findMany).not.toHaveBeenCalled();
    expect(dar).not.toContain("Modüller:");
  });

  it("sorgu patlarsa boş string döner ve console.warn çağrılır (üretim sürer)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    prisma.student.findFirst.mockRejectedValue(new Error("db"));
    const blok = await loadStudentContext(prisma as never, { studentId: "s1", therapistId: "t1", nameMap: map });
    expect(blok).toBe("");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[studentContext]"), expect.anything());
    warn.mockRestore();
  });

  it("öğrenci bulunamazsa boş string", async () => {
    prisma.student.findFirst.mockResolvedValue(null);
    expect(await loadStudentContext(prisma as never, { studentId: "yok", therapistId: "t1", nameMap: map })).toBe("");
  });
});
